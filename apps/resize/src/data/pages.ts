import type { Topic } from "@devsam/ui/components/TopicSection.astro";

type QA = { q: string; a: string };

export type ResizePageData = {
  slug: string;
  preset: string;
  label: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  topic: Topic;
  faqs: QA[];
};

export const pages: ResizePageData[] = [
  {
    slug: "instagram",
    preset: "ig-post",
    label: "Instagram",
    title: "Resize Images for Instagram — Post, Portrait & Story Sizes | devsam",
    description: "Resize and crop photos to Instagram's exact sizes: 1080×1080 posts, 1080×1350 portrait and 1080×1920 stories. Free and private.",
    h1: "Resize photos for Instagram",
    intro: "Crop to the exact square, portrait or story size so Instagram doesn't cut off the important part. Drag to frame, then download.",
    topic: {
      heading: "Instagram image sizes explained",
      paragraphs: [
        "Instagram crops anything that doesn't match its supported shapes, and it recompresses large uploads. Uploading at its exact sizes means you choose the crop, not Instagram, and your photos stay sharper.",
      ],
      list: [
        { title: "Square post, 1080×1080 (1:1):", body: "the classic grid shape." },
        { title: "Portrait post, 1080×1350 (4:5):", body: "takes up the most room in the feed, so it's the best choice for most photos." },
        { title: "Story and Reel, 1080×1920 (9:16):", body: "fills a phone screen. Keep text away from the top and bottom, where Instagram places its buttons." },
      ],
      outro: "Choose a size from the Size menu on the right, drag your photo to frame it, then download a JPG.",
    },
    faqs: [
      { q: "What size should Instagram posts be?", a: "1080×1350 for portrait posts, which get the most space in the feed, or 1080×1080 for squares. Stories and Reels are 1080×1920." },
      { q: "Why does Instagram make my photos blurry?", a: "Instagram recompresses images that are larger than it needs. Uploading at 1080 pixels wide, already cropped to the right shape, gives the sharpest result." },
      { q: "Can I post a landscape photo without cropping?", a: "Yes. Choose Fit with border to keep the whole photo on a square or portrait canvas, with a border colour you pick." },
    ],
  },
  {
    slug: "whatsapp-dp",
    preset: "wa-dp",
    label: "WhatsApp DP",
    title: "WhatsApp DP Resizer — Fit Full Photo Without Cropping | devsam",
    description: "Resize a photo for your WhatsApp profile picture or status. Crop it perfectly or fit the full photo with a border. Free, private.",
    h1: "Resize a photo for WhatsApp",
    intro: "Make your WhatsApp profile photo or status fit perfectly. Choose Fit with border to keep the whole picture with no crop.",
    topic: {
      heading: "Getting your whole photo into a WhatsApp DP",
      paragraphs: [
        "WhatsApp shows profile photos as a circle cut from a square, so tall or wide photos get their edges cropped off. Group photos and full-length shots suffer most.",
        "With <strong>Fit with border</strong>, your entire photo is placed on a square background in the colour you choose, so nothing is cut off. With <strong>Crop to fill</strong>, you drag the photo to choose exactly what stays in the circle.",
      ],
      list: [
        { title: "Profile photo:", body: "a 640×640 square is plenty; WhatsApp displays it much smaller." },
        { title: "Status:", body: "1080×1920 fills the screen in portrait." },
        { title: "Keep faces central:", body: "the corners of the square are hidden by the circle." },
      ],
    },
    faqs: [
      { q: "How do I put a full picture on WhatsApp without cropping?", a: "Choose WhatsApp, Profile photo, then Fit with border. The full photo is placed on a square background, so WhatsApp has nothing to crop." },
      { q: "What size is a WhatsApp profile picture?", a: "WhatsApp uses a square image shown as a circle. 640×640 pixels is a good size that stays sharp on every phone." },
      { q: "Can I resize a photo for WhatsApp status?", a: "Yes. Choose WhatsApp, Status, which is 1080×1920 and fills a phone screen in portrait." },
    ],
  },
  {
    slug: "youtube-thumbnail",
    preset: "yt-thumb",
    label: "YouTube thumbnail",
    title: "YouTube Thumbnail Resizer — 1280×720 Online Free | devsam",
    description: "Resize any image to the YouTube thumbnail size of 1280×720 (16:9), or to a 2560×1440 channel banner. Free, no sign-up.",
    h1: "Resize an image for a YouTube thumbnail",
    intro: "Get an exact 1280×720 thumbnail or 2560×1440 channel banner from any image, framed the way you want.",
    topic: {
      heading: "YouTube thumbnail and banner sizes",
      paragraphs: [
        "YouTube recommends 1280×720 pixels for thumbnails, a 16:9 shape that matches the video player. Thumbnails must also be under 2 MB, which a 1280×720 JPG easily is.",
        "Channel banners are 2560×1440, but only the centre strip is visible on every device. Keep logos and text in the middle of the banner so they're never cut off on phones.",
      ],
    },
    faqs: [
      { q: "What is the YouTube thumbnail size?", a: "1280×720 pixels at a 16:9 ratio, under 2 MB, as JPG, PNG or GIF. Choose YouTube, Thumbnail to get exactly that." },
      { q: "How do I make a thumbnail from a screenshot?", a: "Drop the screenshot, choose YouTube, Thumbnail, drag to frame the important part and download. The result is exactly 1280×720." },
    ],
  },
  {
    slug: "passport-photo",
    preset: "passport-35x45",
    label: "Passport photo",
    title: "Passport Photo Resizer — 35×45 mm and 2×2 inch Free | devsam",
    description: "Crop a photo to passport size: 35×45 mm (UK, EU, Nigeria) or 2×2 inches (US), at 300 DPI for printing. Free and private.",
    h1: "Resize a photo to passport size",
    intro: "Crop your photo to 35×45 mm or 2×2 inches at print resolution. Position your face in the frame, then download.",
    topic: {
      heading: "Passport photo sizes",
      paragraphs: [
        "Most countries use one of two passport photo sizes. This tool crops your photo to the right shape at 300 DPI, the standard resolution for printing photos.",
      ],
      list: [
        { title: "35×45 mm:", body: "used by the UK, the EU, Nigeria and many other countries. That's 413×531 pixels at 300 DPI." },
        { title: "2×2 inches (51×51 mm):", body: "used for US passports and visas. That's 600×600 pixels at 300 DPI." },
      ],
      outro: "Rules about head size, background colour and expression vary by country, so check the official guidance. For a white background, remove the background first with the <a href=\"https://bg.devsamc.xyz/white-background/\">Background Remover</a>.",
    },
    faqs: [
      { q: "Is the passport size accurate for printing?", a: "Yes. 35×45 mm and 2×2 inch presets are calculated at 300 DPI, the standard for photo printing. Print at 100% scale, not 'fit to page'." },
      { q: "How do I get a white background for my passport photo?", a: "Use the Background Remover's white background mode first, then crop the result here to passport size." },
      { q: "Can I use this for an online passport application?", a: "Usually yes, but online forms often have their own pixel and file-size rules. Check the form's instructions, and use the Image Compressor if you need a smaller file." },
    ],
  },
  {
    slug: "waec-passport-photo",
    preset: "waec-gce",
    label: "WAEC GCE photo",
    title: "WAEC GCE Passport Photo Resizer — 275×314, Under 50 KB | devsam",
    description: "Crop and resize your passport photo to 275×314 pixels as a JPG under 50 KB for WAEC GCE registration. Free, private, nothing is uploaded.",
    h1: "Resize a passport photo for WAEC GCE",
    intro: "Crop your photo to 275×314 pixels and get a JPG under 50 KB, the size WAEC GCE registration guides describe.",
    topic: {
      heading: "WAEC GCE photo requirements",
      paragraphs: [
        "Registration guides for WAEC GCE (private candidates) describe a passport photograph uploaded as a JPG of 275×314 pixels, under 50 KB, with a plain, light background. A photo that doesn't match is usually rejected by the portal.",
        "This page sets the WAEC GCE size automatically. Drag your photo so your face is centred, then download. The file is saved as a JPG and kept under 50 KB.",
        "Requirements can change between registration cycles, so always check the instructions on the official WAEC registration portal before you upload.",
      ],
      list: [
        { title: "Use a recent photo:", body: "taken against a plain white or light background, facing the camera." },
        { title: "Background not plain?", body: "use the <a href=\"https://bg.devsamc.xyz/white-background/\">Background Remover</a> to make it white first." },
        { title: "Different limits?", body: "if your portal asks for another size, use <a href=\"https://compress.devsamc.xyz/compress-image-to-20kb/\">compress to 20 KB</a> or set a custom size." },
      ],
    },
    faqs: [
      { q: "What size should a WAEC GCE passport photo be?", a: "Registration guides describe 275×314 pixels, as a JPG under 50 KB. Confirm this on the official WAEC portal, since requirements can change." },
      { q: "Why does the WAEC portal reject my photo?", a: "Usually because the file is too big, the dimensions are wrong, or it isn't a JPG. This preset fixes all three." },
      { q: "Can I take the photo with my phone?", a: "Yes. Stand in front of a plain light wall in good light, take the photo, then crop it here. Remove a busy background first with the Background Remover." },
    ],
  },
];

export const generalTopic: Topic = {
  heading: "Resize or crop?",
  paragraphs: [
    "Changing an image's size and changing its shape are different things. When the new shape matches, the photo is simply scaled. When it doesn't, you choose how to handle the difference.",
  ],
  list: [
    { title: "Crop to fill:", body: "the photo fills the whole frame and the edges are trimmed. Drag to choose what stays." },
    { title: "Fit with border:", body: "the whole photo is kept and the empty space is filled with a colour." },
    { title: "Custom size:", body: "type any width and height. Keep proportions on to scale without changing the shape." },
  ],
};
