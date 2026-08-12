import 'server-only'

/**
 * ຈື່ຜົນຂອງ query ອ້າງອີງໄວ້ໃນໜ່ວຍຄວາມຈຳຂອງເຊີບເວີ.
 *
 * ໃຊ້ກັບຂໍ້ມູນທີ່ **ອ່ານເລື້ອຍ ແຕ່ປ່ຽນນານໆເທື່ອ** ເທົ່ານັ້ນ — ເຊັ່ນ ລາຍການປະເພດ,
 * ຍີ່ຫໍ້, ຝ່າຍ/ພະແນກ/ໜ່ວຍງານ, ລາຍຊື່ພະນັກງານ. ໜ້າໜຶ່ງເອີ້ນ 4–6 query
 * ເຊິ່ງເຄິ່ງໜຶ່ງເປັນຂໍ້ມູນແບບນີ້ ຈຶ່ງຕັດ round trip ໄປ DB ອອກໄດ້ຫຼາຍ.
 *
 * ຢ່າໃຊ້ກັບຂໍ້ມູນທຸລະກຳ (ticket, ການຢືມ) ເພາະຕ້ອງເຫັນຂອງໃໝ່ທັນທີ.
 */
type Entry = { value: unknown; expiresAt: number }

const store = new Map<string, Entry>()

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>
): Promise<T> {
  const hit = store.get(key)
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value as T
  }

  const value = await load()
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
  return value
}

/** ລຶບ cache ທີ່ຂຶ້ນຕົ້ນດ້ວຍ prefix — ເອີ້ນຫຼັງແກ້ຂໍ້ມູນອ້າງອີງ */
export function invalidate(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
