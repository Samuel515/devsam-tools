// Background removal off the main thread, with two permissively licensed models:
//  - BiRefNet Lite (MIT, ~115 MB): best edges, needs a capable GPU (WebGPU) because it runs at 1024 px.
//  - U-2-Net (Apache-2.0, ~176 MB): runs on any CPU at 320 px. Softer edges, works everywhere.
// Models download once from Hugging Face and are cached by the browser.
import { AutoModel, AutoProcessor, env, RawImage, Tensor, type PreTrainedModel, type Processor } from "@huggingface/transformers";

const BIREFNET = "onnx-community/BiRefNet_lite-ONNX";
const U2NET = "BritishWerewolf/U-2-Net";
const U2_SIDE = 320;

env.allowLocalModels = false;
env.useBrowserCache = true;

export type Device = "webgpu" | "wasm";

export type In =
  | { type: "load"; device?: Device }
  | { type: "run"; id: number; image: Blob; device?: Device };

export type Out =
  | { type: "progress"; loaded: number; total: number }
  | { type: "ready"; device: Device }
  | { type: "result"; id: number; mask: Uint8Array; width: number; height: number; ms: number }
  | { type: "error"; id?: number; message: string; gpuFailed?: boolean };

let model: PreTrainedModel | null = null;
let processor: Processor | null = null;
let loading: Promise<void> | null = null;
let device: Device = "wasm";

const post = (m: Out, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer);

/** BiRefNet needs more storage buffers per shader than many integrated GPUs allow. */
async function gpuIsCapable() {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<{ limits: Record<string, number> } | null> } }).gpu;
    const adapter = gpu ? await gpu.requestAdapter() : null;
    return !!adapter && (adapter.limits.maxStorageBuffersPerShaderStage ?? 0) >= 32;
  } catch {
    return false;
  }
}

function load(requested?: Device) {
  if (loading) return loading;
  loading = (async () => {
    const files = new Map<string, { loaded: number; total: number }>();
    const progress_callback = (p: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (p.status === "progress" && p.file && p.total) {
        files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
        let loaded = 0;
        let total = 0;
        files.forEach((f) => {
          loaded += f.loaded;
          total += f.total;
        });
        post({ type: "progress", loaded, total });
      }
    };
    device = requested ?? ((await gpuIsCapable()) ? "webgpu" : "wasm");
    if (device === "webgpu") {
      try {
        model = await AutoModel.from_pretrained(BIREFNET, { dtype: "fp16", device: "webgpu", progress_callback });
        processor = await AutoProcessor.from_pretrained(BIREFNET, {});
      } catch {
        throw Object.assign(new Error("gpu"), { gpuFailed: true });
      }
    } else {
      model = await AutoModel.from_pretrained(U2NET, { dtype: "fp32", device: "wasm", progress_callback });
      processor = null;
    }
    post({ type: "ready", device });
  })();
  loading.catch(() => (loading = null));
  return loading;
}

/** U-2-Net: resize to 320x320, ImageNet-normalise, run, min-max normalise the output. */
async function runU2Net(image: RawImage): Promise<Uint8Array> {
  const rgb = await image.rgb().resize(U2_SIDE, U2_SIDE);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  const n = U2_SIDE * U2_SIDE;
  const input = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) input[c * n + i] = (rgb.data[i * 3 + c]! / 255 - mean[c]!) / std[c]!;
  }
  const out = (await model!({ "input.1": new Tensor("float32", input, [1, 3, U2_SIDE, U2_SIDE]) })) as Record<string, Tensor>;
  const pred = (out["1959"] ?? Object.values(out)[0]!).data as Float32Array;
  let min = Infinity;
  let max = -Infinity;
  for (const v of pred) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;
  const small = new Uint8Array(n);
  for (let i = 0; i < n; i++) small[i] = Math.round(((pred[i]! - min) / range) * 255);
  const mask = await new RawImage(small, U2_SIDE, U2_SIDE, 1).resize(image.width, image.height);
  return new Uint8Array(mask.data);
}

async function runBiRefNet(image: RawImage): Promise<Uint8Array> {
  const { pixel_values } = await processor!(image);
  const { output_image } = await model!({ input_image: pixel_values });
  const mask = await RawImage.fromTensor(output_image[0].sigmoid().mul(255).to("uint8")).resize(image.width, image.height);
  return new Uint8Array(mask.data);
}

self.onmessage = async (e: MessageEvent<In>) => {
  const msg = e.data;
  if (msg.type === "load") {
    try {
      await load(msg.device);
    } catch (err) {
      const gpuFailed = !!(err as { gpuFailed?: boolean }).gpuFailed;
      post({ type: "error", message: gpuFailed ? "gpu" : "The AI model couldn't be downloaded.", gpuFailed });
    }
    return;
  }
  try {
    await load(msg.device);
    const t0 = performance.now();
    const image = await RawImage.fromBlob(msg.image);
    const data = device === "webgpu" ? await runBiRefNet(image) : await runU2Net(image);
    post({ type: "result", id: msg.id, mask: data, width: image.width, height: image.height, ms: Math.round(performance.now() - t0) }, [data.buffer]);
  } catch (err) {
    console.error(err);
    if (device === "webgpu" || (err as { gpuFailed?: boolean }).gpuFailed) {
      // GPU drivers sometimes fail at run time. The page retries in a fresh CPU-only worker.
      post({ type: "error", id: msg.id, message: "gpu", gpuFailed: true });
    } else {
      post({ type: "error", id: msg.id, message: "This image couldn't be processed on this device. Try a smaller image, or a recent version of Chrome or Edge." });
    }
  }
};
