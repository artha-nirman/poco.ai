/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pg'],
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    VERCEL_KV_URL: process.env.KV_URL,
    VERCEL_BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  }
};

module.exports = nextConfig;