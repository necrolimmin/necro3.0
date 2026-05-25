/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const nextConfig = {
  images: {
    remotePatterns: [
      {protocol: 'https', hostname: 'image.tmdb.org'},
      {protocol: 'https', hostname: '*.tmdb.org'},
      {protocol: 'http', hostname: 'localhost'},
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
