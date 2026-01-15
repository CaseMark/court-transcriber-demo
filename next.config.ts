import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cloudflared tunnel URLs in development
  allowedDevOrigins: ["*.trycloudflare.com"],

  // Increase body size limit for large audio file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

export default nextConfig;
