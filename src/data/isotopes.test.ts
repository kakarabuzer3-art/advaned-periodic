import { describe, expect, it } from 'vitest'
import { NO_STANDARD_ATOMIC_WEIGHT } from '../domain/canonical.ts'
import { IsotopeFileSchema, halfLifeSeconds, neutronsOf, stabilityOf, type Isotope } from '../domain/isotopes.ts'
import raw from './isotopes.json'
import { elements } from './index.ts'

const parsed = IsotopeFileSchema.parse(raw)
const byZ = (z: number): Isotope[] => parsed.byZ[String(z)] ?? []
const iso = (sym: string, a: number): Isotope => {
  const z = elements.find((e) => e.symbol === sym)!.number
  return byZ(z).find((i) => i.a === a)!
}
const all = Object.entries(parsed.byZ).flatMap(([z, list]) => list.map((i) => ({ z: Number(z), i })))

describe('isotope dataset integrity', () => {
  it('covers all 118 elements with 3557 isotopes', () => {
    expect(Object.keys(parsed.byZ)).toHaveLength(118)
    expect(all).toHaveLength(3557)
  })

  it('has mass numbers at least Z, sorted and unique, with masses within 0.5 u of A', () => {
    for (let z = 1; z <= 118; z++) {
      const list = byZ(z)
      expect(list.length, `Z=${z}`).toBeGreaterThan(0)
      for (let k = 0; k < list.length; k++) {
        const x = list[k]!
        expect(x.a, `Z=${z} A=${x.a}`).toBeGreaterThanOrEqual(z)
        if (k > 0) expect(x.a).toBeGreaterThan(list[k - 1]!.a)
        expect(Math.abs(x.mass - x.a), `Z=${z} A=${x.a}`).toBeLessThan(0.5)
      }
    }
  })

  it('has natural abundances that sum to 100 % for every element that has any', () => {
    for (let z = 1; z <= 118; z++) {
      const ab = byZ(z).flatMap((i) => (i.abundance === null ? [] : [i.abundance]))
      if (ab.length) expect(Math.abs(ab.reduce((a, b) => a + b, 0) - 100), `Z=${z}`).toBeLessThan(0.1)
    }
  })

  it('agrees with the independent list: no natural isotope exactly where there is no standard atomic weight', () => {
    const noNatural = new Set(Object.keys(parsed.byZ).map(Number).filter((z) => byZ(z).every((i) => i.abundance === null)))
    expect([...noNatural].sort((a, b) => a - b)).toEqual([...NO_STANDARD_ATOMIC_WEIGHT].sort((a, b) => a - b))
  })
})

describe('stability classification', () => {
  it('does not trust the source "is radioactive" flag: unbound nuclides are not stable', () => {
    expect(stabilityOf(iso('Li', 12))).toBe('unmeasured')
    expect(stabilityOf(iso('C', 21))).toBe('unmeasured')
  })

  it('finds about 251 stable nuclides, 10 for tin (the most of any element), none for Tc, Pm and Bi onward', () => {
    const stable = all.filter((x) => stabilityOf(x.i) === 'stable')
    expect(stable.length).toBeGreaterThanOrEqual(248)
    expect(stable.length).toBeLessThanOrEqual(256)
    const perElement = new Map<number, number>()
    for (const s of stable) perElement.set(s.z, (perElement.get(s.z) ?? 0) + 1)
    expect(perElement.get(50)).toBe(10)
    expect(Math.max(...perElement.values())).toBe(10)
    const without = Array.from({ length: 118 }, (_, k) => k + 1).filter((z) => !perElement.has(z))
    expect(without).toEqual([43, 61, ...Array.from({ length: 118 - 83 + 1 }, (_, k) => 83 + k)])
  })

  it('treats isotopes with a measured half-life as radioactive, including very long-lived ones', () => {
    expect(stabilityOf(iso('K', 40))).toBe('radioactive') // naturally occurring but radioactive
    expect(stabilityOf(iso('Bi', 209))).toBe('radioactive')
    expect(stabilityOf(iso('Fe', 56))).toBe('stable')
    expect(stabilityOf(iso('Pb', 208))).toBe('stable')
    expect(stabilityOf(iso('Ar', 36))).toBe('stable') // allowed-but-never-observed decay does not count
  })
})

describe('known values', () => {
  it('reproduces NIST natural abundances for iron', () => {
    const fe = byZ(26)
    const ab = (a: number) => fe.find((i) => i.a === a)!.abundance
    expect([ab(54), ab(56), ab(57), ab(58)]).toEqual([5.845, 91.754, 2.119, 0.282])
  })

  it('has exact or well-known masses', () => {
    expect(iso('C', 12).mass).toBeCloseTo(12, 6) // defines the atomic mass unit
    expect(iso('H', 1).mass).toBeCloseTo(1.00782503, 6)
  })

  it('has well-known half-lives', () => {
    const c14 = iso('C', 14).halfLife!
    expect(halfLifeSeconds(c14) / 31556926).toBeCloseTo(5700, -2) // about 5700 years
    const u238 = iso('U', 238).halfLife!
    expect(halfLifeSeconds(u238) / 31556926 / 1e9).toBeCloseTo(4.46, 1) // about 4.47 billion years
    expect(iso('U', 238).decay.some((d) => d.mode === 'A' && d.observed)).toBe(true)
  })

  it('computes neutrons only from a named isotope: N = A - Z', () => {
    expect(neutronsOf(56, 26)).toBe(30)
    expect(neutronsOf(238, 92)).toBe(146)
    expect(neutronsOf(1, 1)).toBe(0)
    expect(neutronsOf(98, 43)).toBe(55)
  })

  it('marks bismuth as having no strictly stable isotope', () => {
    expect(elements.find((e) => e.symbol === 'Bi')!.noStableIsotope).toBe(true)
  })
})
