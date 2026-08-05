import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "156.67.24.44"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
