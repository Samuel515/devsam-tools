import type { Mode } from "../components/PdfToolkit";

type Step = { title: string; body: string };
type QA = { q: string; a: string };

export type ToolkitPage = {
  slug: string; // "" for the home page
  mode: Mode;
  title: string;
  description: string;
  h1: string;
  intro: string;
  howTo: string;
  steps: Step[];
  faqs: QA[];
};

const privacyFaq: QA = {
  q: "Are my PDFs uploaded to a server?",
  a: "No. Everything happens in your browser using pdf-lib and pdf.js. Your files never leave your device, which makes it safe for contracts, invoices and other private documents.",
};

export const pages: ToolkitPage[] = [
  {
    slug: "",
    mode: "merge",
    title: "Merge PDF — Combine PDF Files Online Free, No Upload | devsam",
    description: "Combine multiple PDFs into one file in seconds. Drag to reorder, then download. Free, private and nothing is uploaded.",
    h1: "Merge PDF files",
    intro: "Combine PDFs into a single document in the order you want. Fast, free and completely private.",
    howTo: "How to merge PDF files",
    steps: [
      { title: "Add your PDFs", body: "Drop two or more PDF files onto the box, or browse for them." },
      { title: "Put them in order", body: "Drag files up or down, or use the arrows. The first file's pages come first." },
      { title: "Merge and download", body: "Click Merge. Your combined PDF downloads straight away." },
    ],
    faqs: [
      privacyFaq,
      { q: "Is there a limit on how many PDFs I can merge?", a: "There's no fixed limit. Merging dozens of files or hundreds of pages works fine on most computers; very large files may be slower on phones." },
      { q: "Will merging reduce quality?", a: "No. Pages are copied exactly as they are, including text, images, links and fonts. Nothing is re-compressed." },
      { q: "Can I merge password-protected PDFs?", a: "Not directly. Remove the password first, for example by printing the PDF to a new PDF with the password entered, then merge it." },
      { q: "Can I reorder pages after merging?", a: "Yes. Open the merged file in Rotate & reorder to move, rotate or delete individual pages." },
    ],
  },
  {
    slug: "split-pdf",
    mode: "split",
    title: "Split PDF — Extract Pages or Split PDF Online Free | devsam",
    description: "Extract pages from a PDF or split it into several files by page ranges. Visual page picker, free, and nothing is uploaded.",
    h1: "Split a PDF",
    intro: "Pull out the pages you need, split every page into its own file, or cut the document into ranges.",
    howTo: "How to split a PDF",
    steps: [
      { title: "Drop your PDF", body: "Every page appears as a thumbnail so you can see what you're picking." },
      { title: "Choose how to split", body: "Pick pages to extract into one PDF, split every page, or type ranges like 1-3, 4-10." },
      { title: "Download", body: "One file downloads as a PDF. Several files download together as a ZIP." },
    ],
    faqs: [
      privacyFaq,
      { q: "How do I extract a single page from a PDF?", a: "Choose Pick pages, click the page you want, then click Extract 1 page. You get a new PDF containing only that page." },
      { q: "How do page ranges work?", a: "Separate ranges with commas. Each range becomes its own file. For example 1-3, 4-6, 7- makes three files, and 7- means page 7 to the end." },
      { q: "Does splitting change the original file?", a: "No. Your original PDF is never changed. New files are created and downloaded." },
      { q: "Do links and text stay selectable?", a: "Yes. Pages are copied without being converted to images, so text stays searchable and selectable." },
    ],
  },
  {
    slug: "organize-pdf",
    mode: "organize",
    title: "Reorder, Rotate & Delete PDF Pages Online Free | devsam",
    description: "Rearrange PDF pages by dragging, rotate them, or delete pages you don't need, then save. Free, private, no uploads.",
    h1: "Rotate, reorder and delete PDF pages",
    intro: "See every page, drag them into a new order, fix sideways scans and remove the pages you don't need.",
    howTo: "How to rearrange PDF pages",
    steps: [
      { title: "Drop your PDF", body: "Each page appears as a thumbnail." },
      { title: "Edit the pages", body: "Drag pages to reorder. Hover a page to rotate it or delete it, or rotate them all at once." },
      { title: "Save", body: "Click Save PDF to download the edited document." },
    ],
    faqs: [
      privacyFaq,
      { q: "How do I delete pages from a PDF?", a: "Hover over a page and click the bin icon. On a phone, the buttons are always visible above each page. Then click Save PDF." },
      { q: "Is the rotation permanent?", a: "Yes. Saved rotation is stored in the PDF, so the pages open the right way up in every PDF reader." },
      { q: "Can I undo changes?", a: "Click Reset to return to the original order and rotation before you save. Your original file is never changed." },
    ],
  },
  {
    slug: "rotate-pdf",
    mode: "organize",
    title: "Rotate PDF — Rotate PDF Pages Permanently Online Free | devsam",
    description: "Rotate one page or a whole PDF by 90° or 180° and save it permanently. Free, private and runs in your browser.",
    h1: "Rotate PDF pages",
    intro: "Turn sideways or upside-down pages the right way up, one at a time or all together, and save the result permanently.",
    howTo: "How to rotate a PDF",
    steps: [
      { title: "Drop your PDF", body: "Every page appears as a thumbnail." },
      { title: "Rotate", body: "Use Rotate all, or hover a single page and click rotate left or right." },
      { title: "Save", body: "Click Save PDF. The new rotation is stored in the file." },
    ],
    faqs: [
      privacyFaq,
      { q: "How do I rotate only one page?", a: "Hover over that page and click one of the rotate buttons. Other pages stay as they are." },
      { q: "Will rotating reduce quality?", a: "No. Rotation is stored as a page setting, so text and images are untouched." },
    ],
  },
  {
    slug: "images-to-pdf",
    mode: "images",
    title: "Images to PDF — Convert JPG, PNG, HEIC to PDF Free | devsam",
    description: "Turn photos and scans into a single PDF, one image per page. Choose A4, Letter or fit-to-image. Free, private, no uploads.",
    h1: "Turn images into a PDF",
    intro: "Combine photos, scans and screenshots into one tidy PDF, with each image on its own page.",
    howTo: "How to convert images to PDF",
    steps: [
      { title: "Add your images", body: "Drop JPG, PNG, WebP or iPhone HEIC photos. Add as many as you like." },
      { title: "Arrange and choose a size", body: "Drag images into order, then pick A4, Letter or Fit image, and a margin." },
      { title: "Create the PDF", body: "Click Create PDF and it downloads straight away." },
    ],
    faqs: [
      privacyFaq,
      { q: "Which page size should I choose?", a: "A4 or Letter make a document that prints well. Fit image makes each page exactly the shape of its image, which suits photos and screenshots." },
      { q: "Are sideways phone photos fixed?", a: "Yes. Photos are turned the right way up using the orientation saved by your camera." },
      { q: "Can I convert iPhone HEIC photos to PDF?", a: "Yes. HEIC photos are converted automatically, with no extra steps." },
    ],
  },
  {
    slug: "jpg-to-pdf",
    mode: "images",
    title: "JPG to PDF Converter — Combine JPGs into One PDF Free | devsam",
    description: "Convert JPG images to PDF online. Combine multiple JPGs into a single PDF with A4 or Letter pages. Free and nothing is uploaded.",
    h1: "Convert JPG to PDF",
    intro: "Drop your JPG photos or scans and get one PDF back, ready to email, print or upload to a form.",
    howTo: "How to convert JPG to PDF",
    steps: [
      { title: "Add JPG files", body: "Drop one or more JPG images. PNG and other formats work too." },
      { title: "Order and size", body: "Drag to reorder, then choose A4, Letter or Fit image." },
      { title: "Download", body: "Click Create PDF and your file downloads." },
    ],
    faqs: [
      privacyFaq,
      { q: "Can I combine several JPGs into one PDF?", a: "Yes. Every image you add becomes a page in the same PDF, in the order shown." },
      { q: "Will the PDF be very large?", a: "Images are kept at high quality but large photos are capped at print resolution, so the PDF stays a sensible size." },
    ],
  },
];
