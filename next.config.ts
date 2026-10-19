import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@ffmpeg-installer/ffmpeg",
    "fluent-ffmpeg",
    "pdf-parse",
  ],
};

export default nextConfig;
