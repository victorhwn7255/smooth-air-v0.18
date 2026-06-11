import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // baked corridors are read with fs at runtime — make sure serverless
  // bundling traces them in
  outputFileTracingIncludes: {
    "/api/briefing": ["./src/lib/data/corridors/**"],
  },
};

export default nextConfig;
