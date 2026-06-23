import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,

  serverExternalPackages: ["sharp", "adm-zip"],

  outputFileTracingIncludes: {
    "/api/patents/[id]/drawings": [
      "./node_modules/sharp/**/*",
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
      "../../node_modules/sharp/**/*",
      "../../node_modules/@img/sharp-linux-x64/**/*",
      "../../node_modules/@img/sharp-libvips-linux-x64/**/*",
    ],
    "/api/patents/[id]/drawings/[page]": [
      "./node_modules/sharp/**/*",
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
      "../../node_modules/sharp/**/*",
      "../../node_modules/@img/sharp-linux-x64/**/*",
      "../../node_modules/@img/sharp-libvips-linux-x64/**/*",
    ],
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
    ],
  },
};

export default nextConfig;
