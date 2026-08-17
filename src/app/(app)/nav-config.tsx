import { can, type ItStaff } from '@/lib/auth/roles'
import type { NavBadges } from '@/lib/nav-badges-model'

export type NavItem = {
  href: string
  label: string
  icon: string
  /** undefined = ເຫັນໄດ້ທຸກ role */
  visible?: (user: ItStaff) => boolean
  /** ຕົວເລກທີ່ສະແດງຂ້າງຊື່ — ບອກວ່າມີເທົ່າໃດລໍຢູ່ */
  badge?: keyof NavBadges
  /** ຕົວເລກນີ້ເປັນເລື່ອງດ່ວນ (ສະແດງເປັນສີແດງ) */
  urgent?: boolean
  children?: NavItem[]
}

export type NavGroup = { title?: string; items: NavItem[] }

/** ເສັ້ນທາງໄອຄອນເສັ້ນບາງ 24×24 */
export const ICON = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5',
  ticket: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4V7Zm10 0v10',
  task: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  project: 'M3 7h6l2 2h10v10H3V7Z',
  request: 'M8 4h8l3 3v13H5V4h3Zm0 0v3h8M8 12h8M8 16h5',
  asset: 'M4 6h16v10H4V6Zm4 14h8m-4-4v4',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15ZM4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5Z',
  chart: 'M4 20V10m5 10V4m5 16v-7m5 7V8',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3-2.1-.6a6 6 0 0 0-.6-1.5l1-1.9-1.8-1.8-1.9 1a6 6 0 0 0-1.5-.6L12.6 4h-2.5l-.6 2.1a6 6 0 0 0-1.5.6l-1.9-1L4.3 7.5l1 1.9a6 6 0 0 0-.6 1.5L2.6 11.5v2.5l2.1.6a6 6 0 0 0 .6 1.5l-1 1.9 1.8 1.8 1.9-1a6 6 0 0 0 1.5.6l.6 2.1h2.5l.6-2.1a6 6 0 0 0 1.5-.6l1.9 1 1.8-1.8-1-1.9a6 6 0 0 0 .6-1.5L20 14v-2Z',
  bell: 'M18 9a6 6 0 0 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M13.7 20a2 2 0 0 1-3.4 0',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5.5-1.5L21 21',
  plus: 'M12 5v14M5 12h14',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  logout: 'M15 17l5-5-5-5M20 12H9M12 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6',
  swap: 'M7 8h13l-3-3M17 16H4l3 3',
  warning: 'M12 9v4m0 4h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  network: 'M12 3v6M5 21v-4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M9 3h6v6H9zM3 21h4M17 21h4',
  box: 'M3 8.5 12 4l9 4.5v7L12 20l-9-4.5v-7ZM3 8.5 12 13m0 0 9-4.5M12 13v7',
  cloud: 'M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.1 9.2 3.5 3.5 0 0 0 7 18Z',
  wrench:
    'M14.7 6.3a4 4 0 0 0 5 5l-8.4 8.4a2.1 2.1 0 0 1-3-3l8.4-8.4a4 4 0 0 0-2-2Z',
  key: 'M14 7a4 4 0 1 1-3.9 5H8v2H6v2H3v-3l7.1-7.1A4 4 0 0 1 14 7Zm2.5 2.5h.01',
  people:
    'M16 20v-2a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v2M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 20v-2a3 3 0 0 0-2.2-2.9M15.5 4.2a3.5 3.5 0 0 1 0 6.6',
  wallet: 'M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 0V6a2 2 0 0 1 2-2h11m0 9h2',
} as const

/**
 * ໂຄງສ້າງເມນູ — ຈັດຕາມ "ວຽກທີ່ເຮັດ" ບໍ່ແມ່ນຕາມຊື່ໜ້າ
 *
 * ອອກແບບໃໝ່ເພາະລາຍການໃຫຍ່ໃນກຸ່ມອຸປະກອນຂຶ້ນເຖິງ 9 ແຖວ ຈົນຫາບໍ່ພົບ.
 * ດຽວນີ້ຮວມເປັນ 3 ຫົວຂໍ້ (ທະບຽນ / ຢືມ–ຄືນ / ສະພາບ & ຕິດຕາມ)
 * ແລະ ໃສ່ຕົວເລກໄວ້ຂ້າງອັນທີ່ຕ້ອງເບິ່ງກ່ອນ
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'ສູນຄວບຄຸມ',
    items: [
      { href: '/', label: 'ພາບລວມ', icon: ICON.home },
      { href: '/tasks', label: 'ວຽກຂອງຂ້ອຍ', icon: ICON.task, badge: 'myWork' },
      {
        href: '/plans',
        label: 'ແຜນວຽກປະຈຳວັນ',
        icon: ICON.clock,
        children: [
          {
            href: '/plans/team',
            label: 'ແຜນທັງທີມ',
            icon: ICON.chart,
            visible: can.viewReports,
          },
        ],
      },
      {
        href: '/notifications',
        label: 'ການແຈ້ງເຕືອນ',
        icon: ICON.bell,
        badge: 'notifications',
      },
    ],
  },
  {
    title: 'ບໍລິການ & ຄຳຮ້ອງ',
    items: [
      {
        href: '/tickets',
        label: 'Ticket ແຈ້ງບັນຫາ',
        icon: ICON.ticket,
        badge: 'tickets',
        children: [
          { href: '/tickets?status=open&mine=1', label: 'ຂອງຂ້ອຍ', icon: ICON.task },
          { href: '/tickets?status=all&overdue=1', label: 'ເກີນ SLA', icon: ICON.warning },
          { href: '/tickets/new', label: 'ແຈ້ງບັນຫາໃໝ່', icon: ICON.plus },
        ],
      },
      {
        href: '/requests',
        label: 'ຄຳຮ້ອງ & ອະນຸມັດ',
        icon: ICON.request,
        badge: 'requests',
        children: [{ href: '/requests/new', label: 'ສ້າງຄຳຮ້ອງ', icon: ICON.plus }],
      },
      {
        href: '/purchase',
        label: 'ໃບສະເໜີຊື້ (PR)',
        icon: ICON.request,
        badge: 'purchase',
        children: [
          { href: '/purchase?status=all&mine=1', label: 'ຂອງຂ້ອຍ', icon: ICON.task },
          { href: '/purchase/new', label: 'ສ້າງໃບສະເໜີຊື້', icon: ICON.plus },
        ],
      },
    ],
  },
  {
    title: 'ໂຄງລ່າງ & ບໍລິການ',
    items: [
      {
        href: '/subscriptions',
        label: 'ຄ່າເຊົ່າບໍລິການ',
        icon: ICON.cloud,
        // ຂາດຕໍ່ອາຍຸ = ບໍລິການລົ້ມ ຈຶ່ງໃຫ້ຕົວເລກເປັນສີແດງຄືກັບເລື່ອງດ່ວນອື່ນ
        badge: 'subscriptions',
        urgent: true,
        children: [
          { href: '/subscriptions?due=soon', label: 'ໃກ້ຮອດກຳນົດ', icon: ICON.bell },
          { href: '/subscriptions/cost', label: 'ຄ່າໃຊ້ຈ່າຍ', icon: ICON.chart },
          {
            href: '/subscriptions/new',
            label: 'ລົງທະບຽນການເຊົ່າ',
            icon: ICON.plus,
            visible: can.manageSubscriptions,
          },
        ],
      },
      {
        href: '/maintenance',
        label: 'ບຳລຸງຮັກສາຕາມແຜນ',
        icon: ICON.wrench,
        badge: 'maintenance',
        urgent: true,
        children: [
          { href: '/maintenance?due=soon', label: 'ຮອດກຳນົດ', icon: ICON.bell },
          {
            href: '/maintenance/new',
            label: 'ຕັ້ງແຜນ',
            icon: ICON.plus,
            visible: can.manageAssets,
          },
        ],
      },
      {
        href: '/incidents',
        label: 'ເຫດຂັດຂ້ອງລະບົບ',
        icon: ICON.warning,
        badge: 'incidents',
        urgent: true,
        children: [
          {
            href: '/incidents/new',
            label: 'ບັນທຶກເຫດຂັດຂ້ອງ',
            icon: ICON.plus,
            visible: can.manageAssets,
          },
        ],
      },
      {
        href: '/network',
        label: 'ເຄືອຂ່າຍ & IP',
        icon: ICON.network,
        children: [{ href: '/network/ports', label: 'ຜັງພອດສະວິດ', icon: ICON.swap }],
      },
      { href: '/vendors', label: 'ທະບຽນຜູ້ຂາຍ', icon: ICON.box },
    ],
  },
  {
    title: 'ອຸປະກອນ',
    items: [
      {
        href: '/assets',
        label: 'ທະບຽນອຸປະກອນ',
        icon: ICON.asset,
        children: [
          { href: '/assets?holding=assigned', label: 'ມີຜູ້ຖືຄອງ', icon: ICON.task },
          { href: '/assets?holding=spare', label: 'ຢູ່ໃນສາງ', icon: ICON.box },
          { href: '/assets?holding=it', label: 'ຂອງພະແນກ IT', icon: ICON.settings },
          { href: '/assets/new', label: 'ລົງທະບຽນຊັບສິນ', icon: ICON.plus },
        ],
      },
      {
        href: '/assets/lend',
        label: 'ຢືມ–ຄືນ',
        icon: ICON.swap,
        children: [
          { href: '/assets/holders', label: 'ຜູ້ຖືຄອງອຸປະກອນ', icon: ICON.task },
          { href: '/assets/documents', label: 'ເອກະສານຢືມ–ຄືນ', icon: ICON.request },
          { href: '/assets/movements', label: 'ປະຫວັດຢືມ–ຄືນ', icon: ICON.clock },
        ],
      },
      {
        href: '/assets/damaged',
        label: 'ສະພາບ & ຕິດຕາມ',
        icon: ICON.warning,
        badge: 'damaged',
        urgent: true,
        children: [
          {
            href: '/assets/recovery',
            label: 'ທວງຄືນອຸປະກອນ',
            icon: ICON.bell,
            badge: 'recovery',
            urgent: true,
          },
          {
            href: '/assets/conflicts',
            label: 'ໃບຢືມທີ່ຂັດກັນ',
            icon: ICON.warning,
            badge: 'conflicts',
            urgent: true,
          },
          { href: '/assets/deployed', label: 'ອຸປະກອນສ່ວນກາງ', icon: ICON.network },
          { href: '/assets/survey', label: 'ສຳຫຼວດອຸປະກອນ', icon: ICON.search },
          {
            href: '/assets/replacement',
            label: 'ແຜນປ່ຽນເຄື່ອງ',
            icon: ICON.swap,
          },
        ],
      },
      {
        href: '/consumables',
        label: 'ອຸປະກອນສິ້ນເປືອງ',
        icon: ICON.box,
        badge: 'consumables',
        children: [
          { href: '/consumables?state=low', label: 'ໃກ້ໝົດ / ໝົດ', icon: ICON.warning },
          {
            href: '/consumables/new',
            label: 'ເພີ່ມລາຍການ',
            icon: ICON.plus,
            visible: can.manageAssets,
          },
        ],
      },
    ],
  },
  {
    title: 'ໂປຣເຈັກ & ເວລາ',
    items: [
      {
        href: '/projects',
        label: 'ໂປຣເຈັກ',
        icon: ICON.project,
        children: [
          {
            href: '/projects/new',
            label: 'ສ້າງໂປຣເຈັກ',
            icon: ICON.plus,
            visible: can.assignWork,
          },
        ],
      },
      { href: '/worklogs', label: 'ບັນທຶກຊົ່ວໂມງ', icon: ICON.clock },
    ],
  },
  {
    title: 'ຄວາມຮູ້ & ບໍລິຫານ',
    items: [
      { href: '/kb', label: 'ຄັງຄວາມຮູ້', icon: ICON.book },
      {
        href: '/accounts',
        label: 'ບັນຊີຜູ້ໃຊ້',
        icon: ICON.key,
        // ບັນຊີຄ້າງເປີດຂອງຄົນທີ່ອອກໄປແລ້ວ = ຮູຮົ່ວຄວາມປອດໄພ + ຈ່າຍ seat ລົມ
        badge: 'accounts',
        urgent: true,
        children: [
          {
            href: '/accounts?state=closable&status=all',
            label: 'ບັນຊີທີ່ຄວນປິດ',
            icon: ICON.warning,
          },
          {
            href: '/accounts/systems',
            label: 'ລະບົບທີ່ມີບັນຊີ',
            icon: ICON.settings,
            visible: can.manageAccounts,
          },
        ],
      },
      {
        href: '/budget',
        label: 'ງົບປະມານ',
        icon: ICON.wallet,
        visible: can.viewReports,
      },
      { href: '/reports', label: 'ລາຍງານ', icon: ICON.chart, visible: can.viewReports },
      {
        href: '/admin',
        label: 'ຕັ້ງຄ່າລະບົບ',
        icon: ICON.settings,
        visible: can.administer,
        children: [
          {
            href: '/admin/security',
            label: 'ກວດຄວາມປອດໄພ',
            icon: ICON.warning,
            visible: can.administer,
          },
          {
            href: '/admin/emails',
            label: 'ອີເມວແຈ້ງເຕືອນ',
            icon: ICON.bell,
            visible: can.administer,
          },
        ],
      },
    ],
  },
]

/** ຫົວຂໍ້ໜ້າຕາມ path — ໃຊ້ໃນ topbar */
export const PAGE_TITLES: Record<string, string> = {
  '/': 'ພາບລວມ',
  '/tickets': 'Ticket ແຈ້ງບັນຫາ',
  '/tickets/new': 'ແຈ້ງບັນຫາໃໝ່',
  '/tasks': 'ວຽກຂອງຂ້ອຍ',
  '/worklogs': 'ບັນທຶກຊົ່ວໂມງ',
  '/projects': 'ໂປຣເຈັກພັດທະນາ',
  '/projects/new': 'ສ້າງໂປຣເຈັກ',
  '/requests': 'ຄຳຮ້ອງ & ອະນຸມັດ',
  '/requests/new': 'ສ້າງຄຳຮ້ອງ',
  '/purchase': 'ໃບສະເໜີຊື້ (PR)',
  '/purchase/new': 'ສ້າງໃບສະເໜີຊື້',
  '/subscriptions': 'ຄ່າເຊົ່າບໍລິການ',
  '/subscriptions/new': 'ລົງທະບຽນການເຊົ່າ',
  '/subscriptions/cost': 'ຄ່າໃຊ້ຈ່າຍການເຊົ່າ',
  '/maintenance': 'ບຳລຸງຮັກສາຕາມແຜນ',
  '/maintenance/new': 'ຕັ້ງແຜນບຳລຸງຮັກສາ',
  '/incidents': 'ເຫດຂັດຂ້ອງລະບົບ',
  '/incidents/new': 'ບັນທຶກເຫດຂັດຂ້ອງ',
  '/network': 'ເຄືອຂ່າຍ & IP',
  '/network/ports': 'ຜັງພອດສະວິດ',
  '/vendors': 'ທະບຽນຜູ້ຂາຍ',
  '/vendors/new': 'ເພີ່ມຜູ້ຂາຍ',
  '/consumables': 'ອຸປະກອນສິ້ນເປືອງ',
  '/consumables/new': 'ເພີ່ມອຸປະກອນສິ້ນເປືອງ',
  '/accounts': 'ບັນຊີຜູ້ໃຊ້',
  '/accounts/new': 'ເປີດບັນຊີຜູ້ໃຊ້',
  '/accounts/systems': 'ລະບົບທີ່ມີບັນຊີ',
  '/budget': 'ງົບປະມານ',
  '/search': 'ຄົ້ນຫາ',
  '/assets/replacement': 'ແຜນປ່ຽນເຄື່ອງ',
  '/admin/security': 'ກວດຄວາມປອດໄພ',
  '/admin/emails': 'ອີເມວແຈ້ງເຕືອນ',
  '/plans': 'ແຜນວຽກປະຈຳວັນ',
  '/plans/team': 'ແຜນວຽກທັງທີມ',
  '/assets': 'ອຸປະກອນ',
  '/assets/new': 'ລົງທະບຽນຊັບສິນ',
  '/assets/movements': 'ປະຫວັດຢືມ–ຄືນ',
  '/assets/lend': 'ບັນທຶກການຢືມ–ຄືນ',
  '/assets/documents': 'ເອກະສານຢືມ–ຄືນ',
  '/assets/holders': 'ຜູ້ຖືຄອງອຸປະກອນ',
  '/assets/survey': 'ສຳຫຼວດອຸປະກອນ',
  '/assets/recovery': 'ທວງຄືນອຸປະກອນ',
  '/assets/conflicts': 'ໃບຢືມທີ່ຂັດກັນ',
  '/assets/damaged': 'ອຸປະກອນເພ / ຕັດຈຳໜ່າຍ',
  '/assets/deployed': 'ອຸປະກອນສ່ວນກາງ',
  '/kb': 'ຄັງຄວາມຮູ້',
  '/kb/new': 'ຂຽນບົດຄວາມ',
  '/reports': 'ລາຍງານ',
  '/notifications': 'ການແຈ້ງເຕືອນ',
  '/admin': 'ຕັ້ງຄ່າລະບົບ',
}
