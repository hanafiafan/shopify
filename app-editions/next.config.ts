import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Live standalone clone: serve the rebranded Shopify HTML bundle (Remix hydrates,
      // real scroll/WebGL animations run). Next hosts it as a static file.
      { source: "/editions/winter2026", destination: "/live/winter2026.html" },
    ];
  },
};

export default nextConfig;
