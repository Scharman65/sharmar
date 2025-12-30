import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },

  images: {
    domains: ["api.sharmar.me"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.sharmar.me",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "1337",
        pathname: "/**",
      },
    ],
    ...(isDev ? { unoptimized: true } : {}),
  },
};

export default nextConfig;
