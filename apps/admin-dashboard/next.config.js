/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@shop-attendance/types"],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;