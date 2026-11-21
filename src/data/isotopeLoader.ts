import { IsotopeFileSchema, type Isotope, type IsotopeFile } from '../domain/isotopes.ts'

let cache: Promise<IsotopeFile> | null = null

/** Isotope data is ~0.9 MB, so it loads on demand, once, and is validated on arrival. */
export function loadIsotopes(): Promise<IsotopeFile> {
  cache ??= import('./isotopes.json')
    .then((m) => IsotopeFileSchema.parse(m.default))
    .catch((error: unknown) => {
      cache = null // allow a retry
      throw error
    })
  return cache
}

export function isotopesOf(file: IsotopeFile, z: number): readonly Isotope[] {
  return file.byZ[String(z)] ?? []
}

/**
 * Abundance-weighted mean of isotope masses, in u. This is how a standard atomic weight arises.
 * Returns null for elements with no naturally occurring isotope (they have no standard weight).
 */
export function weightedAtomicMass(isotopes: readonly Isotope[]): number | null {
  const natural = isotopes.filter((i) => i.abundance !== null)
  if (natural.length === 0) return null
  const total = natural.reduce((s, i) => s + (i.abundance ?? 0), 0)
  return natural.reduce((s, i) => s + i.mass * (i.abundance ?? 0), 0) / total
}
