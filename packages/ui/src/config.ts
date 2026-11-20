// Settings shared by every tool site.

export const site = {
  family: "devsam tools",
  author: "Samuel Ogbodo",
  portfolio: "https://devsamc.xyz",
  repo: "https://github.com/Samuel515/devsam-tools",
  // Used on privacy pages. TODO(samuel): set a contact address for privacy questions.
  contactEmail: "",
};

/**
 * Google AdSense.
 *
 * `publisherId` only feeds each tool's ads.txt, which declares the account that may
 * sell ads here. It shows nothing on the page.
 *
 * Ads stay completely off while `enabled` is false: no ad script loads and every
 * ad slot stays hidden. When AdSense approves the site:
 *   1. Create two responsive display ad units in AdSense and paste their IDs below.
 *   2. Set `enabled` to true and push. Every tool rebuilds with ads on.
 */
export const adsense = {
  publisherId: "pub-7349479508743936",
  enabled: false,
  slots: {
    // Shown under the tool, above the explainer content.
    belowTool: "",
    // Shown inside the explainer content.
    inContent: "",
  },
  get client() {
    return `ca-${this.publisherId}`;
  },
};

export const adsEnabled = () => adsense.enabled && adsense.publisherId.trim().length > 0;
