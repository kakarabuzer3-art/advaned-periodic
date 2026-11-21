import { ELEMENT_COUNT } from './canonical.ts'

export type Section = 'main' | 'lanthanoid' | 'actinoid'
export type Block = 's' | 'p' | 'd' | 'f'

export interface Position {
  /** 1-7 main rows; 9 = lanthanoid row, 10 = actinoid row (row 8 is the visual gap, as in most printed tables). */
  row: number
  /** 1-18 */
  col: number
  section: Section
}

const PERIOD_ENDS = [2, 10, 18, 36, 54, 86, 118] as const

export function periodOf(z: number): number {
  const i = PERIOD_ENDS.findIndex((end) => z <= end)
  if (i < 0) throw new RangeError(`Atomic number out of range: ${z}`)
  return i + 1
}

/**
 * Position in the conventional 18-column layout with the 15-element
 * La-Lu and Ac-Lr rows drawn below the main table.
 * Derived from the structure of the table, independently of the dataset.
 */
export function positionOf(z: number): Position {
  if (!Number.isInteger(z) || z < 1 || z > ELEMENT_COUNT) throw new RangeError(`Atomic number out of range: ${z}`)
  if (z >= 57 && z <= 71) return { row: 9, col: z - 57 + 3, section: 'lanthanoid' }
  if (z >= 89 && z <= 103) return { row: 10, col: z - 89 + 3, section: 'actinoid' }
  const period = periodOf(z)
  if (z === 1) return { row: 1, col: 1, section: 'main' }
  if (z === 2) return { row: 1, col: 18, section: 'main' }
  if (period === 2) return { row: 2, col: z - 2 <= 2 ? z - 2 : z - 2 + 10, section: 'main' }
  if (period === 3) return { row: 3, col: z - 10 <= 2 ? z - 10 : z - 10 + 10, section: 'main' }
  if (period === 4) return { row: 4, col: z - 18, section: 'main' }
  if (period === 5) return { row: 5, col: z - 36, section: 'main' }
  if (period === 6) return { row: 6, col: z <= 56 ? z - 54 : z - 68, section: 'main' }
  return { row: 7, col: z <= 88 ? z - 86 : z - 100, section: 'main' }
}

/**
 * IUPAC group number, or null where no group is assigned.
 * Lu and Lr are shown in the f-rows here but belong to group 3 (d-block by
 * electron configuration), so they carry group 3. La-Yb and Ac-No carry none.
 */
export function groupOf(z: number): number | null {
  if ((z >= 57 && z <= 70) || (z >= 89 && z <= 102)) return null
  if (z === 71 || z === 103) return 3
  return positionOf(z).col
}

export function blockOf(z: number): Block {
  if ((z >= 57 && z <= 70) || (z >= 89 && z <= 102)) return 'f'
  if (z === 71 || z === 103) return 'd'
  if (z <= 2) return 's' // He is group 18 but s-block by electron configuration
  const col = positionOf(z).col
  if (col <= 2) return 's'
  if (col >= 13) return 'p'
  return 'd'
}
