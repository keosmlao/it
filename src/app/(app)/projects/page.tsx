import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { can } from '@/lib/auth/roles'
import { paginateProjects } from '@/lib/projects/queries'
import Pagination from '@/components/pagination'
import { pageNumber } from '@/lib/pagination'
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL_LO } from '@/lib/projects/model'
import { ProgressBar, ProjectStatusBadge } from '@/components/project-badge'
import { PriorityBadge } from '@/components/badge'

export const metadata = { title: 'ໂປຣເຈັກພັດທະນາ' }

export default async function ProjectsPage({
  searchParams,
}: PageProps<'/projects'>) {
  const params = await searchParams
  const user = await requireUser()

  // ບໍ່ໄດ້ລະບຸມາ = ສະເພາະທີ່ຍັງບໍ່ຈົບ; 'all' = ເອົາໝົດ
  const status = params.status === undefined ? 'open' : pick(params.status) || 'all'
  const q = pick(params.q)
  const projectPage = await paginateProjects({ status, q }, pageNumber(params.page))
  const projects = projectPage.items

  return (
    <div className="w-full">
      <div className="o-page-actions">
        <div>
          <p className="mt-1 text-sm text-muted">
            ພົບ {projectPage.total} ໂປຣເຈັກ
          </p>
        </div>

        {can.assignWork(user) && (
          <Link
            href="/projects/new"
            className="btn-primary rounded px-3 py-1.5 text-[13px] font-medium"
          >
            + ສ້າງໂປຣເຈັກ
          </Link>
        )}
      </div>

      <form className="o-filter-bar mt-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          ຄົ້ນຫາ
          <input
            name="q"
            defaultValue={q}
            placeholder="ຊື່ ຫຼື ເລກໂປຣເຈັກ"
            className="input w-52 rounded px-2 py-1 text-[13px]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          ສະຖານະ
          <select
            name="status"
            defaultValue={status}
            className="input rounded px-2 py-1 text-[13px]"
          >
            <option value="open">ຍັງບໍ່ຈົບ</option>
            <option value="all">ທັງໝົດ</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABEL_LO[s]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="btn-secondary rounded px-3 py-1.5 text-[13px]"
        >
          ກັ່ນຕອງ
        </button>
      </form>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="glass-card rounded-xl p-4 transition hover:border-line hover:shadow-sm dark:hover:border-slate-700"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs text-muted">
                  {p.project_no}
                </p>
                <h2 className="truncate font-medium text-fg">
                  {p.name}
                </h2>
              </div>
              <ProjectStatusBadge status={p.status} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PriorityBadge priority={p.priority} label={p.priority_name_lo} />
              {p.is_overdue && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
                  ເກີນກຳນົດ
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <span className="text-muted">
                ເຈົ້າຂອງ: {p.owner_nickname ?? p.owner_name}
              </span>
              <ProgressBar
                done={Number(p.task_done_count)}
                total={Number(p.task_count)}
              />
            </div>
          </Link>
        ))}

        {projects.length === 0 && (
          <p className="col-span-full glass-card rounded-xl px-4 py-10 text-center text-muted">
            ຍັງບໍ່ມີໂປຣເຈັກ
          </p>
        )}
      </div>
      <Pagination {...projectPage} query={params} />
    </div>
  )
}

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}
