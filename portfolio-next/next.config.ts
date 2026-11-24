import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [], unoptimized: true },
  compress: true,
  poweredByHeader: false,
  experimental: { optimizePackageImports: ["lucide-react", "framer-motion"] },
  async headers() {
    const immutable = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
    return [
      { source: "/bg/:path*", headers: immutable },
      { source: "/img/:path*", headers: immutable },
      { source: "/models/:path*", headers: immutable },
    ];
  },
};

export default nextConfig;
