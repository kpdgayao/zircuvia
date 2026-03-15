import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "bcryptjs", "leaflet", "react-leaflet", "@react-leaflet/core"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
