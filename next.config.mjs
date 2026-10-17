// Ensure production environment consistency during Next.js builds on platforms like Vercel
if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
  process.env.NODE_ENV = 'production';
}

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
