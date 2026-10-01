import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets phones/TVs on the same Wi-Fi open the dev server by LAN IP (e.g. QR test).
  allowedDevOrigins: ["10.*.*.*", "172.*.*.*", "192.168.*.*"],
};

export default nextConfig;
