/****
 * Next.js config to proxy /mainpage to backend during development.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable SWC compiler for better transpilation (supports older browsers)
  swcMinify: true,
  
  // Compiler options for older browser support
  compiler: {
    // Remove console.log in production for better performance
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Transpile modules for older browser compatibility
  transpilePackages: ['@coreui/react', '@coreui/coreui'],

  async rewrites() {
    const backend = process.env.BACKEND_URL && /^https?:\/\//.test(process.env.BACKEND_URL)
      ? process.env.BACKEND_URL.replace(/\/$/, '')
      : 'http://localhost:5000';
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
    ];
  },

  // Headers for better mobile compatibility
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
