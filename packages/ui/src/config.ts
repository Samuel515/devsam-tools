// Settings shared by every tool site.

export const site = {
  family: "devsam tools",
  author: "Samuel Ogbodo",
  portfolio: "https://devsamc.xyz",
  repo: "https://github.com/Samuel515/devsam-tools",
  contactEmail: "", // shown on privacy pages when set
};

// publisherId feeds ads.txt. Nothing ad-related renders unless `enabled` is true
// and the slot IDs are set.
export const adsense = {
  publisherId: "pub-7349479508743936",
  enabled: false,
  slots: {
    belowTool: "",
    inContent: "",
  },
  get client() {
    return `ca-${this.publisherId}`;
  },
};

export const adsEnabled = () => adsense.enabled && adsense.publisherId.trim().length > 0;
