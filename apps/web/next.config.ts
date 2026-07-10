import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR,
  devIndicators: false,
  serverExternalPackages: [
    "shiki",
    "echarts",
    "mathjs",
    "mermaid",
    "matter-js",
  ],
  turbopack: {
    root: path.join(process.cwd(), "../.."),
  },
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);
