import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Cloudflare quick tunnels (and similar) so a phone can load `next dev`.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;

initOpenNextCloudflareForDev();
