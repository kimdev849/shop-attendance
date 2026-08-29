/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@shop-attendance/types"],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // Faster dev rebuilds
  experimental: {
    // Optimize package imports for faster compilation
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },

  // Speed up webpack dev rebuilds
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Faster source maps for dev
      config.devtool = "eval-cheap-module-source-map";

      // Don't watch node_modules for changes
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules/,
        aggregateTimeout: 300,
        poll: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
