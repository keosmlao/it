import 'server-only'
import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

/** ຮູບເທົ່ານັ້ນ — ກັນການອັບໂຫລດໄຟລ໌ທີ່ຮັນໄດ້ */
export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/heic',
] as const

export const MAX_FILE_BYTES = 8 * 1024 * 1024 // 8MB ຕໍ່ຮູບ
export const MAX_FILES_PER_UPLOAD = 5

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
}

/** ໂຟນເດີເກັບໄຟລ໌ — ຢູ່ນອກ public/ ຈຶ່ງເປີດກົງໆຈາກ browser ບໍ່ໄດ້ */
function uploadRoot() {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads')
}

export type SavedFile = {
  fileName: string
  storedName: string
  mimeType: string
  sizeBytes: number
}

export type SaveResult =
  | { ok: true; files: SavedFile[] }
  | { ok: false; error: string }

/** ດຶງໄຟລ໌ຈິງອອກຈາກ FormData (ຊ່ອງວ່າງຈະມາເປັນ File ຂະໜາດ 0) */
export function pickFiles(values: FormDataEntryValue[]): File[] {
  return values.filter((v): v is File => v instanceof File && v.size > 0)
}

/**
 * ກວດຮູບກ່ອນຂຽນລົງ disk — ເອີ້ນກ່ອນບັນທຶກຂໍ້ມູນ ເພື່ອບໍ່ໃຫ້ເຫຼືອ
 * ຂໍ້ມູນທີ່ບັນທຶກແລ້ວແຕ່ຮູບແນບບໍ່ຜ່ານ.
 */
export function validateImages(files: File[]): { error?: string } {
  if (files.length === 0) return {}

  if (files.length > MAX_FILES_PER_UPLOAD) {
    return { error: `ແນບໄດ້ສູງສຸດ ${MAX_FILES_PER_UPLOAD} ຮູບຕໍ່ຄັ້ງ` }
  }

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as never)) {
      return { error: `"${file.name}" ບໍ່ແມ່ນໄຟລ໌ຮູບທີ່ຮອງຮັບ` }
    }
    if (file.size > MAX_FILE_BYTES) {
      return {
        error: `"${file.name}" ໃຫຍ່ເກີນ ${MAX_FILE_BYTES / 1024 / 1024}MB`,
      }
    }
  }

  return {}
}

/**
 * ບັນທຶກຮູບທີ່ແນບມາລົງ disk. ຄືນຂໍ້ຄວາມແຈ້ງເຕືອນແທນການ throw
 * ເພື່ອໃຫ້ຟອມສະແດງໃຫ້ຜູ້ໃຊ້ເຫັນໄດ້.
 */
export async function saveImages(
  files: File[],
  folder: string
): Promise<SaveResult> {
  const real = files.filter((f) => f && f.size > 0)
  if (real.length === 0) return { ok: true, files: [] }

  const invalid = validateImages(real)
  if (invalid.error) return { ok: false, error: invalid.error }

  const dir = path.join(uploadRoot(), folder)
  await mkdir(dir, { recursive: true })

  const saved: SavedFile[] = []
  for (const file of real) {
    const storedName = `${randomBytes(16).toString('hex')}.${EXTENSIONS[file.type] ?? 'bin'}`
    const bytes = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(dir, storedName), bytes)

    saved.push({
      fileName: file.name.slice(0, 255),
      storedName,
      mimeType: file.type,
      sizeBytes: file.size,
    })
  }

  return { ok: true, files: saved }
}

/** ອ່ານໄຟລ໌ຄືນເພື່ອສົ່ງໃຫ້ browser ຜ່ານ route ທີ່ກວດສິດແລ້ວ */
export async function readStoredFile(folder: string, storedName: string) {
  // ກັນ path traversal — ຊື່ໄຟລ໌ຕ້ອງເປັນ hex + ນາມສະກຸນເທົ່ານັ້ນ
  if (!/^[a-f0-9]{32}\.[a-z0-9]{2,5}$/.test(storedName)) return null
  if (!/^[a-z0-9/_-]+$/.test(folder)) return null

  try {
    return await readFile(path.join(uploadRoot(), folder, storedName))
  } catch {
    return null
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
