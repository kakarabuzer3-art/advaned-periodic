import { THEORETICAL_FROM_Z } from '../domain/canonical.ts'
import { CATEGORIES } from '../domain/classification.ts'
import type { ElementRecord } from '../domain/schema.ts'

function trim(n: number, digits: number): string {
  return String(Number(n.toFixed(digits)))
}

/** Compact mass for tiles: 55.845, or [294] for elements with no standard atomic weight. */
export function formatMassShort(el: ElementRecord): string {
  const { kind, value } = el.atomicMass
  return kind === 'massNumber' ? `[${value}]` : String(Number(value.toPrecision(5)))
}

export function formatKelvin(k: number): string {
  // Work in hundredths of a kelvin so that e.g. 1811 K -> 1537.85 C rounds half-up to 1537.9
  // instead of suffering floating-point error from toFixed().
  const centiCelsius = Math.round(k * 100) - 27315
  const celsius = (Math.sign(centiCelsius) * Math.round(Math.abs(centiCelsius) / 10)) / 10 // half away from zero
  return `${trim(k, 2)} K (${celsius} \u00b0C)`
}

export function formatDensity(d: NonNullable<ElementRecord['density']>): string {
  return `${d.value} ${d.unit === 'g/cm3' ? 'g/cm\u00b3' : 'g/L'}`
}

export function describeDiscovery(el: ElementRecord): string {
  const d = el.discovery
  if (d.ancient) return 'Known since antiquity (no individual discoverer)'
  const parts = [d.year !== null ? String(d.year) : null, d.discoverers, d.location ? `(${d.location})` : null].filter(Boolean)
  return parts.length ? parts.join(' ') : missingLabel(el)
}

/** Label for a missing value. Z >= 100 is "not established": nothing bulk has been measured. */
export function missingLabel(el: ElementRecord): string {
  return el.number >= THEORETICAL_FROM_Z ? 'Not established' : 'Not in dataset'
}

export function formatNeutrons(el: ElementRecord): string {
  if (el.atomicMass.kind === 'massNumber') {
    return `${el.atomicMass.value - el.number} (in the isotope with mass number ${el.atomicMass.value})`
  }
  return 'Depends on the isotope (see the isotope explorer)'
}

/**
 * Accessible name for a table tile. It STARTS with the tile's visible text, in visible
 * order (number, symbol, name, mass), so voice-control users can say what they see
 * (WCAG 2.5.3 Label in Name), then adds context that is not visible.
 */
export function tileLabel(e: ElementRecord): string {
  const visible = `${e.number} ${e.symbol} ${e.name} ${formatMassShort(e)}`
  const context = [
    CATEGORIES[e.category].label + (e.classificationBasis === 'predicted' ? ' (predicted)' : ''),
    `period ${e.period}`,
    e.group === null ? 'no group' : `group ${e.group}`,
  ]
  return `${visible}, ${context.join(', ')}`
}

/** An uncertainty as a plain decimal with two significant digits: 3.3e-7 becomes "0.00000033". */
export function formatUncertainty(u: number): string {
  return u.toLocaleString('en-US', { maximumSignificantDigits: 2, maximumFractionDigits: 20, useGrouping: false })
}
