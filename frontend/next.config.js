/****
 * Next.js config to proxy /mainpage to backend during development.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

module.exports = nextConfig;
