import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { listNotifications } from '@/lib/activity'
import { formatDateTime } from '@/lib/format'
import { markAllRead, markRead } from './actions'

export const metadata = { title: 'ການແຈ້ງເຕືອນ' }

export default async function NotificationsPage() {
  const user = await requireUser()
  const notifications = await listNotifications(user.employee_id)
  const unread = notifications.filter((n) => !n.is_read).length

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mt-1 text-sm text-muted">
            ຍັງບໍ່ໄດ້ອ່ານ {unread} ລາຍການ
          </p>
        </div>

        {unread > 0 && (
          <form action={markAllRead}>
            <button
              type="submit"
              className="btn-secondary rounded-lg px-4 py-2 text-sm"
            >
              ໝາຍວ່າອ່ານແລ້ວທັງໝົດ
            </button>
          </form>
        )}
      </div>

      <div className="mt-5 divide-y divide-line glass-card rounded-xl">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-3 px-4 py-3 ${
              n.is_read ? '' : 'bg-blue-50/50 dark:bg-blue-950/20'
            }`}
          >
            <span
              className={`mt-1.5 size-2 shrink-0 rounded-full ${
                n.is_read ? 'bg-transparent' : 'bg-blue-500'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-fg">{n.title}</p>
              {n.body && (
                <p className="text-sm text-muted">{n.body}</p>
              )}
              <p className="mt-0.5 text-xs text-faint">
                {formatDateTime(n.created_at)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {n.link && (
                <Link
                  href={n.link}
                  className="text-sm text-muted underline-offset-2 hover:underline"
                >
                  ເປີດ
                </Link>
              )}
              {!n.is_read && (
                <form action={markRead}>
                  <input type="hidden" name="id" value={n.id} />
                  <button
                    type="submit"
                    className="text-xs text-muted underline-offset-2 hover:underline"
                  >
                    ອ່ານແລ້ວ
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <p className="px-4 py-10 text-center text-muted">
            ຍັງບໍ່ມີການແຈ້ງເຕືອນ
          </p>
        )}
      </div>
    </div>
  )
}
