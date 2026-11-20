import type { Topic } from "@devsam/ui/components/TopicSection.astro";

type QA = { q: string; a: string };

export type CompressPageData = {
  slug: string;
  /** Short name for breadcrumbs and links. */
  label: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  maxSide: number;
  targetKB: number;
  topic: Topic;
  faqs: QA[];
};

function sizePage(kb: number, uses: string, detail: string, extraFaq: QA): CompressPageData {
  const nice = kb >= 1000 ? `${kb / 1000} MB` : `${kb} KB`;
  const slugSize = kb >= 1000 ? `${kb / 1000}mb` : `${kb}kb`;
  return {
    slug: `compress-image-to-${slugSize}`,
    label: `Compress to ${nice}`,
    h1: `Compress an image to ${nice}`,
    title: `Compress Image to ${nice} Online — JPG Under ${nice} Free | devsam`,
    description: `Reduce any photo to under ${nice} for forms, portals and uploads. The best quality that fits is chosen automatically. Free, private, nothing is uploaded.`,
    intro: `Drop a photo and get the best-quality JPG that fits under ${nice}, ready for ${uses}.`,
    maxSide: 0,
    targetKB: kb,
    topic: {
      heading: `How to get a photo under ${nice}`,
      paragraphs: [
        `Many websites only accept images under a size limit, and ${nice} is a common one for ${uses}. Shrinking a photo by hand means guessing quality settings and resizing over and over. This tool does it for you.`,
        `It tries the highest JPG quality first and lowers it step by step, using mozjpeg, until the file fits under ${nice}. Only if even low quality is too big does it reduce the width and height, so you keep as much detail as possible. ${detail}`,
      ],
      list: [
        { title: "Phone photos:", body: `a typical 12-megapixel photo is 2–5 MB, so reaching ${nice} usually means both lower quality and smaller dimensions. Faces and text stay clear.` },
        { title: "Screenshots and scans:", body: "these are converted to JPG so their size can be controlled precisely." },
        { title: "Already small enough?", body: "If a JPG is already under the limit, you get the original back untouched." },
      ],
      outro: `Need an exact shape too, like a passport photo? Crop it first with the <a href="https://resize.devsamc.xyz/passport-photo/">Image Resizer</a>, then compress it here.`,
    },
    faqs: [
      {
        q: `How do I reduce a photo to ${nice}?`,
        a: `Drop the photo onto the tool above. "Under ${nice}" is already selected, so it's compressed automatically to the best quality that fits. Then click Download.`,
      },
      {
        q: `Will my photo still look good at ${nice}?`,
        a: kb <= 50
          ? `At ${nice}, photos are reduced to a modest size, which is ideal for ID photos, profile pictures and form uploads. Fine detail softens, but faces and text stay clear.`
          : `Yes. ${nice} leaves plenty of room for a sharp photo at normal viewing sizes. Most people won't see a difference from the original.`,
      },
      {
        q: "What if it says it couldn't fit the limit?",
        a: "That happens only with extremely detailed or enormous images. Choose a smaller size under Resize, or crop the image first, then try again.",
      },
      extraFaq,
    ],
  };
}

export const pages: CompressPageData[] = [
  {
    slug: "compress-jpg",
    label: "Compress JPG",
    h1: "Compress JPG images",
    title: "Compress JPG Online — Reduce JPEG File Size Free | devsam",
    description: "Reduce JPG and JPEG file sizes by up to 80% with no visible quality loss. Batch compress in your browser: free, private, no uploads.",
    intro: "Shrink JPG photos with mozjpeg, the encoder big sites use, so they look the same but load faster and fit email limits.",
    maxSide: 0,
    targetKB: 0,
    topic: {
      heading: "How JPG compression works",
      paragraphs: [
        "JPG files from phones and cameras are saved quickly, not efficiently. They often use high quality settings and leave out the smarter encoding techniques that make files smaller.",
        "This tool re-encodes your JPGs with mozjpeg, an encoder from Mozilla that's tuned to remove detail your eyes can't see. It uses progressive encoding and better compression tables, so files are typically 50–80% smaller and look the same.",
      ],
      list: [
        { title: "Balanced", body: "suits photos you'll share or post online." },
        { title: "Best quality", body: "for photos you might print or edit later." },
        { title: "Smallest", body: "for thumbnails, previews and slow connections." },
      ],
    },
    faqs: [
      { q: "How much smaller will my JPG get?", a: "Phone photos usually shrink by 60–80% at the Balanced setting. Photos that were already heavily compressed shrink less; if nothing would be saved, you get the original back." },
      { q: "Is JPEG the same as JPG?", a: "Yes. JPG and JPEG are the same format. The three-letter .jpg extension comes from older Windows versions that required three-letter extensions." },
      { q: "Does compressing a JPG again lose quality?", a: "Each re-encode discards a little detail, which is why Balanced keeps the quality high. For important photos, keep your original and share the compressed copy." },
    ],
  },
  {
    slug: "compress-png",
    label: "Compress PNG",
    h1: "Compress PNG images",
    title: "Compress PNG Online — Reduce PNG File Size Free | devsam",
    description: "Make PNG files up to 70% smaller by reducing colours smartly while keeping transparency. Free, private and runs in your browser.",
    intro: "Shrink PNG screenshots, logos and graphics by reducing their colour palette smartly. Transparency is kept.",
    maxSide: 0,
    targetKB: 0,
    topic: {
      heading: "How PNG compression works",
      paragraphs: [
        "PNG is lossless, so the usual way to shrink it is to reduce the number of colours. A screenshot or logo might store thousands of colours that look identical to the eye.",
        "Balanced and Smallest pick the best 256 or 128 colours for your image, similar to TinyPNG, and keep transparency. Best quality keeps every colour and only optimises how the data is stored.",
      ],
      list: [
        { title: "Screenshots and UI:", body: "often shrink by 60–80% with no visible change." },
        { title: "Logos and icons:", body: "shrink a lot because they use few colours." },
        { title: "Photos saved as PNG:", body: "shrink most when converted to JPG or WebP. Pick a format under Format." },
      ],
    },
    faqs: [
      { q: "Will my PNG keep its transparent background?", a: "Yes. Transparency is preserved at every compression level when the output stays PNG." },
      { q: "Why is my PNG photo so large?", a: "PNG stores every pixel exactly, which suits graphics but not photos. Converting a photo to JPG or WebP under Format usually makes it 5–10 times smaller." },
      { q: "Is PNG compression lossless?", a: "Best quality is lossless. Balanced and Smallest reduce the colour palette, which is lossy but rarely visible on screenshots and graphics." },
    ],
  },
  {
    slug: "resize-image",
    label: "Resize images",
    h1: "Resize images",
    title: "Resize Images Online — Change Image Size in Bulk Free | devsam",
    description: "Resize JPG, PNG, WebP and HEIC images to 1920, 1280 or any common size in bulk. Sharp results, free, and nothing is uploaded.",
    intro: "Resize photos to a maximum width or height in one go, then compress them, all in your browser. The aspect ratio is always kept.",
    maxSide: 1920,
    targetKB: 0,
    topic: {
      heading: "Why resize before sharing",
      paragraphs: [
        "Phone cameras take photos around 4000 pixels wide, far more than any screen shows. Resizing to 1920 pixels, Full HD, keeps photos sharp on screens while cutting the file size by around 75%.",
        "Resizing here sets a maximum width or height and keeps the proportions, so nothing is stretched or cropped. For exact shapes, like Instagram squares or passport photos, use the <a href=\"https://resize.devsamc.xyz\">Image Resizer</a>.",
      ],
    },
    faqs: [
      { q: "Which size should I pick?", a: "1920 px suits websites and full-screen viewing, 1280 px suits email and messaging, and 800 px or less suits thumbnails and profile images." },
      { q: "Will resizing crop my photo?", a: "No. The longest side is reduced to the size you choose and the other side follows, so the whole photo is kept." },
    ],
  },
  sizePage(20, "exam registration, job portals and government forms", "At 20 KB, most photos end up around 300–500 pixels wide, which is what ID-style uploads expect.", {
    q: "Which forms ask for photos under 20 KB?",
    a: "Many exam registration, recruitment and government portals limit passport photos to 20 KB or less. Always check the portal's current instructions, since limits change.",
  }),
  sizePage(50, "exam registration, scholarship applications and profile uploads", "Some portals also ask for specific pixel dimensions; for example, guides for WAEC GCE registration describe a 275×314 pixel JPG under 50 KB.", {
    q: "Can I resize to 275×314 and compress to 50 KB?",
    a: "Yes. Use the WAEC passport preset in the Image Resizer, which crops to 275×314 and keeps the file under 50 KB, or crop there and compress here. Always confirm the size on the portal's current instructions.",
  }),
  sizePage(100, "online applications, ID uploads and document portals", "At 100 KB, most photos stay sharp at around 1000 pixels wide.", {
    q: "Is 100 KB enough for a clear photo?",
    a: "Yes. 100 KB keeps a photo clear for profile pictures, IDs and web forms. Text in screenshots stays readable too.",
  }),
  sizePage(200, "email signatures, website images and online forms", "At 200 KB, photos usually keep their full detail at web sizes.", {
    q: "Why do websites limit images to 200 KB?",
    a: "Smaller images load faster, especially on mobile data. 200 KB is a common limit for profile, product and blog images.",
  }),
  sizePage(500, "websites, blogs, product listings and email attachments", "At 500 KB, most phone photos keep their full resolution or close to it.", {
    q: "Will a 500 KB photo look good full screen?",
    a: "Yes. 500 KB is enough for a sharp Full HD photo, which looks good full screen on laptops and phones.",
  }),
  sizePage(1000, "email attachments, job applications and upload forms with a 1 MB limit", "At 1 MB, photos usually keep their full resolution with only invisible quality changes.", {
    q: "How do I make a photo under 1 MB for email?",
    a: "Drop it onto the tool above with Under 1 MB selected. Most phone photos fit with no visible change, then you can attach the download to your email.",
  }),
];

export const generalTopic: Topic = {
  heading: "Getting the smallest file without losing quality",
  paragraphs: [
    "Most photos carry far more data than anyone can see. Compression removes the invisible parts, and the right settings depend on where the image is going.",
  ],
  list: [
    { title: "For a size limit:", body: "choose Max file size, for example Under 100 KB, and the best quality that fits is picked automatically." },
    { title: "For sharing and the web:", body: "Balanced compression, plus resizing to 1920 px, keeps photos sharp at a fraction of the size." },
    { title: "For the smallest web images:", body: "choose WebP or AVIF under Format; both beat JPG on size." },
    { title: "For graphics with transparency:", body: "keep PNG; colour reduction shrinks it while keeping transparent areas." },
  ],
};
