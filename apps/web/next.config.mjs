/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@myschool/shared", "@myschool/database"],
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
