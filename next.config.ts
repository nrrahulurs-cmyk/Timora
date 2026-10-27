import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  devIndicators: false,
  webpack(config, { dev }) {
    if (!dev && process.env.TIMORA_DISABLE_BUILD_CACHE === "true") config.cache = false;
    return config;
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    agentUpgrade: "security",
    instantInsights: { validationLevel: "manual-warning" },
  },
};

export default nextConfig;
