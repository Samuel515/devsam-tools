// Background removal for signatures, logos and drawings on paper or a plain backdrop.
// Every pixel close to the local background colour becomes transparent, including areas
// enclosed by strokes (which AI cutout models keep as part of the "object").

type Field = { gw: number; gh: number; block: number; r: Float32Array; g: Float32Array; b: Float32Array };

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/**
 * Local background colour on a coarse grid. Per block, the background is the average of the
 * brightest (or, for dark backdrops, darkest) 25% of pixels, so thin strokes barely affect it.
 */
function backgroundField(d: Uint8ClampedArray, w: number, h: number, darkPaper: boolean): Field {
  const block = Math.max(12, Math.round(Math.max(w, h) / 40));
  const gw = Math.ceil(w / block);
  const gh = Math.ceil(h / block);
  const raw = { r: new Float32Array(gw * gh), g: new Float32Array(gw * gh), b: new Float32Array(gw * gh), l: new Float32Array(gw * gh) };
  const count = new Uint32Array(256);
  const sr = new Float64Array(256), sg = new Float64Array(256), sb = new Float64Array(256);

  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      count.fill(0); sr.fill(0); sg.fill(0); sb.fill(0);
      let n = 0;
      const x1 = Math.min(w, (gx + 1) * block), y1 = Math.min(h, (gy + 1) * block);
      for (let y = gy * block; y < y1; y += 2) {
        for (let x = gx * block; x < x1; x += 2) {
          const i = (y * w + x) * 4;
          const r = d[i]!, g = d[i + 1]!, b = d[i + 2]!;
          const k = Math.round(lum(r, g, b));
          count[k]++; sr[k] += r; sg[k] += g; sb[k] += b; n++;
        }
      }
      const want = Math.max(1, Math.round(n * 0.25));
      let got = 0, tr = 0, tg = 0, tb = 0;
      for (let s = 0; s < 256 && got < want; s++) {
        const k = darkPaper ? s : 255 - s;
        got += count[k]!; tr += sr[k]!; tg += sg[k]!; tb += sb[k]!;
      }
      const c = gy * gw + gx;
      raw.r[c] = tr / got; raw.g[c] = tg / got; raw.b[c] = tb / got;
      raw.l[c] = lum(raw.r[c]!, raw.g[c]!, raw.b[c]!);
    }
  }

  // Robust neighbourhood pick, then a light blur.
  const pick = { r: new Float32Array(gw * gh), g: new Float32Array(gw * gh), b: new Float32Array(gw * gh) };
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const cells: number[] = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = gx + dx, y = gy + dy;
        if (x >= 0 && y >= 0 && x < gw && y < gh) cells.push(y * gw + x);
      }
      // Median of the 3x3 neighbourhood: drops the odd ink-heavy block but still follows shadows.
      cells.sort((a, b) => raw.l[a]! - raw.l[b]!);
      const c = cells[Math.floor((cells.length - 1) / 2)]!;
      const o = gy * gw + gx;
      pick.r[o] = raw.r[c]!; pick.g[o] = raw.g[c]!; pick.b[o] = raw.b[c]!;
    }
  }
  const field: Field = { gw, gh, block, r: new Float32Array(gw * gh), g: new Float32Array(gw * gh), b: new Float32Array(gw * gh) };
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = gx + dx, y = gy + dy;
        if (x < 0 || y < 0 || x >= gw || y >= gh) continue;
        const c = y * gw + x;
        r += pick.r[c]!; g += pick.g[c]!; b += pick.b[c]!; n++;
      }
      const o = gy * gw + gx;
      field.r[o] = r / n; field.g[o] = g / n; field.b[o] = b / n;
    }
  }
  return field;
}

/** Bilinear lookup of the background colour at a pixel. */
function bgAt(f: Field, x: number, y: number, out: number[]) {
  const fx = Math.min(f.gw - 1, Math.max(0, x / f.block - 0.5));
  const fy = Math.min(f.gh - 1, Math.max(0, y / f.block - 0.5));
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const x1 = Math.min(f.gw - 1, x0 + 1), y1 = Math.min(f.gh - 1, y0 + 1);
  const tx = fx - x0, ty = fy - y0;
  const a = y0 * f.gw + x0, b = y0 * f.gw + x1, c = y1 * f.gw + x0, e = y1 * f.gw + x1;
  for (const [k, ch] of [[0, f.r], [1, f.g], [2, f.b]] as const) {
    out[k] = (ch[a]! * (1 - tx) + ch[b]! * tx) * (1 - ty) + (ch[c]! * (1 - tx) + ch[e]! * tx) * ty;
  }
}

function borderIsDark(d: Uint8ClampedArray, w: number, h: number) {
  const ls: number[] = [];
  const step = Math.max(1, Math.round((w + h) / 400));
  for (let x = 0; x < w; x += step) for (const y of [0, h - 1]) { const i = (y * w + x) * 4; ls.push(lum(d[i]!, d[i + 1]!, d[i + 2]!)); }
  for (let y = 0; y < h; y += step) for (const x of [0, w - 1]) { const i = (y * w + x) * 4; ls.push(lum(d[i]!, d[i + 1]!, d[i + 2]!)); }
  ls.sort((a, b) => a - b);
  return ls[Math.floor(ls.length / 2)]! < 100;
}

/** Distance of each pixel from the local background, plus summary statistics. */
function analyse(img: ImageData) {
  const { data: d, width: w, height: h } = img;
  const dark = borderIsDark(d, w, h);
  const field = backgroundField(d, w, h, dark);
  const dist = new Float32Array(w * h);
  const bg = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      bgAt(field, x, y, bg);
      const i = (y * w + x) * 4;
      // One-sided: on light paper only darker pixels can be ink (and the reverse on dark backdrops),
      // so paper that is brighter than the estimate never turns into a grey halo.
      const s = dark ? -1 : 1;
      const dr = Math.max(0, s * (bg[0]! - d[i]!)), dg = Math.max(0, s * (bg[1]! - d[i + 1]!)), db = Math.max(0, s * (bg[2]! - d[i + 2]!));
      dist[y * w + x] = Math.sqrt((dr * dr + dg * dg + db * db) / 3);
    }
  }
  const sample: number[] = [];
  const step = Math.max(1, Math.floor(dist.length / 40_000));
  for (let i = 0; i < dist.length; i += step) sample.push(dist[i]!);
  sample.sort((a, b) => a - b);
  const q = (p: number) => sample[Math.min(sample.length - 1, Math.floor(p * sample.length))]!;
  return { field, dist, noise: q(0.5), contrast: q(0.995), q };
}

/**
 * Removes the background around and inside strokes.
 * `strength` 0..1: higher removes more faint marks and paper texture.
 */
export function removePaper(src: HTMLCanvasElement, strength = 0.6): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const img = src.getContext("2d")!.getImageData(0, 0, w, h);
  const { field, dist, noise, contrast } = analyse(img);
  const span = Math.max(24, contrast - noise);
  const t0 = noise * 1.5 + span * (0.04 + 0.2 * strength);
  const t1 = t0 + span * 0.35;

  const alpha = new Float32Array(w * h);
  for (let p = 0; p < alpha.length; p++) {
    const a = (dist[p]! - t0) / (t1 - t0);
    alpha[p] = a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a);
  }
  removeSpecks(alpha, w, h, Math.max(6, Math.round(w * h * 0.00003 * (0.5 + 2.5 * strength))));

  const d = img.data;
  const bg = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const i = p * 4;
      const a = alpha[p]!;
      if (a > 0 && a < 1) {
        // Un-mix the background from soft edges so they keep the true ink colour.
        bgAt(field, x, y, bg);
        const k = 1 / Math.max(a, 0.35);
        for (let c = 0; c < 3; c++) d[i + c] = Math.max(0, Math.min(255, bg[c]! + (d[i + c]! - bg[c]!) * k));
      }
      d[i + 3] = Math.round(a * d[i + 3]!);
    }
  }
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d")!.putImageData(img, 0, 0);
  return out;
}

/**
 * Drops small isolated blobs (paper texture, dust, shadow speckle). Strokes are long connected
 * shapes, so they survive; faint edge pixels are kept only next to a kept stroke.
 */
function removeSpecks(alpha: Float32Array, w: number, h: number, minArea: number) {
  const STRONG = 0.3;
  const label = new Int32Array(w * h).fill(-1);
  const keep: boolean[] = [];
  const stack = new Int32Array(w * h);
  for (let start = 0; start < alpha.length; start++) {
    if (alpha[start]! < STRONG || label[start] !== -1) continue;
    const id = keep.length;
    let top = 0, size = 0;
    stack[top++] = start;
    label[start] = id;
    while (top) {
      const p = stack[--top]!;
      size++;
      const x = p % w, y = (p - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const q = ny * w + nx;
          if (label[q] === -1 && alpha[q]! >= STRONG) {
            label[q] = id;
            stack[top++] = q;
          }
        }
      }
    }
    keep.push(size >= minArea);
  }
  for (let p = 0; p < alpha.length; p++) {
    if (alpha[p] === 0) continue;
    if (label[p] !== -1) {
      if (!keep[label[p]!]) alpha[p] = 0;
      continue;
    }
    // Faint pixel: keep it only if it touches a kept stroke.
    const x = p % w, y = (p - x) / w;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const l = label[ny * w + nx]!;
        if (l !== -1 && keep[l]) { near = true; break; }
      }
    }
    if (!near) alpha[p] = 0;
  }
}

/** True when an image looks like marks on a plain background (signature, logo, sketch, scan). */
export function looksLikeInk(src: HTMLCanvasElement) {
  const s = Math.min(1, 480 / Math.max(src.width, src.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(src.width * s));
  c.height = Math.max(1, Math.round(src.height * s));
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  const { field, noise, contrast, q } = analyse(ctx.getImageData(0, 0, c.width, c.height));
  // Plain, low-saturation background...
  let sat = 0;
  for (let i = 0; i < field.r.length; i++) {
    const r = field.r[i]!, g = field.g[i]!, b = field.b[i]!;
    sat += Math.max(r, g, b) - Math.min(r, g, b);
  }
  sat /= field.r.length;
  // ...covering most of the image, with a few strong marks.
  const t = noise * 1.5 + (contrast - noise) * 0.25;
  const marked = 1 - fractionBelow(q, t);
  return sat < 40 && noise < 14 && contrast - noise > 40 && marked < 0.2;
}

/** Fraction of sampled pixels at or below a distance. */
function fractionBelow(q: (p: number) => number, t: number) {
  let lo = 0, hi = 1;
  for (let k = 0; k < 20; k++) {
    const mid = (lo + hi) / 2;
    if (q(mid) <= t) lo = mid;
    else hi = mid;
  }
  return lo;
}
