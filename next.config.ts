import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.wenturc.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
