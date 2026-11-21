import type { ElementRecord } from '../domain/schema.ts'

/**
 * Search by name, symbol or atomic number. Returns matches ranked best-first:
 *   0 exact symbol / exact atomic number
 *   1 name starts with query
 *   2 name contains query
 *   3 symbol starts with query
 * An empty query returns no results (callers treat that as "not searching").
 */
export function searchElements(query: string, list: readonly ElementRecord[]): ElementRecord[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  if (/^\d+$/.test(q)) {
    const z = Number(q)
    return list.filter((e) => e.number === z)
  }

  const ranked: { el: ElementRecord; rank: number }[] = []
  for (const el of list) {
    const name = el.name.toLowerCase()
    const symbol = el.symbol.toLowerCase()
    let rank = -1
    if (symbol === q) rank = 0
    else if (name.startsWith(q)) rank = 1
    else if (q.length >= 2 && name.includes(q)) rank = 2
    else if (symbol.startsWith(q)) rank = 3
    if (rank >= 0) ranked.push({ el, rank })
  }
  return ranked.sort((a, b) => a.rank - b.rank || a.el.number - b.el.number).map((r) => r.el)
}
