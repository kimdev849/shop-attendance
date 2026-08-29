const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },

  webpack: (config, { dev }) => {
    // Explicit @/ alias — avoids resolution issues on Linux/Render
    config.resolve.alias["@"] = path.resolve(__dirname);

    if (dev) {
      // Faster HMR: ignore node_modules from watching
      config.watchOptions = {
        aggregateTimeout: 50,
        poll: false,
        ignored: /node_modules/,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
