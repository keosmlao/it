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

      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <Topbar user={user} unread={user.unread_count ?? 0} />

        <main className="mx-auto w-full flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6">
          {children}
        </main>

        <footer className="flex items-center justify-between gap-3 px-5 py-3 text-xs text-faint">
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
