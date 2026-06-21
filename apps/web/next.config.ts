import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR,
  devIndicators: false,
  turbopack: {
    root: path.join(process.cwd(), "../.."),
  },
};

export default nextConfig;
