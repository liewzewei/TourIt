import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  images: {
    // Listing photos are served straight from the public Storage bucket and are
    // resized / converted to WebP by the Next.js image optimizer. We
    // deliberately do NOT use Supabase's image transformation API: it is
    // Pro-plan only (see supabase/config.toml) and billed per origin image.
    //
    // Each pattern is scoped to the listing-images bucket path. `search: ""`
    // requires the URL to have no query string -- omitting it would imply a
    // `**` wildcard, which Next's docs advise against.
    remotePatterns: [
      // Hosted project: <project-ref>.supabase.co (a single subdomain level).
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/listing-images/**",
        search: "",
      },
      // Local Supabase stack, for when NEXT_PUBLIC_SUPABASE_URL points at it.
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/listing-images/**",
        search: "",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "54321",
        pathname: "/storage/v1/object/public/listing-images/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
