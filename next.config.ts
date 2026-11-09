import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

// Only enable the local Cloudflare/Hyperdrive shim when a local database URL
// is explicitly provided. Cloudflare's build environment may set NODE_ENV
// differently, but production builds must never require a local DB.
if (process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE) {
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  reactStrictMode: true
};

export default nextConfig;
