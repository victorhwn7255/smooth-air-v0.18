import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // a stray lockfile in the home directory otherwise makes Next guess the
  // wrong workspace root
  turbopack: { root: __dirname },
  // baked corridors are read with fs at runtime — make sure serverless
  // bundling traces them in
  outputFileTracingIncludes: {
    "/api/briefing": ["./src/lib/data/corridors/**"],
  },
};

export default nextConfig;
