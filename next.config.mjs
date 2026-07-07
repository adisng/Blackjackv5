/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: '/Users/adityasingh/Desktop/Blackjack v5',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
