import type { NextConfig } from "next";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local from monorepo root (Next.js only looks in apps/web by default)
config({ path: resolve(process.cwd(), "../../.env.local") });

const nextConfig: NextConfig = {
  transpilePackages: ["@archmock/shared"],
};

export default nextConfig;
