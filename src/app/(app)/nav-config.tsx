import { can, type ItStaff } from '@/lib/auth/roles'

export type NavItem = {
  href: string
  label: string
  icon: string
  /** undefined = ເຫັນໄດ້ທຸກ role */
  visible?: (user: ItStaff) => boolean
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
} as const

/** ໂຄງສ້າງເມນູຂອງລະບົບ — ໃຊ້ຮ່ວມກັນລະຫວ່າງ sidebar ແລະ breadcrumb */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'ສູນຄວບຄຸມ',
    items: [
      { href: '/', label: 'ພາບລວມ', icon: ICON.home },
      { href: '/tasks', label: 'ວຽກຂອງຂ້ອຍ', icon: ICON.task },
      {
        href: '/plans',
        label: 'ແຜນວຽກປະຈຳວັນ',
        icon: ICON.clock,
        children: [
          { href: '/plans', label: 'ແຜນຂອງຂ້ອຍ', icon: ICON.list },
          {
            href: '/plans/team',
            label: 'ແຜນທັງທີມ',
            icon: ICON.chart,
            visible: can.viewReports,
          },
        ],
      },
      { href: '/notifications', label: 'ການແຈ້ງເຕືອນ', icon: ICON.bell },
    ],
  },
  {
    title: 'ບໍລິການ & ຄຳຮ້ອງ',
    items: [
      {
        href: '/tickets',
        label: 'Ticket ແຈ້ງບັນຫາ',
        icon: ICON.ticket,
        children: [
          { href: '/tickets', label: 'ລາຍການທັງໝົດ', icon: ICON.list },
          { href: '/tickets?status=open&mine=1', label: 'ຂອງຂ້ອຍ', icon: ICON.list },
          { href: '/tickets/new', label: 'ແຈ້ງບັນຫາໃໝ່', icon: ICON.plus },
        ],
      },
      {
        href: '/requests',
        label: 'ຄຳຮ້ອງ & ອະນຸມັດ',
        icon: ICON.request,
        children: [
          { href: '/requests', label: 'ລາຍການຄຳຮ້ອງ', icon: ICON.list },
          { href: '/requests/new', label: 'ສ້າງຄຳຮ້ອງ', icon: ICON.plus },
        ],
      },
      {
        href: '/purchase',
        label: 'ໃບສະເໜີຊື້ (PR)',
        icon: ICON.request,
        children: [
          { href: '/purchase', label: 'ລາຍການໃບສະເໜີຊື້', icon: ICON.list },
          { href: '/purchase?status=all&mine=1', label: 'ຂອງຂ້ອຍ', icon: ICON.list },
          { href: '/purchase/new', label: 'ສ້າງໃບສະເໜີຊື້', icon: ICON.plus },
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
          { href: '/projects', label: 'ລາຍການໂປຣເຈັກ', icon: ICON.list },
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
    title: 'ອຸປະກອນ & ຄວາມຮູ້',
    items: [
      {
        href: '/assets',
        label: 'ທະບຽນອຸປະກອນ',
        icon: ICON.asset,
        children: [
          { href: '/assets', label: 'ທັງໝົດ', icon: ICON.list },
          { href: '/assets?holding=assigned', label: 'ມີຜູ້ຖືຄອງ', icon: ICON.task },
          { href: '/assets?holding=spare', label: 'ຢູ່ໃນສາງ', icon: ICON.asset },
          { href: '/assets?holding=it', label: 'ຂອງພະແນກ IT', icon: ICON.settings },
          { href: '/assets/lend', label: 'ອອກໃບຢືມ–ຄືນ', icon: ICON.plus },
          { href: '/assets/documents', label: 'ເອກະສານຢືມ–ຄືນ', icon: ICON.request },
          { href: '/assets/holders', label: 'ຜູ້ຖືຄອງ', icon: ICON.request },
          { href: '/assets/movements', label: 'ປະຫວັດຢືມ–ຄືນ', icon: ICON.clock },
          { href: '/assets/survey', label: 'ສຳຫຼວດອຸປະກອນ', icon: ICON.search },
          { href: '/assets/recovery', label: 'ທວງຄືນອຸປະກອນ', icon: ICON.bell },
        ],
      },
      {
        href: '/assets/holders',
        label: 'ຜູ້ຖືຄອງອຸປະກອນ',
        icon: ICON.request,
      },
      {
        href: '/assets/recovery',
        label: 'ທວງຄືນອຸປະກອນ',
        icon: ICON.bell,
      },
      {
        href: '/assets/movements',
        label: 'ປະຫວັດຢືມ–ຄືນ',
        icon: ICON.clock,
      },
      { href: '/kb', label: 'ຄັງຄວາມຮູ້', icon: ICON.book },
    ],
  },
  {
    title: 'ບໍລິຫານ',
    items: [
      { href: '/reports', label: 'ລາຍງານ', icon: ICON.chart, visible: can.viewReports },
      {
        href: '/admin',
        label: 'ຕັ້ງຄ່າລະບົບ',
        icon: ICON.settings,
        visible: can.administer,
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
  '/plans': 'ແຜນວຽກປະຈຳວັນ',
  '/plans/team': 'ແຜນວຽກທັງທີມ',
  '/assets': 'ອຸປະກອນ',
  '/assets/movements': 'ປະຫວັດຢືມ–ຄືນ',
  '/assets/lend': 'ບັນທຶກການຢືມ–ຄືນ',
  '/assets/documents': 'ເອກະສານຢືມ–ຄືນ',
  '/assets/holders': 'ຜູ້ຖືຄອງອຸປະກອນ',
  '/assets/survey': 'ສຳຫຼວດອຸປະກອນ',
  '/assets/recovery': 'ທວງຄືນອຸປະກອນ',
  '/kb': 'ຄັງຄວາມຮູ້',
  '/kb/new': 'ຂຽນບົດຄວາມ',
  '/reports': 'ລາຍງານ',
  '/notifications': 'ການແຈ້ງເຕືອນ',
  '/admin': 'ຕັ້ງຄ່າລະບົບ',
}
