import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,

  serverExternalPackages: ["sharp", "adm-zip"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
    ],
  },
};

export default nextConfig;
