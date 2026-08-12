import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [info] = await query<{
      database: string
      schema: string
      now: string
    }>(
      'select current_database() as database, current_schema() as schema, now() as now'
    )

    const tables = await query<{ table_name: string }>(
      `select table_name
         from information_schema.tables
        where table_schema = current_schema()
        order by table_name`
    )

    return NextResponse.json({
      ok: true,
      ...info,
      tableCount: tables.length,
      tables: tables.map((t) => t.table_name),
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
