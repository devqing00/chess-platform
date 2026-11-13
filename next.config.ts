import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['stockfish'],
  outputFileTracingIncludes: {
    '/api/**/*': ['./scripts/**/*', './node_modules/stockfish/**/*'],
  },
};

export default nextConfig;
