/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    outputFileTracingIncludes: {
      '/*': ['./dev.db', './prisma/dev.db'],
      '/api/*': ['./dev.db', './prisma/dev.db'],
      '/api/**/*': ['./dev.db', './prisma/dev.db'],
    },
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
