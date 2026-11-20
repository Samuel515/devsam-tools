import type { Topic } from "@devsam/ui/components/TopicSection.astro";

export type Variant = {
  slug: string;
  label: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  topic: Topic;
  faqs: { q: string; a: string }[];
};

export const mainTopic: { label: string; topic: Topic } = {
  "label": "Markdown reader",
  "topic": {
    "heading": "What is Markdown?",
    "paragraphs": [
      "Markdown is a simple way to format text with plain characters: # for headings, ** for bold, - for lists. It's used for README files on GitHub, documentation, notes apps, forums and AI chat answers.",
      "Opened in a normal text editor, a .md file shows all those symbols. A Markdown reader turns them into clean formatted text, with real headings, lists, tables and highlighted code."
    ],
    "list": [
      {
        "title": "Headings:",
        "body": "# Title, ## Section, ### Subsection."
      },
      {
        "title": "Emphasis:",
        "body": "**bold**, *italic*, ~~strikethrough~~."
      },
      {
        "title": "Lists and tasks:",
        "body": "- item, 1. item, - [ ] task."
      },
      {
        "title": "Code:",
        "body": "`inline` or fenced blocks with ```."
      }
    ]
  }
};

export const variants: Variant[] = [
  {
    "slug": "markdown-to-pdf",
    "label": "Markdown to PDF",
    "title": "Markdown to PDF Converter — Free, No Upload | devsam",
    "description": "Convert Markdown (.md) files to clean, well-formatted PDFs with headings, tables and code highlighting. Free and private; nothing is uploaded.",
    "h1": "Convert Markdown to PDF",
    "intro": "Open a .md file or paste Markdown, check the formatting, then save it as a clean PDF with Export, Print or save as PDF.",
    "topic": {
      "heading": "Turning Markdown into a PDF",
      "paragraphs": [
        "PDFs are the easiest way to share Markdown with people who don't use it: reports, documentation, notes or a README sent to a client.",
        "Open your file, then choose Export, Print or save as PDF, and pick Save as PDF as the printer. Only the document is printed, with clean typography and syntax-highlighted code, without the website around it."
      ],
      "list": [
        {
          "title": "Page breaks:",
          "body": "headings and code blocks are kept together where possible."
        },
        {
          "title": "Links:",
          "body": "stay clickable in the saved PDF."
        },
        {
          "title": "Paper size:",
          "body": "choose A4 or Letter in the print dialog."
        }
      ]
    },
    "faqs": [
      {
        "q": "How do I convert a .md file to PDF?",
        "a": "Open the file here, click Export, then Print or save as PDF, and choose Save as PDF in the print dialog."
      },
      {
        "q": "Will code blocks keep their highlighting in the PDF?",
        "a": "Yes. Code is printed with syntax colours on a light background, and long lines wrap so nothing is cut off."
      }
    ]
  },
  {
    "slug": "markdown-to-html",
    "label": "Markdown to HTML",
    "title": "Markdown to HTML Converter — Free Online | devsam",
    "description": "Convert Markdown to clean HTML. Copy the HTML or download a standalone .html page with readable styles. Free, private, no upload.",
    "h1": "Convert Markdown to HTML",
    "intro": "Paste Markdown or open a .md file, then copy the HTML or download a complete web page with clean built-in styles.",
    "topic": {
      "heading": "Markdown to HTML, two ways",
      "paragraphs": [
        "Markdown was designed to be converted into HTML. This tool uses marked, a fast and standards-compliant Markdown parser, with GitHub-flavoured extensions such as tables and task lists."
      ],
      "list": [
        {
          "title": "Copy HTML:",
          "body": "the HTML for the content only, ready to paste into a CMS, email builder or template."
        },
        {
          "title": "Download HTML:",
          "body": "a complete standalone page with readable styles that also adapt to dark mode."
        }
      ],
      "outro": "Raw HTML in your Markdown is sanitised for safety, so scripts and event handlers are removed."
    },
    "faqs": [
      {
        "q": "Is the HTML output safe to paste into my site?",
        "a": "Yes. The output is sanitised with DOMPurify, which removes scripts and other unsafe code from any HTML in your Markdown."
      },
      {
        "q": "Are tables and task lists supported?",
        "a": "Yes. GitHub-flavoured Markdown tables, task lists, strikethrough and autolinks all convert to HTML."
      }
    ]
  }
];
