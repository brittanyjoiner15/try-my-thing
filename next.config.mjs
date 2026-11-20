/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cache Components is off: every page here is per-user and reads auth cookies,
  // so the classic dynamic rendering model is simpler.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Demo mode is gone. Old shared /demo links go to the home page instead of a 404.
  // The service worker must never be cached, or phones keep running an old one. Issue #48.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
  async redirects() {
    return [{ source: "/demo/:path*", destination: "/", permanent: false }];
  },
  experimental: {
    serverActions: {
      // Product form uploads a logo + screenshot (2MB max each; bigger picks are shrunk in the browser). Default limit is 1MB.
      // Netlify caps function requests at 6MB, so don't raise this past that.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
