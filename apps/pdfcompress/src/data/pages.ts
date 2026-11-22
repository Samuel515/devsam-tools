import type { Topic } from "@devsam/ui/components/TopicSection.astro";

type QA = { q: string; a: string };

export type PdfPage = {
  slug: string;
  label: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  targetKB: number;
  topic: Topic;
  faqs: QA[];
};

function sizePage(kb: number, uses: string, pages: string, extra: QA): PdfPage {
  const nice = kb >= 1000 ? `${kb / 1000} MB` : `${kb} KB`;
  const slug = `compress-pdf-to-${kb >= 1000 ? `${kb / 1000}mb` : `${kb}kb`}`;
  return {
    slug,
    label: `PDF under ${nice}`,
    h1: `Compress a PDF to ${nice}`,
    title: `Compress PDF to ${nice} Online — Free, No Upload | devsam`,
    description: `Reduce a PDF to under ${nice} for ${uses}. Free, private, and nothing is uploaded.`,
    intro: `Drop a PDF and get the clearest version that fits under ${nice}, ready for ${uses}.`,
    targetKB: kb,
    topic: {
      heading: `How to get a PDF under ${nice}`,
      paragraphs: [
        `Upload portals for ${uses} often reject PDFs over ${nice}. Scanned documents and photos of documents are the usual culprits, because every page is a large image.`,
        `This tool first tries a light rewrite that keeps text selectable. If that isn't enough, it re-creates each page as a compressed image, starting with sharp settings and stepping down resolution and quality until the file fits. You get the most readable version that's under ${nice}.`,
      ],
      list: [
        { title: "How many pages fit?", body: pages },
        { title: "Text-only PDFs:", body: "often fit after the light rewrite, so text stays searchable." },
        { title: "Still too big?", body: `split the PDF into parts with the <a href="https://pdf.devsamc.xyz/split-pdf/">PDF Toolkit</a>, then compress each part under ${nice}.` },
      ],
    },
    faqs: [
      {
        q: `How do I compress a PDF to under ${nice}?`,
        a: `Drop your PDF onto the tool above. Under ${nice} is already selected, so click Fit under ${nice}. The tool finds the clearest version that fits, then you download it.`,
      },
      {
        q: `Will my PDF still be readable at ${nice}?`,
        a: "The tool always tries the sharpest settings first and only steps down as far as it must. Typed text and printed forms stay readable at every step it uses.",
      },
      extra,
    ],
  };
}

export const pages: PdfPage[] = [
  sizePage(100, "job applications, exam registration and government forms", "Roughly 1–3 scanned pages fit under 100 KB in black and white. Longer documents usually need splitting.", {
    q: "Why does my PDF turn black and white?",
    a: "Very small limits like 100 KB sometimes need greyscale to keep text sharp. Colour is used whenever the file can fit without it.",
  }),
  sizePage(200, "online applications, school portals and visa forms", "About 2–5 scanned pages usually fit under 200 KB.", {
    q: "Can I compress a scanned certificate to 200 KB?",
    a: "Yes. A single scanned certificate or ID usually fits under 200 KB in colour, and the text stays clear.",
  }),
  sizePage(500, "email, recruitment portals and document uploads", "Around 5–15 scanned pages usually fit under 500 KB.", {
    q: "How do I send a large PDF by email?",
    a: "Compress it under 500 KB or 1 MB here, then attach it. Most email services accept up to 20–25 MB, but smaller files send faster and fit inbox limits.",
  }),
  sizePage(1000, "email attachments and upload forms with a 1 MB limit", "Usually 10–30 scanned pages fit under 1 MB.", {
    q: "What's the difference between 1 MB and 1000 KB?",
    a: "They're treated as the same here: 1,000,000 bytes, the stricter reading, so the file is accepted by forms that count either way.",
  }),
  {
    slug: "compress-scanned-pdf",
    label: "Scanned PDFs",
    h1: "Compress a scanned PDF",
    title: "Compress Scanned PDF — Shrink Scans & Photos of Documents | devsam",
    description: "Make scanned PDFs and phone photos of documents up to 90% smaller while keeping text readable. Free, private, nothing is uploaded.",
    intro: "Scanners and phone scanning apps save huge images. Shrink them to a sensible size while keeping every word readable.",
    targetKB: 0,
    topic: {
      heading: "Why scanned PDFs are so large",
      paragraphs: [
        "A scanned page isn't text: it's a photo of the page. Scanners often save at 300–600 DPI in full colour, so a single page can be several megabytes.",
        "For reading on screen and uploading, 150 DPI is plenty, and black and white is often clearer than colour for typed documents. Recommended compression re-renders each page at 150 DPI, and ticking Black and white shrinks it further.",
      ],
      list: [
        { title: "Contracts and letters:", body: "Recommended plus Black and white usually gives the smallest, sharpest result." },
        { title: "Photos and colour forms:", body: "keep colour and use Recommended." },
        { title: "Strict upload limits:", body: "choose a Target size and the right settings are picked for you." },
      ],
    },
    faqs: [
      { q: "Will text in my scan become blurry?", a: "Not at Recommended, which keeps 150 DPI, enough for comfortable reading and printing at normal sizes. Smallest uses 96 DPI, best for on-screen reading only." },
      { q: "Can I make a scanned PDF searchable?", a: "Not with this tool: it shrinks scans but doesn't add text recognition (OCR)." },
    ],
  },
];

export const generalTopic: Topic = {
  heading: "Choosing the right PDF compression",
  paragraphs: [
    "How much a PDF can shrink depends on what's inside it. Text and vector graphics are already compact; scans and photos are where the big savings are.",
  ],
  list: [
    { title: "For an upload limit:", body: "choose Target size, for example Under 500 KB, and the gentlest setting that fits is used." },
    { title: "For text documents:", body: "Light keeps text selectable and searchable." },
    { title: "For scans and photos:", body: "Recommended usually saves 70–90% while keeping text sharp." },
    { title: "For the tiniest file:", body: "Smallest with Black and white, ideal for reading on screen." },
  ],
};
