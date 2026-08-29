import { requireStaff } from '@/lib/auth/session'
import { getNavBadges } from '@/lib/nav-badges'
import Sidebar from './sidebar'
import Topbar from './topbar'
import { logout } from './actions'
import MobileNav from './mobile-nav'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  // ດ່ານດຽວຂອງທັງກຸ່ມ (app): ຜູ້ແຈ້ງບັນຫາຈາກພະແນກອື່ນຖືກສົ່ງໄປ /my
  const user = await requireStaff()
  const badges = await getNavBadges(user)

  return (
    <div className="flex min-h-full">
      <Sidebar user={user} badges={badges} />

      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <Topbar user={user} unread={user.unread_count ?? 0} />

        {/* ພື້ນຂາວຕໍ່ເນື່ອງແບບໜ້າລາຍການຂອງ Odoo — ແຖບເຄື່ອງມື, ຕົວກັ່ນຕອງ
            ແລະ ຕາຕະລາງຢູ່ແຜ່ນດຽວກັນ ບໍ່ແມ່ນກາດລອຍເທິງພື້ນເທົາ */}
        <main className="w-full flex-1 bg-[var(--surface)] px-3 py-3 sm:px-4 sm:py-4">
          {children}
        </main>

        <footer className="flex items-center justify-between gap-3 border-t border-line px-4 py-2 text-xs text-faint">
          <span>© ODG IT · ພະແນກໄອທີ</span>
          <form action={logout}>
            <button type="submit" className="underline-offset-2 hover:underline">
              ອອກຈາກລະບົບ
            </button>
          </form>
        </footer>
      </div>
      <MobileNav user={user} logout={logout} badges={badges} />
    </div>
  )
}
