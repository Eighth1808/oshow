/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fwnnympmtbocazofiieb.supabase.co',
      },
    ],
  },
};

export default nextConfig;
