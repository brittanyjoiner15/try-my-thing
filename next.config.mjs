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
