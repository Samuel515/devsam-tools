import type { OutFormat } from "@devsam/ui/lib/image";
import type { Topic } from "@devsam/ui/components/TopicSection.astro";
import { FORMATS, type FormatKey } from "./formats";

export type Conversion = { slug: string; from: string; to: OutFormat; toLabel: string; note: string; fromKey: FormatKey; toKey: FormatKey };

const OUT_KEY: Record<OutFormat, FormatKey> = { jpeg: "jpg", png: "png", webp: "webp", avif: "avif", gif: "gif", bmp: "bmp", ico: "ico" };

function c(fromKey: FormatKey, to: OutFormat, note: string): Conversion {
  const toKey = OUT_KEY[to];
  return { slug: `${fromKey}-to-${toKey}`, from: FORMATS[fromKey].name, to, toLabel: FORMATS[toKey].name, note, fromKey, toKey };
}

// Landing pages for the most-searched conversions. Each preselects the output format.
export const conversions: Conversion[] = [
  c("heic", "jpeg", "iPhone photos are saved as HEIC, which many apps and websites can't open. JPG works everywhere."),
  c("heic", "png", "Turn iPhone HEIC photos into lossless PNG files that every editor can open."),
  c("heic", "webp", "Turn iPhone photos into small WebP files that load fast on websites."),
  c("webp", "png", "WebP images saved from websites often won't open in older editors. PNG keeps full quality and transparency."),
  c("webp", "jpeg", "Convert WebP images from the web into JPG for maximum compatibility."),
  c("webp", "gif", "Turn WebP images into GIFs for apps and platforms that only accept GIF."),
  c("png", "jpeg", "JPG files are much smaller than PNG for photos. Transparent areas are filled with a colour you choose."),
  c("jpg", "png", "Convert JPG to lossless PNG, for editing without adding more compression artefacts."),
  c("png", "webp", "WebP is usually 25–35% smaller than PNG and keeps transparency, which makes websites load faster."),
  c("jpg", "webp", "Shrink JPG photos for the web by converting them to WebP at the same visual quality."),
  c("png", "avif", "AVIF can be dramatically smaller than PNG for photos and keeps transparency."),
  c("avif", "jpeg", "AVIF is efficient but not every app supports it yet. Convert to JPG to open it anywhere."),
  c("avif", "png", "Convert AVIF images to PNG to edit them in any program, with transparency kept."),
  c("avif", "webp", "Convert AVIF to WebP for wider support with similarly small files."),
  c("jpg", "avif", "AVIF can be half the size of JPG at similar quality, ideal for fast websites."),
  c("jfif", "jpeg", "Windows and Chrome sometimes save images as .jfif. Convert them to standard .jpg so every form and app accepts them."),
  c("jfif", "png", "Turn .jfif downloads into PNG files for editing and sharing."),
  c("png", "ico", "Make a favicon or Windows icon from a PNG, with multiple sizes packed into one .ico file."),
  c("jpg", "ico", "Turn a JPG into a multi-size icon for websites and Windows shortcuts."),
  c("ico", "png", "Extract a favicon or Windows icon into a regular PNG you can edit and share."),
  c("svg", "png", "Rasterise SVG vector graphics into crisp PNG images with transparency."),
  c("svg", "jpeg", "Turn SVG logos and graphics into JPG images for documents and social media."),
  c("gif", "png", "Convert GIF images to PNG for better colour quality. Animated GIFs keep their first frame."),
  c("gif", "jpeg", "Turn GIF images into JPG photos. Animated GIFs keep their first frame."),
  c("bmp", "png", "BMP files are huge and uncompressed. PNG keeps every pixel at a fraction of the size."),
  c("bmp", "jpeg", "Shrink huge BMP files into small JPG images you can email and upload."),
  c("tiff", "jpeg", "Turn large TIFF scans and photos into small JPG files you can email and share."),
  c("tiff", "png", "Convert TIFF scans to PNG for lossless images that browsers can display."),
];

// ---------- Unique copy for each conversion page ----------

const yes = (b: boolean) => (b ? "Yes" : "No");

export function topicFor(x: Conversion): Topic {
  const a = FORMATS[x.fromKey];
  const b = FORMATS[x.toKey];
  const quality = !b.lossy
    ? `${b.name} is lossless, so the converted image keeps every pixel of the decoded ${a.name}.`
    : a.lossy
      ? `Both formats are lossy. The converter uses 90% quality by default, which looks the same as the original for almost every photo. You can raise it under Options.`
      : `${b.name} is lossy, so a little invisible detail is traded for a much smaller file. The default 90% quality looks identical to the original for most images.`;
  const transparency = a.alpha && !b.alpha
    ? `${b.name} can't store transparency, so any transparent areas in your ${a.name} are filled with a solid colour. It's white by default, and you can pick another under Options.`
    : a.alpha && b.alpha
      ? `Transparency is kept: both ${a.name} and ${b.name} support transparent backgrounds.`
      : `${a.name} images don't have transparency, so nothing changes there.`;
  const anim = a.animation && !b.animation
    ? ` ${a.name} can be animated, but ${b.name} can't, so animated files keep only their first frame.`
    : "";
  return {
    heading: `About converting ${a.name} to ${b.name}`,
    paragraphs: [
      `${a.what} ${a.support}`,
      `People usually convert ${a.name} to ${b.name} because ${a.pain}, while ${b.name} is useful because ${b.gain}. ${b.what}`,
      `${quality} ${transparency}${anim}`,
    ],
    list: [
      { title: `${a.name}:`, body: `${a.full}. Lossy: ${yes(a.lossy)}. Transparency: ${yes(a.alpha)}. Animation: ${yes(a.animation)}.` },
      { title: `${b.name}:`, body: `${b.full}. Lossy: ${yes(b.lossy)}. Transparency: ${yes(b.alpha)}. Animation: ${yes(b.animation)}.` },
    ],
  };
}

export function faqsFor(x: Conversion): { q: string; a: string }[] {
  const a = FORMATS[x.fromKey];
  const b = FORMATS[x.toKey];
  const faqs = [
    {
      q: `How do I convert ${a.name} to ${b.name}?`,
      a: `Drop your ${a.name} files onto the converter above. ${b.name} is already selected, so they convert straight away. Download each file, or all of them at once as a ZIP.`,
    },
    {
      q: `Will converting ${a.name} to ${b.name} reduce quality?`,
      a: b.lossy
        ? `${b.name} uses lossy compression, set to 90% quality by default, which is visually identical to the original for nearly all images. Raise the quality under Options if you need to.`
        : `No. ${b.name} is lossless, so the converted file keeps every pixel of the original image.`,
    },
    {
      q: `Can I convert many ${a.name} files to ${b.name} at once?`,
      a: `Yes. Drop as many ${a.name} files as you like. They convert one after another in your browser, and Download all saves them as a single ZIP.`,
    },
  ];
  if (a.alpha && !b.alpha) {
    faqs.push({
      q: `What happens to transparency when converting ${a.name} to ${b.name}?`,
      a: `${b.name} doesn't support transparency, so transparent areas are filled with a background colour: white by default, or any colour you choose under Options. Choose PNG or WebP instead if you need to keep transparency.`,
    });
  }
  if (x.fromKey === "heic") {
    faqs.push({ q: "How do I stop my iPhone saving photos as HEIC?", a: "On your iPhone, open Settings, then Camera, then Formats, and choose Most Compatible. New photos will be saved as JPG. Existing HEIC photos still need converting." });
  }
  if (x.fromKey === "jfif") {
    faqs.push({ q: "Why are my downloads saved as .jfif?", a: "Some versions of Windows register .jfif as the default extension for JPEG images, so Chrome and Edge save downloads that way. The image inside is a normal JPEG; converting gives it the standard .jpg extension." });
  }
  if (x.toKey === "ico") {
    faqs.push({ q: "Which icon sizes are included?", a: "16, 32, 48 and 256 pixels by default, which covers browser tabs, bookmarks and Windows. Change the sizes under Options. Square images with simple shapes look best as icons." });
  }
  return faqs;
}
