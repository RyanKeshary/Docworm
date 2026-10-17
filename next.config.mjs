/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ['postgres', 'nodemailer', 'web-push', 'exceljs'],
  // Allow builds to complete even if minor typescript warnings exist during migration
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
