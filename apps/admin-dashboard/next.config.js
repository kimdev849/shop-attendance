/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NO transpilePackages - types are copied locally by prebuild.sh
  // This was causing 3-4s HMR rebuilds because webpack recompiled the
  // types package on every file save
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },

  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.devtool = "eval-cheap-module-source-map";

      config.watchOptions = {
        ignored: [
          /node_modules/,
          /\.next/,
          /\.git/,
        ],
        aggregateTimeout: 50,
        poll: false,
      };

      // Cache webpack for faster rebuilds
      config.cache = {
        type: "filesystem",
        cacheDirectory: require("path").join(__dirname, ".next", "cache", "webpack"),
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
