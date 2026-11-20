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
 * Leave `client` empty and no ad code loads and every ad slot stays hidden.
 * When AdSense approves a site:
 *   1. Set `client` to your publisher ID, e.g. "ca-pub-1234567890123456".
 *   2. Create one display ad unit per slot name below in AdSense and paste its ID.
 *   3. Rebuild. ads.txt is generated automatically from `client`.
 */
export const adsense = {
  client: "",
  slots: {
    // Shown under the tool, above the explainer content.
    belowTool: "",
    // Shown inside the explainer content.
    inContent: "",
  },
};

export const adsEnabled = () => adsense.client.trim().length > 0;
