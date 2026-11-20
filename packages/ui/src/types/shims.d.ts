// Type declarations for libraries that don't ship their own.

declare module "gifenc" {
  export type Palette = number[][];
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { format?: "rgb565" | "rgb444" | "rgba4444"; oneBitAlpha?: boolean | number; clearAlpha?: boolean; clearAlphaThreshold?: number; clearAlphaColor?: number },
  ): Palette;
  export function applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: Palette, format?: "rgb565" | "rgb444" | "rgba4444"): Uint8Array;
  export function GIFEncoder(): {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: { palette?: Palette; transparent?: boolean; transparentIndex?: number; delay?: number; repeat?: number },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  };
}

declare module "utif" {
  export type IFD = { width: number; height: number; [key: string]: unknown };
  export function decode(buffer: ArrayBuffer): IFD[];
  export function decodeImage(buffer: ArrayBuffer, ifd: IFD): void;
  export function toRGBA8(ifd: IFD): Uint8Array;
}

declare module "upng-js" {
  export function encode(frames: ArrayBuffer[], width: number, height: number, colors: number, delays?: number[]): ArrayBuffer;
  export function decode(buffer: ArrayBuffer): { width: number; height: number };
  export function toRGBA8(img: unknown): ArrayBuffer[];
}
