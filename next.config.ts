import type { NextConfig } from "next";

// Every page in the admin depends on who is signed in, so nothing is
// prerendered: Cache Components (and Partial Prefetching, which needs it) are
// left off and pages render per request.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
