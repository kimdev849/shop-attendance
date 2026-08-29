const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "recharts"],
  },

  webpack: (config) => {
    // Explicit @/ alias — avoids resolution issues on Linux/Render
    // Only alias @/ (slash after @), NOT bare @ to avoid CSS conflicts
    config.resolve.alias["@/"] = path.resolve(__dirname, "./") + "/";

    return config;
  },
};

module.exports = nextConfig;
