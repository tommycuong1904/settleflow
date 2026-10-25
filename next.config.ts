import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.SETTLEFLOW_NEXT_DIST_DIR ?? ".next",
  allowedDevOrigins: ["127.0.0.1", "localhost", "156.67.24.44"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
