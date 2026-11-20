import type { Mode } from "../components/DevTools";

export type DevPage = {
  slug: string;
  mode: Mode;
  title: string;
  description: string;
  h1: string;
  intro: string;
  howTo: string;
  steps: { title: string; body: string }[];
  faqs: { q: string; a: string }[];
};

const privacy = {
  q: "Is my data sent anywhere?",
  a: "No. Everything runs in your browser, so API responses, tokens and config files never leave your device. It also works offline once the page has loaded.",
};

export const pages: DevPage[] = [
  {
    slug: "",
    mode: "json",
    title: "JSON Formatter & Validator — Beautify and Minify JSON Online | devsam",
    description: "Format, validate and minify JSON instantly. Shows the exact line and column of errors, sorts keys, and runs in your browser.",
    h1: "Format and validate JSON",
    intro: "Paste JSON to pretty-print it, find errors with their exact line and column, sort keys or minify it, all as you type.",
    howTo: "How to format JSON",
    steps: [
      { title: "Paste your JSON", body: "Paste an API response, config file or any JSON into the input box." },
      { title: "See it formatted", body: "The output updates as you type. Errors show the exact line and column so you can fix them fast." },
      { title: "Copy or save", body: "Choose 2 spaces, 4 spaces, tabs or Minify, then copy the result or save it as a .json file." },
    ],
    faqs: [
      privacy,
      { q: "How do I find an error in my JSON?", a: "Invalid JSON shows a red message with the line and column of the problem. Common causes are trailing commas, single quotes instead of double quotes, and missing commas between items." },
      { q: "What does Minify do?", a: "Minify removes all spaces and line breaks, which makes JSON smaller for sending over a network or storing." },
      { q: "What does Sort keys do?", a: "It orders every object's keys alphabetically, at every level. This makes two JSON files much easier to compare." },
    ],
  },
  {
    slug: "base64",
    mode: "base64",
    title: "Base64 Encode & Decode Online — Text and Files | devsam",
    description: "Encode text or files to Base64 and decode Base64 back to text or files. UTF-8 safe, URL-safe option, data URLs. Free and private.",
    h1: "Base64 encode and decode",
    intro: "Convert text or whole files to Base64, or decode Base64 and data URLs back to text or a downloadable file.",
    howTo: "How to encode or decode Base64",
    steps: [
      { title: "Choose a direction", body: "Pick Encode or Decode. To encode a file, such as an image, click Encode a file." },
      { title: "Paste your input", body: "The result appears as you type. Decoding accepts standard, URL-safe and data: URL Base64." },
      { title: "Copy or download", body: "Copy the result, or download it as a file when it decodes to an image, PDF or other binary data." },
    ],
    faqs: [
      privacy,
      { q: "Does it handle emoji and non-English text?", a: "Yes. Text is encoded as UTF-8 first, so accents, emoji and every script round-trip correctly." },
      { q: "What is URL-safe Base64?", a: "It replaces + and / with - and _ and drops the = padding, so the result can go in URLs and file names. It's used in JWTs." },
      { q: "How do I turn an image into a data URL?", a: "Choose Encode, click Encode a file and pick the image. Copy data URL gives you a string you can use directly in HTML or CSS." },
    ],
  },
  {
    slug: "url-encode",
    mode: "url",
    title: "URL Encode & Decode Online — Percent-Encoding Tool | devsam",
    description: "Encode or decode URLs and query strings with percent-encoding, and see any URL broken into its parts and parameters. Free and private.",
    h1: "URL encode and decode",
    intro: "Percent-encode text for safe use in URLs, decode encoded strings, and see any link broken down into its parts.",
    howTo: "How to URL-encode text",
    steps: [
      { title: "Choose a direction", body: "Encode turns spaces and symbols into codes like %20. Decode does the reverse." },
      { title: "Pick what to encode", body: "Query value encodes everything that isn't safe in a parameter. Whole URL keeps characters like / and ? intact." },
      { title: "Inspect the link", body: "Paste a full URL to see its host, path and every query parameter in a table." },
    ],
    faqs: [
      privacy,
      { q: "When should I use Query value or Whole URL?", a: "Use Query value for a single parameter, such as a search term, because it encodes &, = and /. Use Whole URL to clean up a complete link while keeping its structure." },
      { q: "Why does a + turn into a space when decoding?", a: "In query strings, + traditionally means a space. Decoding follows that rule, which matches how browsers read form data." },
    ],
  },
  {
    slug: "jwt-decoder",
    mode: "jwt",
    title: "JWT Decoder — Decode JSON Web Tokens Online Safely | devsam",
    description: "Decode a JWT to read its header and payload, with issued and expiry times shown in your time zone. Runs in your browser; tokens are never stored.",
    h1: "Decode a JWT",
    intro: "Paste a JSON Web Token to read its header and claims, and see at a glance when it was issued and whether it has expired.",
    howTo: "How to decode a JWT",
    steps: [
      { title: "Paste the token", body: "Paste a JWT, with or without the word Bearer in front." },
      { title: "Read the claims", body: "The header and payload appear as formatted JSON, with issued, not-before and expiry times converted to readable dates." },
      { title: "Copy what you need", body: "Copy the header or payload JSON with one click." },
    ],
    faqs: [
      privacy,
      { q: "Is it safe to paste a real token here?", a: "Decoding happens entirely in your browser and the token isn't saved, even in this browser. Still, treat live tokens like passwords and prefer expired or test tokens when you can." },
      { q: "Does this verify the signature?", a: "No. Verifying needs the signing secret or public key, which you should never paste into a website. Use your server or a library for verification." },
      { q: "Why does it say Expired?", a: "The exp claim is a time in seconds. If it's earlier than now, the token has expired and servers will reject it." },
    ],
  },
];
