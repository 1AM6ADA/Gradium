import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Emit a minimal self-contained server bundle for small Docker images
  output: "standalone",
};

export default nextConfig;
