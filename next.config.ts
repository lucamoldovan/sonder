import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

// Cloudflare bindings are only initialized for the local Next.js dev server.
// Running this during "next build" makes Hyperdrive look for a local database.
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  reactStrictMode: true
};

export default nextConfig;
