import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静态导出、零后端：构建产物为纯静态站点。
  // trailingSlash:false → 产出 bestiary/<slug>.html 平铺文件，配合 serve.json
  // 的 cleanUrls 让「无尾斜杠」URL（/bestiary/xxx）不再 404。
  output: "export",
  trailingSlash: false,
  images: { unoptimized: true },
};

export default nextConfig;
