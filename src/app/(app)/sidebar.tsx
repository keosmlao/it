'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { NAV_GROUPS, type NavItem } from './nav-config'
import ThemeToggle from '@/components/theme-toggle'
import type { ItStaff } from '@/lib/auth/roles'

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

export default function Sidebar({ user }: { user: ItStaff }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    NAV_GROUPS.flatMap((g) => g.items)
      .filter((i) => i.children && pathname.startsWith(basePath(i.href)))
      .map((i) => i.href)
  )

  const isActive = (href: string) =>
    basePath(href) === '/' ? pathname === '/' : pathname.startsWith(basePath(href))

  function toggleGroup(href: string) {
    setOpenGroups((open) =>
      open.includes(href) ? open.filter((h) => h !== href) : [...open, href]
    )
  }

  return (
    <aside
      className={`sidebar-shell sticky top-0 hidden h-screen shrink-0 flex-col transition-[width] duration-200 md:flex ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* ໂລໂກ້ + ປຸ່ມຫຍໍ້ */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span className="brand-gradient-cool flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-[0_10px_24px_#2c6fb64d]">
          IT
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-bold text-white">
              ODIEN Group
            </span>
            <span className="sidebar-label block text-[11px] font-medium tracking-wider uppercase">
              IT Console
            </span>
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'ຂະຫຍາຍເມນູ' : 'ຫຍໍ້ເມນູ'}
          className="sidebar-link flex size-7 shrink-0 items-center justify-center rounded-lg"
        >
          <Icon
            d={collapsed ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'}
            className="size-4"
          />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {NAV_GROUPS.map((group, index) => {
          const items = group.items.filter((i) => !i.visible || i.visible(user))
          if (items.length === 0) return null

          return (
            <div key={group.title ?? index} className="mb-4">
              {group.title && !collapsed && (
                <p className="sidebar-label px-3 pb-1.5 text-[11px] font-semibold tracking-wider uppercase">
                  {group.title}
                </p>
              )}

              <div className="flex flex-col gap-0.5">
                {items.map((item) => (
                  <NavRow
                    key={item.href}
                    item={item}
                    user={user}
                    collapsed={collapsed}
                    active={isActive(item.href)}
                    open={openGroups.includes(item.href)}
                    onToggle={() => toggleGroup(item.href)}
                    pathname={pathname}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="sidebar-divider flex items-center justify-between border-t px-4 py-3">
        {!collapsed && (
          <span className="sidebar-label text-xs">© ODG IT</span>
        )}
        <ThemeToggle variant="sidebar" />
      </div>
    </aside>
  )
}

function NavRow({
  item,
  user,
  collapsed,
  active,
  open,
  onToggle,
  pathname,
}: {
  item: NavItem
  user: ItStaff
  collapsed: boolean
  active: boolean
  open: boolean
  onToggle: () => void
  pathname: string
}) {
  const children = item.children?.filter((c) => !c.visible || c.visible(user)) ?? []
  const hasChildren = children.length > 0 && !collapsed

  return (
    <div>
      <div className="flex items-center gap-1">
        <Link
          href={item.href}
          data-active={active ? 'true' : undefined}
          title={collapsed ? item.label : undefined}
          className={`sidebar-link flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <Icon d={item.icon} />
          {!collapsed && <span className="truncate">{item.label}</span>}
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
        <div className="mt-0.5 ml-5 flex flex-col gap-0.5 border-l border-white/10 pl-2">
          {children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              data-active={
                pathname + '' === child.href || pathname === basePath(child.href)
                  ? child.href.includes('?')
                    ? undefined
                    : 'true'
                  : undefined
              }
              className="sidebar-link flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px]"
            >
              <Icon d={child.icon} className="size-4 opacity-70" />
              <span className="truncate">{child.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
