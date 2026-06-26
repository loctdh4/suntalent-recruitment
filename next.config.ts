import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Cố định workspace root về thư mục dự án (tránh Next chọn nhầm lockfile ở thư mục cha).
  turbopack: {
    root: path.resolve(__dirname),
  },
  // @react-pdf/renderer chạy ở server route, không bundle vào client.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
