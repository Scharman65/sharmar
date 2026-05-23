import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : { turbopack: { root: __dirname } }),

  images: {
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
