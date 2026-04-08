import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL(
        "https://ceckfpqhppxgasrwticz.supabase.co/storage/v1/object/public/**"
      ),
    ],
  },
};

export default nextConfig;
