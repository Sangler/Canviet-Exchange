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
    // Use NEXT_PUBLIC_API_URL in production; fall back to localhost for dev
    const backend = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
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
