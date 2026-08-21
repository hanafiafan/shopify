import type { NextConfig } from "next";

// Live standalone clones: Next hosts the rebranded Shopify Remix bundles. Each must be served
// at its ORIGINAL pathname so Remix's client router matches its route manifest.
const EDITIONS = [
  "winter2026",
  "spring2026",
  "summer2025",
  "winter2025",
  "summer2024",
  "winter2024",
  "summer2023",
  "winter2023",
  "summer2022",
];

const nextConfig: NextConfig = {
  async rewrites() {
    return EDITIONS.map((e) => ({
      source: `/editions/${e}`,
      destination: `/live/${e}.html`,
    }));
  },
};

export default nextConfig;
