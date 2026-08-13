import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

/** ຖັນໜຶ່ງຂອງໄຟລ໌ທີ່ສົ່ງອອກ */
export type Column = {
  key: string
  label: string
  /** ຄວາມກວ້າງໃນ Excel (ຕົວອັກສອນ) — ແລະ ໃຊ້ຄິດສ່ວນກວ້າງໃນ PDF ນຳ */
  width?: number
  align?: 'left' | 'right'
  /** ຮູບແບບຕົວເລກຂອງ Excel ເຊັ່ນ '#,##0' */
  numFmt?: string
}

export type Dataset = {
  /** ຊື່ໄຟລ໌ (ບໍ່ຕ້ອງມີນາມສະກຸນ) */
  fileName: string
  /** ຫົວເລື່ອງທີ່ພິມຢູ່ເທິງສຸດ */
  title: string
  subtitle?: string
  columns: Column[]
  rows: Record<string, unknown>[]
}

const BRAND_NAVY = 'FF003260'
const BRAND_BLUE = 'FF2C6FB6'

export function download(body: BodyInit, type: string, filename: string) {
  return new Response(body, {
    headers: {
      'content-type': type,
      'content-disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'cache-control': 'no-store',
    },
  })
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'boolean') return value ? 'ແມ່ນ' : 'ບໍ່'
  return String(value)
}

/** CSV ພ້ອມ BOM ເພື່ອໃຫ້ Excel ອ່ານພາສາລາວອອກ */
export function toCsv(data: Dataset) {
  const lines = [
    data.columns.map((c) => c.label),
    ...data.rows.map((r) => data.columns.map((c) => cell(r[c.key]))),
  ]
  const csv =
    '﻿' +
    lines.map((r) => r.map(csvCell).join(',')).join('\r\n')
  return download(csv, 'text/csv; charset=utf-8', `${data.fileName}.csv`)
}

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export async function toXlsx(data: Dataset) {
  const ExcelJS = (await import('exceljs')).default
  const book = new ExcelJS.Workbook()
  book.creator = 'ODG IT'
  book.created = new Date()

  const sheet = book.addWorksheet('ຂໍ້ມູນ', {
    views: [{ state: 'frozen', ySplit: 3 }],
  })

  const lastCol = String.fromCharCode(64 + Math.min(data.columns.length, 26))
  sheet.mergeCells(`A1:${lastCol}1`)
  sheet.getCell('A1').value = data.title
  sheet.getCell('A2').value = data.subtitle ?? ''

  sheet.addRow([])
  sheet.addRow(data.columns.map((c) => c.label))
  for (const row of data.rows) {
    sheet.addRow(
      data.columns.map((c) => {
        const v = row[c.key]
        if (c.numFmt && v !== null && v !== undefined && v !== '') return Number(v)
        return cell(v)
      })
    )
  }

  sheet.getRow(1).height = 26
  sheet.getRow(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: BRAND_NAVY },
  }
  sheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(3).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: BRAND_BLUE },
  }

  sheet.columns = data.columns.map((c) => ({ width: c.width ?? 18 }))
  data.columns.forEach((c, i) => {
    if (c.numFmt) sheet.getColumn(i + 1).numFmt = c.numFmt
    if (c.align === 'right') sheet.getColumn(i + 1).alignment = { horizontal: 'right' }
  })
  if (data.rows.length > 0) {
    sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: data.columns.length } }
  }

  const buffer = await book.xlsx.writeBuffer()
  return download(
    buffer,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    `${data.fileName}.xlsx`
  )
}

/**
 * ຕົວຂຽນຂໍ້ຄວາມທີ່ປົນພາສາລາວກັບຕົວເລກ/ອັງກິດໄດ້.
 *
 * @fontsource ຕັດຟອນຕ໌ອອກເປັນຊຸດຍ່ອຍຕາມພາສາ: ຊຸດ `lao` ມີແຕ່ຕົວອັກສອນລາວ
 * (ບໍ່ມີເລກ 0-9 ຫຼື a-z ເລີຍ) ສ່ວນຊຸດ `latin` ກົງກັນຂ້າມ. ຖ້າໃຊ້ຊຸດດຽວ
 * ຕົວອັກສອນອີກຝ່າຍຈະຫາຍໄປຈາກ PDF ງຽບໆ — ຈຶ່ງຝັງທັງສອງ ແລ້ວແຍກຂຽນເປັນທ່ອນ
 */
export async function createTextWriter(pdf: import('pdf-lib').PDFDocument) {
  const {
    PDFName,
    beginText,
    endText,
    popGraphicsState,
    pushGraphicsState,
    setFillingRgbColor,
    setFontAndSize,
    setTextMatrix,
    showText,
  } = await import('pdf-lib')

  const [laoR, laoB, latinR, latinB] = await Promise.all([
    pdf.embedFont(await laoFont(400)),
    pdf.embedFont(await laoFont(700)),
    pdf.embedFont(await latinFont(400)),
    pdf.embedFont(await latinFont(700)),
  ])

  // ຂຽນຄຳສັ່ງລົງ content stream ເອງ ແທນ page.drawText({ font }) ເພາະ pdf-lib
  // ຕັ້ງຊື່ຟອນຕ໌ໃໝ່ແບບສຸ່ມທຸກຄັ້ງທີ່ສົ່ງ font ເຂົ້າໄປ — ໄຟລ໌ຈະບວມດ້ວຍ
  // ຊື່ຊ້ຳໆເປັນພັນລາຍການ. ຢູ່ນີ້ລົງທະບຽນ 4 ຊື່ຄົງທີ່ຕໍ່ໜຶ່ງໜ້າເທົ່ານັ້ນ
  const KEY = new Map([
    [laoR, 'FLaoR'],
    [laoB, 'FLaoB'],
    [latinR, 'FLatR'],
    [latinB, 'FLatB'],
  ])
  const prepared = new WeakSet<object>()
  const prepare = (page: import('pdf-lib').PDFPage) => {
    if (prepared.has(page)) return
    for (const [font, key] of KEY) {
      page.node.setFontDictionary(PDFName.of(key), font.ref)
    }
    prepared.add(page)
  }

  const isLao = (ch: string) => /[຀-໿]/.test(ch)

  /** ຕັດຂໍ້ຄວາມເປັນທ່ອນ ລາວ / ບໍ່ແມ່ນລາວ */
  const segments = (text: string) => {
    const out: { text: string; lao: boolean }[] = []
    for (const ch of text) {
      const lao = isLao(ch)
      const last = out[out.length - 1]
      if (last && last.lao === lao) last.text += ch
      else out.push({ text: ch, lao })
    }
    return out
  }

  const pick = (lao: boolean, strong: boolean) =>
    lao ? (strong ? laoB : laoR) : strong ? latinB : latinR

  const width = (text: string, size: number, strong = false) =>
    segments(text).reduce(
      (sum, s) => sum + pick(s.lao, strong).widthOfTextAtSize(s.text, size),
      0
    )

  const draw = (
    page: import('pdf-lib').PDFPage,
    text: string,
    x: number,
    y: number,
    size: number,
    color: import('pdf-lib').RGB,
    strong = false
  ) => {
    if (!text) return
    prepare(page)

    let cursor = x
    for (const s of segments(text)) {
      const font = pick(s.lao, strong)
      page.pushOperators(
        pushGraphicsState(),
        beginText(),
        setFillingRgbColor(color.red, color.green, color.blue),
        setFontAndSize(KEY.get(font)!, size),
        setTextMatrix(1, 0, 0, 1, cursor, y),
        showText(font.encodeText(s.text)),
        endText(),
        popGraphicsState()
      )
      cursor += font.widthOfTextAtSize(s.text, size)
    }
  }

  /** ຕັດຂໍ້ຄວາມໃຫ້ພໍດີຄວາມກວ້າງຈິງ (ວັດແທ້ ບໍ່ແມ່ນນັບຕົວອັກສອນ) */
  const fit = (text: string, maxWidth: number, size: number) => {
    if (width(text, size) <= maxWidth) return text
    let cut = text
    while (cut.length > 1 && width(cut + '…', size) > maxWidth) {
      cut = cut.slice(0, -1)
    }
    return cut + '…'
  }

  return { draw, width, fit }
}

/**
 * PDF ແນວນອນ A4 ພ້ອມຝັງຟອນຕ໌ Noto Sans Lao —
 * ຟອນຕ໌ມາດຕະຖານຂອງ PDF ບໍ່ມີຕົວອັກສອນລາວ ຈຶ່ງຕ້ອງຝັງເອງ
 */
export async function toPdf(data: Dataset) {
  const { PDFDocument, rgb } = await import('pdf-lib')
  const fontkit = (await import('@pdf-lib/fontkit')).default

  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const writer = await createTextWriter(pdf)

  const PAGE = [842, 595] as const
  const MARGIN = 34
  const ink = rgb(0.04, 0.14, 0.22)
  const faint = rgb(0.45, 0.5, 0.55)

  // ແບ່ງຄວາມກວ້າງຕາມນ້ຳໜັກຂອງແຕ່ລະຖັນ
  const totalWeight = data.columns.reduce((s, c) => s + (c.width ?? 18), 0)
  const usable = PAGE[0] - MARGIN * 2
  const widths = data.columns.map((c) => ((c.width ?? 18) / totalWeight) * usable)
  const xs = widths.reduce<number[]>((acc, w, i) => {
    acc.push(i === 0 ? MARGIN : acc[i - 1] + widths[i - 1])
    return acc
  }, [])

  let page = pdf.addPage([...PAGE])
  let y = 0

  const text = (
    value: string,
    x: number,
    top: number,
    size: number,
    strong = false,
    color = ink
  ) => writer.draw(page, value, x, top, size, color, strong)

  const header = (withTitle: boolean) => {
    y = PAGE[1] - MARGIN
    if (withTitle) {
      text(data.title, MARGIN, y - 14, 16, true)
      y -= 20
      if (data.subtitle) {
        text(data.subtitle, MARGIN, y - 10, 9, false, faint)
        y -= 14
      }
      y -= 8
    }
    data.columns.forEach((c, i) => text(c.label, xs[i] + 2, y - 9, 8, true))
    y -= 14
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE[0] - MARGIN, y },
      thickness: 0.7,
      color: rgb(0.8, 0.84, 0.88),
    })
    y -= 12
  }

  header(true)

  for (const row of data.rows) {
    if (y < MARGIN + 20) {
      page = pdf.addPage([...PAGE])
      header(false)
    }
    data.columns.forEach((c, i) => {
      text(writer.fit(cell(row[c.key]), widths[i] - 6, 7.5), xs[i] + 2, y, 7.5)
    })
    y -= 13
  }

  if (data.rows.length === 0) {
    text('ບໍ່ມີຂໍ້ມູນ', MARGIN, y, 10, false, faint)
  }

  // ໝາຍເລກໜ້າ
  const pages = pdf.getPages()
  pages.forEach((p, i) => {
    writer.draw(p, `${i + 1}/${pages.length}`, PAGE[0] - MARGIN - 24, 18, 8, faint)
  })

  // useObjectStreams: false → ໂຄງສ້າງໄຟລ໌ອ່ານໄດ້ດ້ວຍໂປຣແກຣມເກົ່າ
  // ແລະ ກວດເນື້ອໃນໄດ້ (npm run smoke:pdf ນັບການແຕ້ມຂໍ້ຄວາມຈາກ content stream)
  const bytes = await pdf.save({ useObjectStreams: false })
  const body = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer
  return download(body, 'application/pdf', `${data.fileName}.pdf`)
}

function laoFont(weight: 400 | 700) {
  return fontFile(`noto-sans-lao-lao-${weight}-normal.woff`)
}

function latinFont(weight: 400 | 700) {
  return fontFile(`noto-sans-lao-latin-${weight}-normal.woff`)
}

function fontFile(name: string) {
  return readFile(
    path.join(process.cwd(), 'node_modules', '@fontsource', 'noto-sans-lao', 'files', name)
  )
}

/** ເລືອກຮູບແບບຕາມ ?format= — ຄ່າເລີ່ມຕົ້ນ xlsx */
export async function respond(format: string, data: Dataset) {
  if (format === 'pdf') return toPdf(data)
  if (format === 'csv') return toCsv(data)
  return toXlsx(data)
}
