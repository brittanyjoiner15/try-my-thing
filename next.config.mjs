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
};

export default nextConfig;
