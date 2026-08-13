import 'server-only'
import { query } from '@/lib/db'

/**
 * ອັບເດດ cache ຂອງປະຫວັດຢືມ–ຄືນ (it.asset_movements_mv).
 *
 * ຕ້ອງເອີ້ນຫຼັງທຸກຄັ້ງທີ່ລະບົບນີ້ອອກໃບຢືມ ຫຼື ໃບຄືນ ບໍ່ດັ່ງນັ້ນຜູ້ໃຊ້ຈະ
 * ບໍ່ເຫັນຜົນທັນທີ. ໃຊ້ເວລາ ~150ms ກັບຂໍ້ມູນປັດຈຸບັນ (349 ແຖວ).
 *
 * ບໍ່ໂຍນ error ຕໍ່ — ຖ້າ refresh ລົ້ມ ການບັນທຶກກໍຍັງສຳເລັດ
 * ແລ້ວຮອບ refresh ຕາມຕາຕະລາງຈະຕາມມາເອງ
 */
export async function refreshMovements() {
  try {
    await query('select it.refresh_asset_movements()')
  } catch (e) {
    console.error('refresh asset movements ລົ້ມເຫຼວ:', (e as Error).message)
  }
}
