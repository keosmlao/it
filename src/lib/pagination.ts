export const PAGE_SIZE = 20

export function pageNumber(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(raw ?? '1', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export type PageResult<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
  pageCount: number
}
