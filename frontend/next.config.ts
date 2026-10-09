import type { NextConfig } from "next";

if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL) {
  // NEXT_PUBLIC_* variables are inlined at build time; without it the app
  // would call http://localhost:8000 from the browser.
  console.warn("\n[warn] NEXT_PUBLIC_API_URL is not set; the app will call http://localhost:8000.\n");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root so Next doesn't pick up lockfiles from parent folders.
  turbopack: { root: __dirname },
};

export default nextConfig;
