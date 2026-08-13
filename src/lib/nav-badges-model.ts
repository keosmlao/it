/**
 * ຊະນິດ ແລະ ຄ່າວ່າງຂອງຕົວເລກຂ້າງເມນູ.
 *
 * ແຍກອອກຈາກ nav-badges.ts ເພາະໄຟລ໌ນັ້ນ import 'server-only' ແລະ pg —
 * sidebar ກັບ mobile-nav ເປັນ client component ຈຶ່ງ import ໂດຍກົງບໍ່ໄດ້
 */
export type NavBadges = {
  tickets: number
  myWork: number
  requests: number
  purchase: number
  recovery: number
  conflicts: number
  damaged: number
  notifications: number
}

export const EMPTY_BADGES: NavBadges = {
  tickets: 0,
  myWork: 0,
  requests: 0,
  purchase: 0,
  recovery: 0,
  conflicts: 0,
  damaged: 0,
  notifications: 0,
}
