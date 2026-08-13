'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ICON } from './nav-config'
import { can, type ItStaff } from '@/lib/auth/roles'
import { EMPTY_BADGES, type NavBadges } from '@/lib/nav-badges-model'

const items: { href: string; label: string; icon: string; badge?: keyof NavBadges }[] = [
  { href: '/', label: 'ພາບລວມ', icon: ICON.home },
  { href: '/tickets', label: 'Ticket', icon: ICON.ticket, badge: 'tickets' },
  { href: '/tasks', label: 'ວຽກ', icon: ICON.task, badge: 'myWork' },
  { href: '/assets', label: 'ອຸປະກອນ', icon: ICON.asset },
]

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export default function MobileNav({
  user,
  logout,
  badges = EMPTY_BADGES,
}: {
  user: ItStaff
  logout: () => Promise<void>
  badges?: NavBadges
}) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <nav className="mobile-dock md:hidden" aria-label="ເມນູຫຼັກ">
      {items.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} data-active={active || undefined}
            aria-current={active ? 'page' : undefined} className="mobile-dock-link relative">
            <Icon d={item.icon} />
            <span>{item.label}</span>
            {item.badge && badges[item.badge] > 0 && (
              <span className="absolute top-1 right-1/4 min-w-4 rounded-full bg-brand-orange px-1 text-[10px] leading-4 font-medium text-white tabular-nums">
                {badges[item.badge] > 999 ? '999+' : badges[item.badge]}
              </span>
            )}
          </Link>
        )
      })}
      <button type="button" onClick={() => setMoreOpen(true)} className="mobile-dock-link" aria-expanded={moreOpen}>
        <Icon d={ICON.list} /><span>ເພີ່ມເຕີມ</span>
      </button>
      {moreOpen && (
        <div className="fixed inset-0 z-[60] flex items-end bg-brand-navy/45 p-3" onClick={() => setMoreOpen(false)}>
          <section className="glass-heavy w-full rounded-2xl p-3" onClick={(e) => e.stopPropagation()} aria-label="ເມນູເພີ່ມເຕີມ">
            <div className="mb-2 flex items-center justify-between px-2 py-1">
              <div><p className="font-semibold text-fg">ເມນູເພີ່ມເຕີມ</p><p className="text-xs text-muted">{user.fullname_lo}</p></div>
              <button type="button" onClick={() => setMoreOpen(false)} className="btn-secondary rounded-full px-3 py-1 text-sm">ປິດ</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/requests', label: 'ຄຳຮ້ອງ', icon: ICON.request, show: true, badge: badges.requests },
                { href: '/purchase', label: 'ໃບສະເໜີຊື້', icon: ICON.request, show: true, badge: badges.purchase },
                { href: '/projects', label: 'ໂປຣເຈັກ', icon: ICON.project, show: true },
                { href: '/assets/recovery', label: 'ທວງຄືນ', icon: ICON.bell, show: true, badge: badges.recovery },
                { href: '/assets/damaged', label: 'ອຸປະກອນເພ', icon: ICON.warning, show: true, badge: badges.damaged },
                { href: '/plans', label: 'ແຜນວຽກ', icon: ICON.clock, show: true },
                { href: '/kb', label: 'ຄັງຄວາມຮູ້', icon: ICON.book, show: true },
                { href: '/reports', label: 'ລາຍງານ', icon: ICON.chart, show: can.viewReports(user) },
                { href: '/admin', label: 'ຕັ້ງຄ່າ', icon: ICON.settings, show: can.administer(user) },
              ].filter((x) => x.show).map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} className="btn-secondary flex items-center gap-3 rounded-xl p-3 text-sm">
                  <Icon d={item.icon} />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {'badge' in item && Number(item.badge) > 0 && (
                    <span className="shrink-0 rounded-full bg-brand-orange px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
                      {Number(item.badge) > 999 ? '999+' : item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
            <form action={logout} className="mt-2"><button type="submit" className="btn-danger flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm"><Icon d={ICON.logout} />ອອກຈາກລະບົບ</button></form>
          </section>
        </div>
      )}
    </nav>
  )
}
