import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ຕອນ dev, Next ບລັອກຄຳຮ້ອງຫາ /_next/* ຈາກ origin ອື່ນນອກຈາກ localhost.
  // ເຄື່ອງອື່ນໃນວົງ LAN ເປີດຜ່ານ IP ຂອງເຄື່ອງນີ້ ຈຶ່ງຕ້ອງລົງທະບຽນໄວ້.
  //
  // ໃສ່ IP ຂອງ "ເຄື່ອງທີ່ແລ່ນເຊີເວີ" ບໍ່ແມ່ນ IP ຂອງເຄື່ອງທີ່ເປີດເບິ່ງ —
  // Next ທຽບກັບ hostname ໃນ header Origin/Referer ຂອງ browser
  // IP ຂອງເຄື່ອງປ່ຽນຕາມ DHCP/ວົງເນັດ ຈຶ່ງໃສ່ທັງ wildcard ແລະ IP ທີ່ເຄີຍໃຊ້
  allowedDevOrigins: [
    '10.0.*.*',
    '10.0.10.216',
    '10.0.21.161',
    '10.0.40.9',
    // ເປີດຜ່ານໂດເມນ (tunnel/proxy ມາຫາ dev server)
    'odienmall.com',
    '*.odienmall.com',
  ],

  experimental: {
    serverActions: {
      // ຄ່າປົກກະຕິ 1MB ນ້ອຍເກີນສຳລັບຮູບໜ້າຈໍ — ອະນຸຍາດ 5 ຮູບ × 8MB
      bodySizeLimit: "45mb",
    },
  },
};

export default nextConfig;
