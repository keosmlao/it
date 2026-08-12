import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // ຄ່າປົກກະຕິ 1MB ນ້ອຍເກີນສຳລັບຮູບໜ້າຈໍ — ອະນຸຍາດ 5 ຮູບ × 8MB
      bodySizeLimit: "45mb",
    },
  },
};

export default nextConfig;
