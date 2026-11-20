// Output size presets. Social sizes follow each platform's current upload recommendations.
export type Preset = { id: string; group: string; label: string; w: number; h: number; note?: string; /** Keep the file under this size (KB, 1000 bytes). */ maxKB?: number };

export const PRESETS: Preset[] = [
  { id: "ig-post", group: "Instagram", label: "Post (square)", w: 1080, h: 1080 },
  { id: "ig-portrait", group: "Instagram", label: "Post (portrait)", w: 1080, h: 1350 },
  { id: "ig-story", group: "Instagram", label: "Story / Reel", w: 1080, h: 1920 },
  { id: "wa-dp", group: "WhatsApp", label: "Profile photo", w: 640, h: 640 },
  { id: "wa-status", group: "WhatsApp", label: "Status", w: 1080, h: 1920 },
  { id: "yt-thumb", group: "YouTube", label: "Thumbnail", w: 1280, h: 720 },
  { id: "yt-banner", group: "YouTube", label: "Channel banner", w: 2560, h: 1440 },
  { id: "fb-cover", group: "Facebook", label: "Cover photo", w: 1640, h: 624 },
  { id: "fb-post", group: "Facebook", label: "Post", w: 1200, h: 630 },
  { id: "x-header", group: "X (Twitter)", label: "Header", w: 1500, h: 500 },
  { id: "x-post", group: "X (Twitter)", label: "Post image", w: 1600, h: 900 },
  { id: "li-banner", group: "LinkedIn", label: "Profile banner", w: 1584, h: 396 },
  { id: "li-photo", group: "LinkedIn", label: "Profile photo", w: 400, h: 400 },
  { id: "passport-us", group: "Passport & ID", label: "2×2 in (US)", w: 600, h: 600, note: "300 DPI" },
  { id: "passport-35x45", group: "Passport & ID", label: "35×45 mm (UK, EU, Nigeria)", w: 413, h: 531, note: "300 DPI" },
  { id: "waec-gce", group: "Passport & ID", label: "WAEC GCE photo", w: 275, h: 314, maxKB: 50, note: "JPG under 50 KB. Check the current WAEC instructions before uploading." },
  { id: "hd", group: "Screens", label: "Full HD", w: 1920, h: 1080 },
  { id: "4k", group: "Screens", label: "4K", w: 3840, h: 2160 },
];

export const findPreset = (id: string) => PRESETS.find((p) => p.id === id);
