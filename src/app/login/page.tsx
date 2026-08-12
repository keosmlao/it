import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import ThemeToggle from '@/components/theme-toggle'
import LoginForm from './login-form'

export const metadata = { title: 'ເຂົ້າສູ່ລະບົບ' }

/** ຈຸດເດັ່ນທີ່ສະແດງຢູ່ແຜງແບຣນ */
const HIGHLIGHTS = [
  {
    icon: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4V7Zm10 0v10',
    title: 'Ticket ພ້ອມ SLA',
    note: 'ແຈ້ງບັນຫາ ມອບໝາຍ ຕິດຕາມເວລາຕອບ ແລະ ເວລາແກ້ໄຂ',
  },
  {
    icon: 'M3 7h6l2 2h10v10H3V7Z',
    title: 'ໂປຣເຈັກ & ກະດານວຽກ',
    note: 'ວາງແຜນ ແບ່ງວຽກ ແລະ ຕິດຕາມຄວາມຄືບໜ້າ',
  },
  {
    icon: 'M4 20V10m5 10V4m5 16v-7m5 7V8',
    title: 'ລາຍງານ KPI',
    note: 'ຊົ່ວໂມງເຮັດວຽກ ອັດຕາຕາມ SLA ແລະ ຜົນງານຕໍ່ຄົນ',
  },
]

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/')

  const year = new Date().getFullYear()

  return (
    <main className="relative flex min-h-dvh flex-col lg:flex-row">
      {/* ---------- ແຜງແບຣນ ---------- */}
      <section className="sidebar-shell relative flex flex-col justify-between overflow-hidden px-6 py-8 lg:w-[46%] lg:px-12 lg:py-12">
        {/* ວົງແສງຕົກແຕ່ງ */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-16 size-72 rounded-full bg-brand-sky/20 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -bottom-24 size-80 rounded-full bg-brand-orange/15 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <span className="brand-gradient-cool flex size-12 items-center justify-center rounded-2xl text-base font-bold text-white shadow-[0_12px_30px_#2c6fb666]">
            IT
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold text-white">ODIEN Group</span>
            <span className="sidebar-label block text-[11px] font-semibold tracking-[0.18em] uppercase">
              IT Console
            </span>
          </span>
        </div>

        <div className="relative mt-10 lg:mt-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-white/60 uppercase">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            IT Service Center
          </p>
          <h1 className="mt-3 text-3xl leading-tight font-bold text-white lg:text-4xl">
            ລະບົບບໍລິຫານ
            <br />
            ວຽກງານພະແນກໄອທີ
          </h1>
          <p className="mt-3 max-w-md text-sm text-white/70">
            ລວມ ticket, ວຽກພັດທະນາ, ອຸປະກອນ ແລະ ລາຍງານ ໄວ້ບ່ອນດຽວ
            ເພື່ອໃຫ້ທຸກຄົນເຫັນວຽກຂອງຕົນ ແລະ ຫົວໜ້າເຫັນພາບລວມ
          </p>

          <ul className="mt-8 hidden space-y-4 lg:block">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-[18px]"
                    aria-hidden="true"
                  >
                    <path d={item.icon} />
                  </svg>
                </span>
                <span>
                  <span className="block text-sm font-medium text-white">
                    {item.title}
                  </span>
                  <span className="block text-xs text-white/60">{item.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="sidebar-label relative mt-10 hidden text-xs lg:block">
          © {year} ODIEN Group · ພະແນກໄອທີ
        </p>
      </section>

      {/* ---------- ຝັ່ງຟອມ ---------- */}
      <section className="relative flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-fg">ເຂົ້າສູ່ລະບົບ</h2>
          <p className="mt-1 text-sm text-muted">
            ໃຊ້ລະຫັດພະນັກງານ ແລະ ລະຫັດຜ່ານດຽວກັນກັບລະບົບພາຍໃນ
          </p>

          <LoginForm />

          <p className="mt-6 text-center text-xs text-faint lg:hidden">
            © {year} ODIEN Group · ພະແນກໄອທີ
          </p>
        </div>
      </section>
    </main>
  )
}
