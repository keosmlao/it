/**
 * ຜົນຂອງ server action ທີ່ຜູ້ໃຊ້ອາດເຮັດຜິດພາດໄດ້.
 *
 * ຢ່າ `throw` ຂໍ້ຄວາມແຈ້ງເຕືອນ — Next.js ຈະສະແດງເປັນໜ້າ Runtime Error ເຕັມຈໍ
 * ເຊິ່ງເບິ່ງຄືລະບົບພັງ. ໃຫ້ຄືນ `{ error }` ແລ້ວຟອມຈະສະແດງໄວ້ຂ້າງໆປຸ່ມ.
 * ສະຫງວນ `throw` ໄວ້ສະເພາະກໍລະນີທີ່ບໍ່ຄວນເກີດ (ຂໍ້ມູນເສຍຫາຍ).
 */
/** `message` ໃຊ້ຕອນສຳເລັດແລ້ວມີຂໍ້ມູນທີ່ຜູ້ໃຊ້ຕ້ອງຮູ້ (ເຊັ່ນ ລະຫັດທີ່ອອກໃຫ້) */
export type FormState = { error?: string; ok?: boolean; message?: string }

export const EMPTY_STATE: FormState = {}
