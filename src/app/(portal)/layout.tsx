import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { logout } from '../(app)/actions'

/**
 * ໜ້າສຳລັບພະນັກງານພະແນກອື່ນ (requester) — ງ່າຍໆ 3 ເມນູ
 * ພະນັກງານ IT ກໍເປີດເບິ່ງໄດ້ ແຕ່ຈະມີປຸ່ມກັບເຂົ້າໜ້າພາຍໃນ
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  return (
    <div className="flex min-h-full flex-col">
      <header className="brand-gradient-cool text-white">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/my" className="text-lg font-semibold">
            ບໍລິການໄອທີ · ODIEN
          </Link>

          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline">
              {user.fullname_lo}
              {user.department_name && ` · ${user.department_name}`}
            </span>
            {user.is_it_staff && (
              <Link
                href="/"
                className="rounded-lg bg-white/20 px-3 py-1.5 transition hover:bg-white/30"
              >
                ໜ້າພະແນກ IT
              </Link>
            )}
            <form action={logout}>
              <button type="submit" className="underline-offset-2 hover:underline">
                ອອກ
              </button>
            </form>
          </div>
        </div>

        <nav className="mx-auto flex w-full max-w-4xl gap-1 px-4">
          {[
            { href: '/my', label: 'ໜ້າຫຼັກ' },
            { href: '/my/tickets/new', label: '+ ແຈ້ງບັນຫາ' },
            { href: '/my/tickets', label: 'ເລື່ອງທີ່ແຈ້ງໄວ້' },
            { href: '/my/kb', label: 'ແກ້ເອງໄດ້' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-t-lg px-3 py-2 text-sm transition hover:bg-white/15"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>

      <footer className="px-5 py-4 text-center text-xs text-faint">
        © ODG IT · ພະແນກໄອທີ
      </footer>
    </div>
  )
}
