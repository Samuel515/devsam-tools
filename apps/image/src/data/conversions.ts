import type { OutFormat } from "@devsam/ui/lib/image";

export type Conversion = { slug: string; from: string; to: OutFormat; toLabel: string; note: string };

// Landing pages for the most-searched conversions. Each preselects the output format.
export const conversions: Conversion[] = [
  { slug: "heic-to-jpg", from: "HEIC", to: "jpeg", toLabel: "JPG", note: "iPhone photos are saved as HEIC, which many apps and websites can't open. JPG works everywhere." },
  { slug: "heic-to-png", from: "HEIC", to: "png", toLabel: "PNG", note: "Turn iPhone HEIC photos into lossless PNG files that every editor can open." },
  { slug: "webp-to-png", from: "WebP", to: "png", toLabel: "PNG", note: "WebP images saved from websites often won't open in older editors. PNG keeps full quality and transparency." },
  { slug: "webp-to-jpg", from: "WebP", to: "jpeg", toLabel: "JPG", note: "Convert WebP images from the web into JPG for maximum compatibility." },
  { slug: "png-to-jpg", from: "PNG", to: "jpeg", toLabel: "JPG", note: "JPG files are much smaller than PNG for photos. Transparent areas are filled with a colour you choose." },
  { slug: "jpg-to-png", from: "JPG", to: "png", toLabel: "PNG", note: "Convert JPG to lossless PNG, for editing without adding more compression artefacts." },
  { slug: "png-to-webp", from: "PNG", to: "webp", toLabel: "WebP", note: "WebP is usually 25–35% smaller than PNG and keeps transparency, which makes websites load faster." },
  { slug: "jpg-to-webp", from: "JPG", to: "webp", toLabel: "WebP", note: "Shrink JPG photos for the web by converting them to WebP at the same visual quality." },
  { slug: "avif-to-jpg", from: "AVIF", to: "jpeg", toLabel: "JPG", note: "AVIF is efficient but not every app supports it yet. Convert to JPG to open it anywhere." },
  { slug: "avif-to-png", from: "AVIF", to: "png", toLabel: "PNG", note: "Convert AVIF images to PNG to edit them in any program, with transparency kept." },
  { slug: "jpg-to-avif", from: "JPG", to: "avif", toLabel: "AVIF", note: "AVIF can be half the size of JPG at similar quality, ideal for fast websites." },
  { slug: "png-to-ico", from: "PNG", to: "ico", toLabel: "ICO", note: "Make a favicon or Windows icon from a PNG, with multiple sizes packed into one .ico file." },
  { slug: "svg-to-png", from: "SVG", to: "png", toLabel: "PNG", note: "Rasterise SVG vector graphics into crisp PNG images with transparency." },
  { slug: "gif-to-png", from: "GIF", to: "png", toLabel: "PNG", note: "Convert GIF images to PNG for better colour quality. Animated GIFs keep their first frame." },
  { slug: "bmp-to-png", from: "BMP", to: "png", toLabel: "PNG", note: "BMP files are huge and uncompressed. PNG keeps every pixel at a fraction of the size." },
  { slug: "tiff-to-jpg", from: "TIFF", to: "jpeg", toLabel: "JPG", note: "Turn large TIFF scans and photos into small JPG files you can email and share." },
];
