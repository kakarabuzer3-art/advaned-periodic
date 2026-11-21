import type { ElementRecord } from '../domain/schema.ts'

export type Direction = 'left' | 'right' | 'up' | 'down'

const ROWS = [1, 2, 3, 4, 5, 6, 7, 9, 10] as const

/**
 * Keyboard neighbour in the drawn table. Left/right stay in the row and skip
 * empty cells; up/down move to the next occupied row and land on the same
 * column, or the nearest occupied column when that cell is empty.
 */
export function neighbor(
  list: readonly ElementRecord[],
  current: ElementRecord,
  dir: Direction,
): ElementRecord | undefined {
  const { row, col } = current.position

  if (dir === 'left' || dir === 'right') {
    const step = dir === 'left' ? -1 : 1
    const inRow = list.filter((e) => e.position.row === row && (e.position.col - col) * step > 0)
    return inRow.sort((a, b) => Math.abs(a.position.col - col) - Math.abs(b.position.col - col))[0]
  }

  const i = ROWS.indexOf(row as (typeof ROWS)[number])
  const nextRow = ROWS[i + (dir === 'up' ? -1 : 1)]
  if (nextRow === undefined) return undefined
  return list
    .filter((e) => e.position.row === nextRow)
    .sort((a, b) => {
      const da = Math.abs(a.position.col - col)
      const db = Math.abs(b.position.col - col)
      return da - db || a.position.col - b.position.col
    })[0]
}
