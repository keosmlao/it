'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo, useState, useSyncExternalStore } from 'react'
import { NAV_GROUPS, type NavItem } from './nav-config'
import ThemeToggle from '@/components/theme-toggle'
import type { ItStaff } from '@/lib/auth/roles'
import { EMPTY_BADGES, type NavBadges } from '@/lib/nav-badges-model'

const COLLAPSE_KEY = 'odg-it:sidebar-collapsed'

/**
 * ຈື່ການຫຍໍ້ເມນູໄວ້ຂ້າມການໂຫຼດ.
 *
 * ໃຊ້ useSyncExternalStore ແທນ useState + useEffect ເພາະ localStorage
 * ບໍ່ມີຢູ່ຝັ່ງເຊີບເວີ — ວິທີນີ້ບອກ React ໄດ້ວ່າຄ່າຝັ່ງເຊີບເວີແມ່ນ false
 * ຈຶ່ງບໍ່ເກີດ hydration mismatch ແລະ ບໍ່ຕ້ອງ setState ໃນ effect
 */
const collapseStore = {
  listeners: new Set<() => void>(),
  subscribe(listener: () => void) {
    collapseStore.listeners.add(listener)
    return () => collapseStore.listeners.delete(listener)
  },
  get: () => globalThis.localStorage?.getItem(COLLAPSE_KEY) === '1',
  serverGet: () => false,
  toggle() {
    localStorage.setItem(COLLAPSE_KEY, collapseStore.get() ? '0' : '1')
    collapseStore.listeners.forEach((listener) => listener())
  },
}

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

/** ເສັ້ນທາງທີ່ບໍ່ມີ query string — ໃຊ້ທຽບກັບ pathname ປັດຈຸບັນ */
function basePath(href: string) {
  return href.split('?')[0]
}

/** ໜ້າປັດຈຸບັນຢູ່ພາຍໃຕ້ເສັ້ນທາງນີ້ບໍ (ທຽບເປັນສ່ວນໆ ບໍ່ແມ່ນຕົວອັກສອນ) */
function covers(pathname: string, href: string) {
  const base = basePath(href)
  if (base === '/') return pathname === '/'
  return pathname === base || pathname.startsWith(base + '/')
}

export default function Sidebar({
  user,
  badges = EMPTY_BADGES,
}: {
  user: ItStaff
  badges?: NavBadges
}) {
  const pathname = usePathname()
  const search = useSearchParams()
  const collapsed = useSyncExternalStore(
    collapseStore.subscribe,
    collapseStore.get,
    collapseStore.serverGet
  )

  /**
   * ໄຮໄລທ໌ແຖວດຽວເທົ່ານັ້ນ: ເອົາເສັ້ນທາງທີ່ "ເຈາະຈົງທີ່ສຸດ" ທີ່ກົງກັບໜ້າປັດຈຸບັນ.
   * ຖ້າທຽບແບບ startsWith ເສີຍໆ ເປີດ /assets/movements ແລ້ວ /assets ຈະສະຫວ່າງນຳ
   */
  const activePath = useMemo(() => {
    const all = NAV_GROUPS.flatMap((g) =>
      g.items.flatMap((i) => [i.href, ...(i.children?.map((c) => c.href) ?? [])])
    ).map(basePath)

    return all.filter((p) => covers(pathname, p)).sort((a, b) => b.length - a.length)[0]
  }, [pathname])

  // ເປີດເມນູຍ່ອຍໄວ້ຖ້າໜ້າປັດຈຸບັນຢູ່ໃນນັ້ນ — ບໍ່ດັ່ງນັ້ນຜູ້ໃຊ້ຈະບໍ່ເຫັນວ່າຕົນຢູ່ໃສ
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    NAV_GROUPS.flatMap((g) => g.items)
      .filter(
        (i) =>
          i.children?.length &&
          (covers(pathname, i.href) ||
            i.children.some((child) => covers(pathname, child.href)))
      )
      .map((i) => i.href)
  )

  const isActive = (href: string) => basePath(href) === activePath

  /** ເມນູຍ່ອຍ: ຕ້ອງກົງທັງເສັ້ນທາງ ແລະ ຕົວກັ່ນຕອງໃນ query string */
  const isChildActive = (href: string) => {
    if (basePath(href) !== activePath) return false

    const queryString = href.split('?')[1]
    if (!queryString) {
      const siblingKeys = new Set(
        NAV_GROUPS.flatMap((g) => g.items)
          .flatMap((i) => i.children ?? [])
          .filter((c) => basePath(c.href) === basePath(href) && c.href.includes('?'))
          .flatMap((c) => [...new URLSearchParams(c.href.split('?')[1]).keys()])
      )
      return [...siblingKeys].every((k) => !search.get(k))
    }

    return [...new URLSearchParams(queryString).entries()].every(
      ([k, v]) => search.get(k) === v
    )
  }

  return (
    <aside
      className={`sidebar-shell sticky top-0 hidden h-screen shrink-0 flex-col transition-[width] duration-200 md:flex ${
        collapsed ? 'w-[68px]' : 'w-72'
      }`}
    >
      {/* ---------- ໂລໂກ້ ---------- */}
      <div className="sidebar-divider flex items-center gap-2.5 border-b px-3 py-2.5">
        <Link
          href="/"
          title="ໜ້າພາບລວມ"
          className="brand-gradient-cool flex size-8 shrink-0 items-center justify-center rounded text-xs font-bold text-white"
        >
          IT
        </Link>
        {!collapsed && (
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold text-fg">
              ODIEN Group
            </span>
            <span className="sidebar-label block text-[11px] font-medium tracking-wider uppercase">
              IT Console
            </span>
          </span>
        )}
        <button
          type="button"
          onClick={collapseStore.toggle}
          aria-label={collapsed ? 'ຂະຫຍາຍເມນູ' : 'ຫຍໍ້ເມນູ'}
          title={collapsed ? 'ຂະຫຍາຍເມນູ' : 'ຫຍໍ້ເມນູ'}
          className={`sidebar-link flex size-7 shrink-0 items-center justify-center rounded-lg ${
            collapsed ? 'absolute top-4 right-2 opacity-0 hover:opacity-100 focus:opacity-100' : ''
          }`}
        >
          <Icon d={collapsed ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'} className="size-4" />
        </button>
      </div>

      {/* ---------- ເມນູ ---------- */}
      <nav className="flex-1 overflow-x-hidden overflow-y-auto px-2.5 pb-3">
        {NAV_GROUPS.map((group, index) => {
          const items = group.items.filter((i) => !i.visible || i.visible(user))
          if (items.length === 0) return null

          return (
            <div key={group.title ?? index} className="mb-4">
              {group.title &&
                (collapsed ? (
                  index > 0 && <div className="sidebar-divider mx-2 mb-2 border-t" />
                ) : (
                  <p className="sidebar-label px-3 pb-1.5 text-[11px] font-semibold tracking-wider uppercase">
                    {group.title}
                  </p>
                ))}

              <div className="flex flex-col gap-0.5">
                {items.map((item) => {
                  // ຖ້າເມນູຍ່ອຍອັນໃດອັນໜຶ່ງກົງກັບໜ້າປັດຈຸບັນແທ້ ໃຫ້ເນັ້ນອັນນັ້ນ
                  const childActive =
                    item.children?.some((c) => isChildActive(c.href)) ?? false

                  return (
                    <NavRow
                      key={item.href}
                      item={item}
                      user={user}
                      badges={badges}
                      collapsed={collapsed}
                      active={isActive(item.href) && !childActive}
                      within={
                        childActive || (!isActive(item.href) && covers(pathname, item.href))
                      }
                      open={openGroups.includes(item.href)}
                      onToggle={() =>
                        setOpenGroups((open) =>
                          open.includes(item.href)
                            ? open.filter((h) => h !== item.href)
                            : [...open, item.href]
                        )
                      }
                      isChildActive={isChildActive}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="sidebar-divider flex items-center justify-between border-t px-3 py-3">
        {!collapsed && <span className="sidebar-label text-xs">© ODG IT</span>}
        <ThemeToggle variant="sidebar" />
      </div>
    </aside>
  )
}

/** ຕົວເລກທ້າຍແຖວ — ສີແດງເມື່ອເປັນເລື່ອງດ່ວນ */
function Badge({
  count,
  urgent,
  active,
  dot,
}: {
  count: number
  urgent?: boolean
  active?: boolean
  dot?: boolean
}) {
  if (count <= 0) return null

  if (dot) {
    return (
      <span
        aria-hidden="true"
        className={`absolute top-1.5 right-1.5 size-2 rounded-full ${
          urgent ? 'bg-red-500' : 'bg-brand-orange'
        }`}
      />
    )
  }

  return (
    <span
      className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
        urgent
          ? 'bg-red-500 text-white'
          : active
            ? 'bg-brand-blue text-white'
            : 'bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/20 dark:text-brand-sky'
      }`}
    >
      {count > 999 ? '999+' : count}
    </span>
  )
}

function NavRow({
  item,
  user,
  badges,
  collapsed,
  active,
  within,
  open,
  onToggle,
  isChildActive,
}: {
  item: NavItem
  user: ItStaff
  badges: NavBadges
  collapsed: boolean
  active: boolean
  /** ໜ້າປັດຈຸບັນຢູ່ໃນເມນູຍ່ອຍຂອງແຖວນີ້ — ເນັ້ນເບົາໆ ບໍ່ແມ່ນເນັ້ນເຕັມ */
  within: boolean
  open: boolean
  onToggle: () => void
  isChildActive: (href: string) => boolean
}) {
  const children = item.children?.filter((c) => !c.visible || c.visible(user)) ?? []
  const hasChildren = children.length > 0 && !collapsed

  // ຕົວເລກຂອງແຖວແມ່ = ຂອງຕົນເອງ ຫຼື ລວມຂອງລູກ (ຕອນຍັບໄວ້ຈະໄດ້ບໍ່ເສຍຂໍ້ມູນ)
  const ownCount = item.badge ? badges[item.badge] : 0
  const childCount = children.reduce(
    (sum, c) => sum + (c.badge ? badges[c.badge] : 0),
    0
  )
  const rowCount = open && !collapsed ? ownCount : ownCount + childCount
  const rowUrgent = item.urgent || children.some((c) => c.urgent && c.badge && badges[c.badge] > 0)

  return (
    <div>
      <div className="flex items-center gap-1">
        <Link
          href={item.href}
          data-active={active ? 'true' : undefined}
          title={collapsed ? item.label : undefined}
          className={`sidebar-link relative flex min-w-0 flex-1 items-center gap-2.5 rounded px-3 py-1.5 text-sm ${
            collapsed ? 'justify-center' : ''
          } ${within ? 'font-medium text-fg' : ''}`}
        >
          <Icon d={item.icon} />
          {!collapsed && <span className="truncate">{item.label}</span>}
          <Badge
            count={rowCount}
            urgent={rowUrgent}
            active={active}
            dot={collapsed}
          />
        </Link>

        {hasChildren && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={`${open ? 'ຍຸບ' : 'ຂະຫຍາຍ'} ${item.label}`}
            className="sidebar-link flex size-8 shrink-0 items-center justify-center rounded-lg"
          >
            <Icon
              d="M9 6l6 6-6 6"
              className={`size-4 transition-transform ${open ? 'rotate-90' : ''}`}
            />
          </button>
        )}
      </div>

      {hasChildren && open && (
        <div className="sidebar-divider mt-0.5 ml-5 flex flex-col gap-0.5 border-l pl-2">
          {children.map((child) => {
            const count = child.badge ? badges[child.badge] : 0
            const childIsActive = isChildActive(child.href)
            return (
              <Link
                key={child.href}
                href={child.href}
                data-active={childIsActive ? 'true' : undefined}
                className="sidebar-link flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px]"
              >
                <Icon d={child.icon} className="size-4 opacity-70" />
                <span className="truncate">{child.label}</span>
                <Badge count={count} urgent={child.urgent} active={childIsActive} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
