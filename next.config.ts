import type { NextConfig } from "next";

const apiOrigin = process.env.API_PROXY_URL || "http://localhost:8787";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
