import { describe, expect, it } from 'vitest'
import { elements, getElementBySymbol } from '../data/index.ts'
import { EMPTY_FILTERS, isFiltering, matchingNumbers } from './filters.ts'
import { formatUncertainty, formatKelvin, formatMassShort, formatNeutrons, missingLabel, describeDiscovery } from './format.ts'
import { neighbor } from './gridNav.ts'
import { searchElements } from './search.ts'
import { initialState, reducer } from '../state/explorer.ts'

const el = (s: string) => getElementBySymbol(s)!

describe('searchElements', () => {
  it('returns nothing for an empty query', () => {
    expect(searchElements('  ', elements)).toEqual([])
  })
  it('finds by atomic number exactly', () => {
    expect(searchElements('26', elements).map((e) => e.symbol)).toEqual(['Fe'])
    expect(searchElements('119', elements)).toEqual([])
    expect(searchElements('118', elements).map((e) => e.symbol)).toEqual(['Og'])
  })
  it('finds by symbol, case-insensitively, ranking exact symbol first', () => {
    const hits = searchElements('fe', elements).map((e) => e.symbol)
    expect(hits[0]).toBe('Fe')
    expect(hits).toContain('Fm') // Fermium starts with "fe"
  })
  it('finds by name prefix and substring', () => {
    expect(searchElements('Gold', elements).map((e) => e.symbol)).toEqual(['Au'])
    expect(searchElements('ium', elements).length).toBeGreaterThan(30)
    expect(searchElements('caesium', elements).map((e) => e.symbol)).toEqual(['Cs'])
  })
  it('does not let a single letter match every name containing it', () => {
    const hits = searchElements('c', elements).map((e) => e.symbol)
    expect(hits[0]).toBe('C')
    expect(hits.every((s) => s.toLowerCase().startsWith('c') || el(s).name.toLowerCase().startsWith('c'))).toBe(true)
  })
})

describe('matchingNumbers', () => {
  it('matches everything when no filter is active', () => {
    expect(isFiltering(EMPTY_FILTERS)).toBe(false)
    expect(matchingNumbers(elements, EMPTY_FILTERS).size).toBe(118)
  })
  it('filters by category', () => {
    const f = { ...EMPTY_FILTERS, categories: new Set(['halogen' as const]) }
    expect([...matchingNumbers(elements, f)]).toEqual([9, 17, 35, 53, 85, 117])
  })
  it('combines categories as OR and different filters as AND', () => {
    const both = { ...EMPTY_FILTERS, categories: new Set(['halogen' as const, 'noble-gas' as const]) }
    expect(matchingNumbers(elements, both).size).toBe(13)
    expect(matchingNumbers(elements, { ...both, period: 2 }).size).toBe(2) // F, Ne
  })
  it('filters by period, group and block', () => {
    expect(matchingNumbers(elements, { ...EMPTY_FILTERS, period: 3 }).size).toBe(8)
    expect(matchingNumbers(elements, { ...EMPTY_FILTERS, group: 1 }).size).toBe(7)
    expect(matchingNumbers(elements, { ...EMPTY_FILTERS, block: 'f' }).size).toBe(28)
    expect(matchingNumbers(elements, { ...EMPTY_FILTERS, group: 3 }).size).toBe(4) // Sc, Y, Lu, Lr
  })
  it('applies the text query together with other filters', () => {
    const f = { ...EMPTY_FILTERS, query: 'ium', categories: new Set(['alkali-metal' as const]) }
    expect([...matchingNumbers(elements, f)].sort((a, b) => a - b)).toEqual([3, 11, 19, 37, 55, 87]) // Li Na K Rb Cs Fr: all end in -ium
  })
})

describe('gridNav', () => {
  it('moves along a row and skips empty cells', () => {
    expect(neighbor(elements, el('H'), 'right')?.symbol).toBe('He')
    expect(neighbor(elements, el('Be'), 'right')?.symbol).toBe('B')
    expect(neighbor(elements, el('Ne'), 'right')).toBeUndefined()
    expect(neighbor(elements, el('B'), 'left')?.symbol).toBe('Be')
  })
  it('moves between rows in the same column', () => {
    expect(neighbor(elements, el('Fe'), 'down')?.symbol).toBe('Ru')
    // Row 3 has no group-8 cell; the nearest occupied column is group 13 (Al), 5 away, vs Mg 6 away.
    expect(neighbor(elements, el('Fe'), 'up')?.symbol).toBe('Al')
    expect(neighbor(elements, el('Na'), 'down')?.symbol).toBe('K')
    expect(neighbor(elements, el('H'), 'down')?.symbol).toBe('Li')
  })
  it('crosses from the main table to the f-block rows', () => {
    expect(neighbor(elements, el('Og'), 'down')?.symbol).toBe('Lu') // nearest occupied column in the lanthanoid row
    expect(neighbor(elements, el('H'), 'up')).toBeUndefined()
    expect(neighbor(elements, el('Ra'), 'down')?.position.row).toBe(9)
    expect(neighbor(elements, el('Lu'), 'down')?.symbol).toBe('Lr')
    expect(neighbor(elements, el('Lr'), 'down')).toBeUndefined()
  })
})

describe('format', () => {
  it('uses bracketed mass numbers where no standard weight exists', () => {
    expect(formatMassShort(el('Og'))).toBe('[294]')
    expect(formatMassShort(el('Fe'))).toBe('55.845')
    expect(formatMassShort(el('H'))).toBe('1.008')
  })
  it('converts kelvin to celsius', () => {
    expect(formatKelvin(273.15)).toBe('273.15 K (0 \u00b0C)')
    expect(formatKelvin(1811)).toBe('1811 K (1537.9 \u00b0C)')
    expect(formatKelvin(0.5)).toBe('0.5 K (-272.7 \u00b0C)')
    expect(formatKelvin(1234.93)).toBe('1234.93 K (961.8 \u00b0C)')
  })
  it('only reports neutrons when an isotope is identified', () => {
    expect(formatNeutrons(el('Fe'))).toBe('Depends on the isotope (see the isotope explorer)')
    expect(formatNeutrons(el('Tc'))).toBe('55 (in the isotope with mass number 98)')
  })
  it('labels missing data differently for the heaviest elements', () => {
    expect(missingLabel(el('Fe'))).toBe('Not in dataset')
    expect(missingLabel(el('Og'))).toBe('Not established')
  })
  it('describes discovery without inventing details', () => {
    expect(describeDiscovery(el('Fe'))).toBe('Known since antiquity (no individual discoverer)')
    expect(describeDiscovery(el('Na'))).toMatch(/^1807/)
    expect(describeDiscovery(el('Og'))).toMatch(/2002|2006|2010|Dubna|Oganessian|JINR|Livermore/i)
  })
})

describe('formatUncertainty', () => {
  it('never uses scientific notation', () => {
    expect(formatUncertainty(3.3e-7)).toBe('0.00000033')
    expect(formatUncertainty(0.002)).toBe('0.002')
    expect(formatUncertainty(0.0000000123)).toBe('0.000000012')
    expect(formatUncertainty(12)).toBe('12')
  })
})

describe('explorer reducer', () => {
  it('toggles categories and resets', () => {
    let s = initialState('table')
    s = reducer(s, { type: 'toggleCategory', category: 'halogen' })
    expect(s.filters.categories.has('halogen')).toBe(true)
    s = reducer(s, { type: 'toggleCategory', category: 'halogen' })
    expect(s.filters.categories.size).toBe(0)
    s = reducer(s, { type: 'setQuery', query: 'iron' })
    s = reducer(s, { type: 'setPeriod', period: 4 })
    s = reducer(s, { type: 'resetFilters' })
    expect(isFiltering(s.filters)).toBe(false)
  })
  it('does not mutate previous state', () => {
    const a = initialState('list')
    const b = reducer(a, { type: 'toggleCategory', category: 'noble-gas' })
    expect(a.filters.categories.size).toBe(0)
    expect(b).not.toBe(a)
  })
})
