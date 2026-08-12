import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import Sidebar from './sidebar'
import Topbar from './topbar'
import { logout } from './actions'
import MobileNav from './mobile-nav'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-full">
      <Sidebar user={user} />

      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <Topbar user={user} unread={user.unread_count ?? 0} />

        <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6">
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
      <MobileNav user={user} logout={logout} />
    </div>
  )
}
