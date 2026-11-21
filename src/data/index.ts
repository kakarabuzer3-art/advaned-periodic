import { DatasetSchema, type Dataset, type ElementRecord } from '../domain/schema.ts'
import raw from './elements.json'

/**
 * Parsed once at module load. The dataset is validated at build time too;
 * validating here as well means a corrupted file fails loudly instead of
 * rendering wrong science.
 */
const parsed = DatasetSchema.safeParse(raw)
if (!parsed.success) {
  throw new Error(`Element dataset failed validation: ${parsed.error.issues[0]?.message ?? 'unknown error'}`)
}

const dataset: Dataset = parsed.data

export const elements: readonly ElementRecord[] = dataset.elements
export const datasetMeta = dataset.meta

const bySymbol = new Map(elements.map((e) => [e.symbol.toLowerCase(), e]))

export function getElementBySymbol(symbol: string): ElementRecord | undefined {
  return bySymbol.get(symbol.toLowerCase())
}

export type { ElementRecord }
