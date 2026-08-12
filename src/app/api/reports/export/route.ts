import { getCurrentUser } from '@/lib/auth/session'
import { can, ROLE_LABEL_LO, type Role } from '@/lib/auth/roles'
import { ticketSummary, ticketsByCategory, ticketsByStaff } from '@/lib/reports/queries'
import { summariseHours } from '@/lib/worklogs/queries'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  if (!can.viewReports(user)) return new Response('Forbidden', { status: 403 })

  const url = new URL(request.url)
  const format = url.searchParams.get('format') ?? 'csv'
  const today = new Date().toISOString().slice(0, 10)
  const from = validDate(url.searchParams.get('from')) ?? today.slice(0, 8) + '01'
  const to = validDate(url.searchParams.get('to')) ?? today
  const [summary, categories, staff, hours] = await Promise.all([
    ticketSummary(from, to), ticketsByCategory(from, to), ticketsByStaff(from, to), summariseHours(from, to),
  ])
  const rows = staff.map((s) => {
    const resolved = Number(s.resolved)
    const work = hours.find((h) => h.employee_id === s.employee_id)
    return [s.fullname_lo, ROLE_LABEL_LO[s.role as Role] ?? s.role, Number(s.assigned), resolved,
      resolved ? Math.round(Number(s.sla_met) / resolved * 100) / 100 : 0,
      s.avg_resolve_minutes ? Math.round(Number(s.avg_resolve_minutes)) : 0,
      work ? Number(work.total_hours) : 0]
  })

  if (format === 'xlsx') return exportXlsx(from, to, summary, categories, rows)
  if (format === 'pdf') return exportPdf(from, to, summary, rows)
  return exportCsv(from, to, summary, rows)
}

function validDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function exportCsv(from: string, to: string, summary: Awaited<ReturnType<typeof ticketSummary>>, rows: (string | number)[][]) {
  const data = [
    ['ODG IT KPI Report', `${from} - ${to}`],
    ['Created', summary?.created ?? 0, 'Resolved', summary?.resolved ?? 0, 'SLA met', summary?.sla_met ?? 0],
    [],
    ['Employee', 'Role', 'Assigned', 'Resolved', 'SLA rate', 'Avg resolve (min)', 'Hours'],
    ...rows,
  ]
  const csv = '\uFEFF' + data.map((r) => r.map(csvCell).join(',')).join('\r\n')
  return download(csv, 'text/csv; charset=utf-8', `odg-it-kpi-${from}-${to}.csv`)
}

async function exportXlsx(from: string, to: string, summary: Awaited<ReturnType<typeof ticketSummary>>, categories: Awaited<ReturnType<typeof ticketsByCategory>>, rows: (string | number)[][]) {
  const ExcelJS = (await import('exceljs')).default
  const book = new ExcelJS.Workbook()
  book.creator = 'ODG IT'; book.created = new Date()
  const sheet = book.addWorksheet('KPI Report', { views: [{ state: 'frozen', ySplit: 5 }] })
  sheet.mergeCells('A1:G1'); sheet.getCell('A1').value = 'ODG IT — KPI Report'
  sheet.getCell('A2').value = 'Period'; sheet.getCell('B2').value = `${from} — ${to}`
  sheet.addRow([])
  sheet.addRow(['Created', Number(summary?.created ?? 0), 'Resolved', Number(summary?.resolved ?? 0), 'SLA met', Number(summary?.sla_met ?? 0)])
  sheet.addRow(['Employee', 'Role', 'Assigned', 'Resolved', 'SLA rate', 'Avg resolve (min)', 'Hours'])
  rows.forEach((row) => sheet.addRow(row))
  sheet.getRow(1).font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003260' } }
  sheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C6FB6' } }
  sheet.columns = [{ width: 28 }, { width: 24 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 20 }, { width: 12 }]
  sheet.getColumn(5).numFmt = '0%'; sheet.autoFilter = 'A5:G5'
  const cat = book.addWorksheet('Categories', { views: [{ state: 'frozen', ySplit: 1 }] })
  cat.addRow(['Category', 'Total', 'Resolved']); categories.forEach((c) => cat.addRow([c.category_name_lo, Number(c.total), Number(c.resolved)]))
  cat.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; cat.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C6FB6' } }
  cat.columns = [{ width: 34 }, { width: 14 }, { width: 14 }]
  const buffer = await book.xlsx.writeBuffer()
  return download(buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `odg-it-kpi-${from}-${to}.xlsx`)
}

async function exportPdf(from: string, to: string, summary: Awaited<ReturnType<typeof ticketSummary>>, rows: (string | number)[][]) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const fontkit = (await import('@pdf-lib/fontkit')).default
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit)
  const laoBytes = await readFile(path.join(process.cwd(), 'node_modules', '@fontsource', 'noto-sans-lao', 'files', 'noto-sans-lao-lao-400-normal.woff'))
  const laoFont = await pdf.embedFont(laoBytes)
  let page = pdf.addPage([842, 595]); const font = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const draw = (text: string, x: number, y: number, size = 10, strong = false, lao = false) => page.drawText(text, { x, y, size, font: lao ? laoFont : strong ? bold : font, color: rgb(0.04, 0.14, 0.22) })
  draw('ODG IT — KPI REPORT', 42, 548, 20, true); draw(`Period: ${from} to ${to}`, 42, 526, 10)
  draw(`Created: ${summary?.created ?? 0}     Resolved: ${summary?.resolved ?? 0}     SLA met: ${summary?.sla_met ?? 0}`, 42, 496, 12, true)
  const headers = ['Employee', 'Role', 'Assigned', 'Resolved', 'SLA', 'Avg min', 'Hours']; const xs = [42, 240, 390, 455, 520, 580, 670]
  headers.forEach((h, i) => draw(h, xs[i], 462, 9, true)); let y = 444
  for (const row of rows) {
    if (y < 45) { page = pdf.addPage([842, 595]); y = 548; headers.forEach((h, i) => draw(h, xs[i], y, 9, true)); y -= 18 }
    row.forEach((v, i) => draw(String(v).slice(0, 34), xs[i], y, 8, false, i < 2)); y -= 17
  }
  const bytes = await pdf.save()
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return download(body, 'application/pdf', `odg-it-kpi-${from}-${to}.pdf`)
}

function csvCell(value: string | number) { const s = String(value); return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s }
function download(body: BodyInit, type: string, filename: string) { return new Response(body, { headers: { 'content-type': type, 'content-disposition': `attachment; filename="${filename}"`, 'cache-control': 'no-store' } }) }
