// Registry of every tool in the family. Header menus, footers and
// "other tools" sections are generated from this list.

export type ToolSlug = "md" | "image" | "pdf2img" | "compress" | "pdf" | "qr" | "dev";

export type Tool = {
  slug: ToolSlug;
  name: string;
  /** Short label used in menus. */
  short: string;
  tagline: string;
  /** OKLCH hue of the tool's accent color. */
  hue: number;
  /** Two-letter glyph shown in the tool's icon. */
  glyph: string;
};

export const tools: Tool[] = [
  {
    slug: "md",
    name: "Markdown Reader",
    short: "Markdown",
    tagline: "Open, read, edit and export Markdown files.",
    hue: 255,
    glyph: "MD",
  },
  {
    slug: "image",
    name: "Image Converter",
    short: "Image converter",
    tagline: "Convert between PNG, JPG, WebP, AVIF, GIF, BMP, ICO and HEIC.",
    hue: 45,
    glyph: "IM",
  },
  {
    slug: "pdf2img",
    name: "PDF to Image",
    short: "PDF to image",
    tagline: "Turn PDF pages into PNG, JPG or WebP images.",
    hue: 25,
    glyph: "P→",
  },
  {
    slug: "compress",
    name: "Image Compressor",
    short: "Compressor",
    tagline: "Shrink and resize images in bulk without visible quality loss.",
    hue: 185,
    glyph: "CP",
  },
  {
    slug: "pdf",
    name: "PDF Toolkit",
    short: "PDF toolkit",
    tagline: "Merge, split, rotate, reorder and create PDFs.",
    hue: 350,
    glyph: "PDF",
  },
  {
    slug: "qr",
    name: "QR Code Generator",
    short: "QR codes",
    tagline: "Make QR codes for links, Wi-Fi, contacts and more.",
    hue: 295,
    glyph: "QR",
  },
  {
    slug: "dev",
    name: "Dev Formatter",
    short: "Dev formatter",
    tagline: "Format JSON, encode Base64 and URLs, and decode JWTs.",
    hue: 85,
    glyph: "{}",
  },
];

export const toolUrl = (slug: ToolSlug) => `https://${slug}.devsamc.xyz`;

export const getTool = (slug: ToolSlug): Tool => {
  const t = tools.find((x) => x.slug === slug);
  if (!t) throw new Error(`Unknown tool: ${slug}`);
  return t;
};
