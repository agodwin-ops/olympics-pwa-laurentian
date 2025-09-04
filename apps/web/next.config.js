/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  output: 'standalone',
  
  // PWA Configuration
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  
  // Production optimizations
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
  
  // PWA Manifest support
  headers: async () => {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
      // Production security headers
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  
  // Environment-specific configuration
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_API_BASE_URL 
      : 'http://localhost:8080',
  },
};

module.exports = nextConfig;