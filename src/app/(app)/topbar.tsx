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
    <header className="glass-heavy sticky top-0 z-20 flex min-h-16 flex-wrap items-center justify-between gap-3 border-x-0 border-t-0 px-3 py-2.5 sm:px-5">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold tracking-tight text-fg sm:text-xl">{title}</h1>
        <p className="hidden items-center gap-1.5 text-xs text-muted sm:flex">
          <Link href="/" className="hover:underline">
            ໜ້າຫຼັກ
          </Link>
          {trail.map((crumb) => (
            <span key={crumb} className="flex items-center gap-1.5">
              <span className="text-faint">›</span>
              {crumb}
            </span>
          ))}
          <span className="text-faint">›</span>
          <span className="text-body">{title}</span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <form action="/search" className="relative hidden sm:block">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint">
            <Icon d={ICON.search} className="size-4" />
          </span>
          <input
            name="q"
            type="search"
            placeholder="ຄົ້ນຫາທົ່ວລະບົບ…"
            aria-label="ຄົ້ນຫາທົ່ວລະບົບ"
            className="input w-40 rounded-full py-2 pr-3 pl-9 text-sm lg:w-56"
          />
        </form>

        <Link
          href="/notifications"
          aria-label={`ການແຈ້ງເຕືອນ${unread ? ` — ຍັງບໍ່ໄດ້ອ່ານ ${unread}` : ''}`}
          className="btn-secondary relative flex size-9 items-center justify-center rounded-full"
        >
          <Icon d={ICON.bell} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        <ThemeToggle />

        <span className="user-chip flex items-center gap-2.5 rounded-full py-1 pr-4 pl-1">
          <span className="brand-gradient-warm flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
            {(user.nickname ?? user.fullname_lo).slice(0, 1)}
          </span>
          {/* ຊື່ເຕັມພ້ອມໜ່ວຍງານຍາວກວ່າທີ່ຫົວໜ້າຈໍມີ — ສະແດງເມື່ອກວ້າງພໍ
              ແລະ ຕັດຫາງເອົາ ບໍ່ດັ່ງນັ້ນດັນລົ້ນອອກນອກຈໍຢູ່ແທັບເລັດ */}
          <span className="hidden max-w-[11rem] leading-tight lg:block">
            <span className="block truncate text-sm font-medium">
              {user.fullname_lo}
            </span>
            <span className="block truncate text-[11px] opacity-70">
              {ROLE_LABEL_LO[user.role]}
              {user.unit_name_lo && ` · ${user.unit_name_lo}`}
            </span>
          </span>
        </span>
      </div>
    </header>
  )
}
