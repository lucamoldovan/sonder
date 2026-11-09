import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

// Opt in explicitly when running the local app through Cloudflare bindings.
// Never initialize the local Hyperdrive shim during production builds/deploys.
if (process.env.OPENNEXT_DEV === "true") {
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  reactStrictMode: true
};

export default nextConfig;
