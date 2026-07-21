/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "drizzle-orm",
      "postgres",
      "next-auth",
      "zod",
      "bcryptjs",
    ],
  },
  webpack: (config, { dev }) => {
    // Avoid corrupt pack.gz / vendor-chunks when .next is cleared while dev is running (Windows)
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
