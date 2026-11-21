import { z } from 'zod'

/** Half-life units used by the source, with plain-English names. */
export const HALF_LIFE_UNITS = {
  ysec: { short: 'ys', long: 'yoctoseconds (10\u207B\u00B2\u2074 s)', seconds: 1e-24 },
  zsec: { short: 'zs', long: 'zeptoseconds (10\u207B\u00B2\u00B9 s)', seconds: 1e-21 },
  asec: { short: 'as', long: 'attoseconds (10\u207B\u00B9\u2078 s)', seconds: 1e-18 },
  psec: { short: 'ps', long: 'picoseconds', seconds: 1e-12 },
  nsec: { short: 'ns', long: 'nanoseconds', seconds: 1e-9 },
  usec: { short: '\u00B5s', long: 'microseconds', seconds: 1e-6 },
  msec: { short: 'ms', long: 'milliseconds', seconds: 1e-3 },
  sec: { short: 's', long: 'seconds', seconds: 1 },
  minute: { short: 'min', long: 'minutes', seconds: 60 },
  hour: { short: 'h', long: 'hours', seconds: 3600 },
  day: { short: 'd', long: 'days', seconds: 86400 },
  year: { short: 'y', long: 'years', seconds: 31556926 },
  kyear: { short: 'ky', long: 'thousand years', seconds: 31556926e3 },
  Myear: { short: 'My', long: 'million years', seconds: 31556926e6 },
  Gyear: { short: 'Gy', long: 'billion years', seconds: 31556926e9 },
  Tyear: { short: 'Ty', long: 'trillion years', seconds: 31556926e12 },
  Pyear: { short: 'Py', long: 'quadrillion years', seconds: 31556926e15 },
  Eyear: { short: 'Ey', long: 'quintillion years', seconds: 31556926e18 },
  Zyear: { short: 'Zy', long: 'sextillion years', seconds: 31556926e21 },
  Yyear: { short: 'Yy', long: 'septillion years', seconds: 31556926e24 },
} as const

export type HalfLifeUnit = keyof typeof HALF_LIFE_UNITS

const unit = z.enum(Object.keys(HALF_LIFE_UNITS) as [HalfLifeUnit, ...HalfLifeUnit[]])

export const IsotopeSchema = z.strictObject({
  /** Mass number A = protons + neutrons. */
  a: z.number().int().positive(),
  /** Atomic mass of this isotope in unified atomic mass units (u). */
  mass: z.number().positive(),
  massUnc: z.number().nonnegative().nullable(),
  /** Natural abundance in percent (atom fraction); null when the isotope does not occur naturally. */
  abundance: z.number().min(0).max(100).nullable(),
  abundanceUnc: z.number().nonnegative().nullable(),
  /** False means no radioactive decay has been observed. */
  radioactive: z.boolean(),
  halfLife: z.strictObject({ value: z.number().positive(), unit, unc: z.number().nonnegative().nullable() }).nullable(),
  decay: z.array(z.strictObject({ mode: z.string(), intensity: z.number().nullable(), observed: z.boolean() })),
  /** Nuclear spin as written by the source, e.g. "1/2" or "0". */
  spin: z.string().nullable(),
})

export type Isotope = z.infer<typeof IsotopeSchema>

export const IsotopeFileSchema = z.strictObject({
  meta: z.strictObject({
    source: z.string(),
    massSource: z.string(),
    nuclearDataSource: z.string(),
    retrieved: z.string(),
    rawSha256: z.string().length(64),
    note: z.string(),
  }),
  byZ: z.record(z.string().regex(/^\d+$/), z.array(IsotopeSchema).min(1)),
})

export type IsotopeFile = z.infer<typeof IsotopeFileSchema>

/** Neutrons in a specific isotope. Never defined for an element without naming the isotope. */
export function neutronsOf(massNumber: number, atomicNumber: number): number {
  return massNumber - atomicNumber
}

export type Stability = 'stable' | 'radioactive' | 'unmeasured'

/**
 * Stability class, derived defensively. The source's own "is radioactive" flag is NOT used: it is false for
 * particle-unbound nuclides such as Li-12 that have no measured half-life.
 *   stable      occurs naturally, has no half-life, and no decay has ever been OBSERVED
 *               (some are predicted to decay in theory; "stable" here means "never seen to decay")
 *   radioactive a half-life has been measured
 *   unmeasured  no half-life is established (typically extremely short-lived or unbound)
 */
export function stabilityOf(iso: Pick<Isotope, 'abundance' | 'halfLife' | 'decay'>): Stability {
  if (iso.halfLife) return 'radioactive'
  if (iso.abundance !== null && !iso.decay.some((d) => d.observed)) return 'stable'
  return 'unmeasured'
}

export function halfLifeSeconds(h: NonNullable<Isotope['halfLife']>): number {
  return h.value * HALF_LIFE_UNITS[h.unit].seconds
}

/** "2.7562 y", "8.275 h", "1.248 Gy". Short unit labels; use HALF_LIFE_UNITS for the long names. */
export function formatHalfLife(h: NonNullable<Isotope['halfLife']>): string {
  return `${Number(h.value.toPrecision(5))} ${HALF_LIFE_UNITS[h.unit].short}`
}

/** Plain-English names for the decay-mode codes used by NUBASE. Unknown codes are shown as written. */
export const DECAY_LABELS: Record<string, string> = {
  A: 'alpha decay', 'B-': 'beta-minus decay', 'B+': 'beta-plus decay', EC: 'electron capture', IT: 'isomeric transition',
  SF: 'spontaneous fission', N: 'neutron emission', P: 'proton emission', '2N': 'two-neutron emission', '2P': 'two-proton emission',
}


/** The isotope to show first: the most abundant natural one, else the longest-lived. */
export function defaultIsotope(list: readonly Isotope[]): Isotope | undefined {
  const natural = list.filter((i) => i.abundance !== null)
  if (natural.length) return natural.reduce((a, b) => ((b.abundance ?? 0) > (a.abundance ?? 0) ? b : a))
  const timed = list.filter((i) => i.halfLife)
  if (timed.length) return timed.reduce((a, b) => (halfLifeSeconds(b.halfLife!) > halfLifeSeconds(a.halfLife!) ? b : a))
  return list[0]
}
