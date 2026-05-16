import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  basePath: "/aura",
  experimental: {
    viewTransition: true,
  },
  turbopack: {
    root: path.join(__dirname)
  }
};

export default nextConfig;
