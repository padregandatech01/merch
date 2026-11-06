import type { NextConfig } from "next";

// Auth pages require request-time cookies. Do not prerender them.
const nextConfig: NextConfig = {};

export default nextConfig;
