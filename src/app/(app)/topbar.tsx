'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ICON, PAGE_TITLES } from './nav-config'
import ThemeToggle from '@/components/theme-toggle'
import type { ItStaff } from '@/lib/auth/roles'
import { ROLE_LABEL_LO } from '@/lib/auth/roles'

function Icon({ d, className = 'size-[18px]' }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} shrink-0`}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

/** ຫົວຂໍ້ + breadcrumb ຄິດຈາກ path ປັດຈຸບັນ */
function describe(pathname: string) {
  if (PAGE_TITLES[pathname]) {
    return { title: PAGE_TITLES[pathname], trail: [] as string[] }
  }

  // ໜ້າລາຍລະອຽດ ເຊັ່ນ /tickets/12 ຫຼື /kb/3/edit
  const segments = pathname.split('/').filter(Boolean)
  const parent = `/${segments[0]}`
  const parentTitle = PAGE_TITLES[parent] ?? parent

  if (segments.length >= 3 && segments[2] === 'edit') {
    return { title: 'ແກ້ໄຂ', trail: [parentTitle] }
  }
  if (segments.length >= 2) {
    return { title: 'ລາຍລະອຽດ', trail: [parentTitle] }
  }
  return { title: parentTitle, trail: [] }
}

/**
 * ແຖບເທິງແບບ Odoo — ສອງຊັ້ນ
 *
 * 1. navbar ສີເຂັ້ມ: ຊື່ລະບົບ ແລະ ເຄື່ອງມືປະຈຳຕົວ (ແຈ້ງເຕືອນ, ຜູ້ໃຊ້)
 * 2. control panel ສີຂາວ: breadcrumb + ຫົວຂໍ້ໜ້າ ແລະ ຊ່ອງຄົ້ນຫາ
 *
 * ແຍກສອງຊັ້ນຕາມ Odoo ເພາະຄົນລະໜ້າທີ່ — ຊັ້ນເທິງບໍ່ປ່ຽນຕາມໜ້າ
 * ຊັ້ນລຸ່ມບອກວ່າກຳລັງຢູ່ໃສ ແລະ ເຮັດຫຍັງກັບຂໍ້ມູນຊຸດນີ້ໄດ້
 */
export default function Topbar({
  user,
  unread,
}: {
  user: ItStaff
  unread: number
}) {
  const pathname = usePathname()
  const { title, trail } = describe(pathname)

  return (
    <>
      <header className="o-navbar sticky top-0 z-30 flex h-11 shrink-0 items-center gap-1 px-2 sm:px-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded px-2 py-1 text-sm font-semibold tracking-tight hover:bg-white/10"
        >
          ODIEN <span className="font-normal opacity-70">IT</span>
        </Link>

        <div className="ml-auto flex items-center gap-0.5">
          <Link
            href="/notifications"
            aria-label={`ການແຈ້ງເຕືອນ${unread ? ` — ຍັງບໍ່ໄດ້ອ່ານ ${unread}` : ''}`}
            className="relative flex size-8 items-center justify-center rounded hover:bg-white/10"
          >
            <Icon d={ICON.bell} />
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 flex min-w-[16px] items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>

          <ThemeToggle variant="navbar" />

          <span className="user-chip flex items-center gap-2 rounded px-1.5 py-1">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
              {(user.nickname ?? user.fullname_lo).slice(0, 1)}
            </span>
            {/* ຊື່ເຕັມພ້ອມໜ່ວຍງານຍາວກວ່າທີ່ຫົວໜ້າຈໍມີ — ສະແດງເມື່ອກວ້າງພໍ */}
            <span className="hidden max-w-[11rem] truncate text-xs leading-tight lg:block">
              {user.fullname_lo}
              <span className="block truncate opacity-70">
                {ROLE_LABEL_LO[user.role]}
                {user.unit_name_lo && ` · ${user.unit_name_lo}`}
              </span>
            </span>
          </span>
        </div>
      </header>

      <div className="o-control-panel sticky top-11 z-20 flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 sm:px-4">
        <div className="flex min-w-0 items-baseline gap-1.5">
          {trail.length > 0 || pathname !== '/' ? (
            <Link
              href="/"
              className="hidden text-xs text-muted underline-offset-2 hover:underline sm:inline"
            >
              ໜ້າຫຼັກ
            </Link>
          ) : null}
          {trail.map((crumb) => (
            <span key={crumb} className="hidden items-baseline gap-1.5 sm:flex">
              <span className="text-faint">/</span>
              <span className="text-xs text-muted">{crumb}</span>
            </span>
          ))}
          {(trail.length > 0 || pathname !== '/') && (
            <span className="hidden text-faint sm:inline">/</span>
          )}
          <h1 className="truncate text-base font-semibold text-fg">{title}</h1>
        </div>

        <form action="/search" className="relative ml-auto hidden sm:block">
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint">
            <Icon d={ICON.search} className="size-4" />
          </span>
          <input
            name="q"
            type="search"
            placeholder="ຄົ້ນຫາທົ່ວລະບົບ…"
            aria-label="ຄົ້ນຫາທົ່ວລະບົບ"
            className="input w-44 rounded py-1 pr-2 pl-8 text-sm lg:w-64"
          />
        </form>
      </div>
    </>
  )
}
