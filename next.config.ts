import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Derive the Supabase storage host from env so next/image remotePatterns can
// be configured once (e.g. https://xxxx.supabase.co).
let supabaseHostname = "";
try {
  supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : "";
} catch {
  supabaseHostname = "";
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const remoteImagePatterns = [
  ...(supabaseHostname
    ? [
        {
          protocol: "https" as const,
          hostname: supabaseHostname,
          pathname: "/storage/v1/**",
        },
      ]
    : []),
  { protocol: "https" as const, hostname: "images.unsplash.com" },
  { protocol: "https" as const, hostname: "images.pexels.com" },
  { protocol: "https" as const, hostname: "lh3.googleusercontent.com" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  // Every canonical URL, sitemap entry and internal link in this project ends
  // with a trailing slash (see src/lib/urls.ts). Without this, each one would
  // 308-redirect to the slashed form, wasting crawl budget and splitting signals.
  trailingSlash: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: remoteImagePatterns,
  },

  async headers() {
    return [
      // Apply security headers to every route.
      { source: "/:path*", headers: securityHeaders },
      // Immutable caching for the demo/static asset folders.
      {
        source: "/demo/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/favicon.ico",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },

  async redirects() {
    return [
      // www -> apex for the production domain (no effect in local dev).
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.meraghar.com" }],
        destination: "https://meraghar.com/:path*",
        permanent: true,
      },
      // Normalize legacy/typo paths back to the homepage.
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/home", destination: "/", permanent: true },
      { source: "/:city/rooms-for-rent", destination: "/:city/rooms", permanent: true },
      { source: "/:city/flats-for-rent", destination: "/:city/flats", permanent: true },
      { source: "/:city/houses-for-rent", destination: "/:city/houses", permanent: true },
      { source: "/:city/shops-for-rent", destination: "/:city/shops", permanent: true },
    ];
  },
};

export default nextConfig;