/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@myschool/shared", "@myschool/database"],
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
