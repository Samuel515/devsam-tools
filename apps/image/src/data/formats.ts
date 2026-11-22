// Per-format facts used to build the conversion page copy.
export type FormatKey = "heic" | "jpg" | "jfif" | "png" | "webp" | "avif" | "gif" | "bmp" | "tiff" | "svg" | "ico";

export type Format = {
  name: string;
  full: string;
  /** One or two sentences: what it is and where people meet it. */
  what: string;
  lossy: boolean;
  alpha: boolean;
  animation: boolean;
  /** Where the format works well or badly. */
  support: string;
  /** Typical reason someone wants to convert away from it. */
  pain: string;
  /** Typical reason someone wants to convert to it. */
  gain: string;
};

export const FORMATS: Record<FormatKey, Format> = {
  heic: {
    name: "HEIC",
    full: "High Efficiency Image Container",
    what: "HEIC is the format iPhones and iPads use for photos by default since iOS 11. It stores photos at about half the size of JPG with the same quality.",
    lossy: true,
    alpha: true,
    animation: false,
    support: "Apple devices open it natively, but many Windows apps, Android apps, websites and upload forms don't accept it.",
    pain: "upload forms, Windows PCs and many apps reject HEIC files",
    gain: "it's far smaller than JPG at the same quality",
  },
  jpg: {
    name: "JPG",
    full: "JPEG (Joint Photographic Experts Group)",
    what: "JPG is the most widely supported image format in the world, used by cameras, phones and almost every website for photos.",
    lossy: true,
    alpha: false,
    animation: false,
    support: "Every device, browser, editor and upload form accepts JPG.",
    pain: "it can't store transparency and loses a little detail every time it's re-saved",
    gain: "it opens everywhere and keeps photos small",
  },
  jfif: {
    name: "JFIF",
    full: "JPEG File Interchange Format",
    what: "JFIF is a JPEG image with a .jfif extension. Windows and Chrome sometimes save downloaded pictures this way, even though the image inside is an ordinary JPEG.",
    lossy: true,
    alpha: false,
    animation: false,
    support: "Browsers display it, but many upload forms and apps reject the .jfif extension.",
    pain: "upload forms and apps often reject the unfamiliar .jfif extension",
    gain: "it's a standard JPEG",
  },
  png: {
    name: "PNG",
    full: "Portable Network Graphics",
    what: "PNG is a lossless format that keeps every pixel exactly, with full transparency. It's the standard for screenshots, logos, icons and graphics with text.",
    lossy: false,
    alpha: true,
    animation: false,
    support: "Supported everywhere: browsers, editors, Office, phones and upload forms.",
    pain: "photos saved as PNG are often 5–10 times larger than the same photo as JPG",
    gain: "it's lossless and keeps transparency, ideal for editing, logos and screenshots",
  },
  webp: {
    name: "WebP",
    full: "WebP, created by Google",
    what: "WebP is a modern web format from Google that makes images about 25–35% smaller than JPG or PNG. Many websites now serve WebP, so images you save from the web often end up as .webp files.",
    lossy: true,
    alpha: true,
    animation: true,
    support: "All modern browsers support it, but some older editors, Office versions and upload forms don't.",
    pain: "older apps, editors and upload forms often can't open WebP files",
    gain: "it gives much smaller files for websites, with transparency",
  },
  avif: {
    name: "AVIF",
    full: "AV1 Image File Format",
    what: "AVIF is the newest mainstream image format, based on the AV1 video codec. It often makes files half the size of JPG at similar quality.",
    lossy: true,
    alpha: true,
    animation: true,
    support: "Supported by current Chrome, Edge, Firefox and Safari, but many apps, editors and older devices can't open it yet.",
    pain: "many apps, editors and older phones can't open AVIF yet",
    gain: "it produces the smallest files of any widely supported format",
  },
  gif: {
    name: "GIF",
    full: "Graphics Interchange Format",
    what: "GIF is a 1980s format best known for short animations. It's limited to 256 colours per frame, so photos saved as GIF look grainy.",
    lossy: false,
    alpha: true,
    animation: true,
    support: "Opens everywhere, but its 256-colour limit makes it a poor choice for photos.",
    pain: "its 256-colour limit makes photos look banded and grainy",
    gain: "it's universally supported for simple graphics",
  },
  bmp: {
    name: "BMP",
    full: "Windows Bitmap",
    what: "BMP is an old Windows format that stores pixels with no compression, so files are very large.",
    lossy: false,
    alpha: false,
    animation: false,
    support: "Windows opens it, but most websites and upload forms don't accept it, and it's huge to email.",
    pain: "files are enormous and most websites won't accept them",
    gain: "some old software and devices only read BMP",
  },
  tiff: {
    name: "TIFF",
    full: "Tagged Image File Format",
    what: "TIFF is a high-quality format used by scanners, professional cameras and printing. Files are large because they often store images with little or no compression.",
    lossy: false,
    alpha: true,
    animation: false,
    support: "Photo editors and print shops use it, but browsers can't display it and it's too big for most uploads.",
    pain: "files are very large and browsers can't display them",
    gain: "it's preferred for printing and archiving",
  },
  svg: {
    name: "SVG",
    full: "Scalable Vector Graphics",
    what: "SVG is a vector format: it describes shapes with maths instead of pixels, so logos and icons stay sharp at any size.",
    lossy: false,
    alpha: true,
    animation: true,
    support: "Browsers display it perfectly, but social networks, Office and many apps need a regular image instead.",
    pain: "social networks, documents and many apps only accept pixel images",
    gain: "it scales to any size",
  },
  ico: {
    name: "ICO",
    full: "Windows Icon",
    what: "ICO is the icon format used by Windows and by website favicons. One .ico file can contain several sizes of the same icon.",
    lossy: false,
    alpha: true,
    animation: false,
    support: "Used for favicons and Windows shortcuts, but not suitable for photos or general sharing.",
    pain: "most apps and editors can't edit ICO files directly",
    gain: "it's the standard favicon and Windows icon format, with several sizes in one file",
  },
};
