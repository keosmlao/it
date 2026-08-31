import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * ບອກ vitest ໃຫ້ຮູ້ຈັກ alias `@/` ຄືກັນກັບ tsconfig
 *
 * ຈຳເປັນຕັ້ງແຕ່ test ຂອງສິດເລີ່ມທຽບກັບ `nav-config` ຈິງ ເພື່ອຈັບກໍລະນີ
 * ເພີ່ມເມນູແລ້ວລືມໃສ່ສິດໃຫ້ມັນ
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
