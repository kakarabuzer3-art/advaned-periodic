import { z } from 'zod'
import { CANONICAL_ELEMENTS, ELEMENT_COUNT } from './canonical.ts'
import { CATEGORY_IDS } from './classification.ts'
import { positionOf, blockOf, groupOf, periodOf } from './layout.ts'

const nullableNumber = z.number().finite().nullable()

export const ElementSchema = z
  .strictObject({
    number: z.number().int().min(1).max(ELEMENT_COUNT),
    symbol: z.string().regex(/^[A-Z][a-z]?$/),
    name: z.string().min(3),

    period: z.number().int().min(1).max(7),
    group: z.number().int().min(1).max(18).nullable(),
    block: z.enum(['s', 'p', 'd', 'f']),
    position: z.strictObject({
      row: z.number().int().min(1).max(10),
      col: z.number().int().min(1).max(18),
      section: z.enum(['main', 'lanthanoid', 'actinoid']),
    }),

    category: z.enum(CATEGORY_IDS),
    classificationBasis: z.enum(['established', 'predicted']),
    classificationNote: z.string().optional(),

    /** 'standard' = conventional standard atomic weight (u). 'massNumber' = mass number of a long-lived isotope, shown in brackets. */
    atomicMass: z.strictObject({
      kind: z.enum(['standard', 'massNumber']),
      value: z.number().positive(),
      /** Standard uncertainty in the last digits; null where the source gives a conventional value without one. */
      uncertainty: z.number().positive().nullable(),
    }),

    /** Physical state at 298.15 K and 1 atm; checked against melting/boiling points in the tests. */
    phase: z.enum(['Solid', 'Liquid', 'Gas']).nullable(),
    appearance: z.string().nullable(),
    density: z.strictObject({ value: z.number().positive(), unit: z.enum(['g/cm3', 'g/L']) }).nullable(),
    meltingPointK: nullableNumber,
    boilingPointK: nullableNumber,
    molarHeatJPerMolK: nullableNumber,

    electronegativityPauling: nullableNumber,
    electronAffinityKJPerMol: nullableNumber,
    ionizationEnergiesKJPerMol: z.array(z.number().positive()),

    shells: z.array(z.number().int().positive()).min(1).max(7),
    electronConfiguration: z.string().min(2),
    electronConfigurationShort: z.string().min(2),
    /** False when the source marks the configuration as not yet confirmed. */
    electronConfigurationConfirmed: z.boolean(),

    namedBy: z.string().nullable(),
    discovery: z.strictObject({
      year: z.number().int().nullable(),
      discoverers: z.string().nullable(),
      location: z.string().nullable(),
      /** Known since antiquity: no individual discoverer or year. */
      ancient: z.boolean(),
    }),
    nameOrigin: z.string().nullable(),
    /** Main applications as compiled by the secondary source; original source not stated. */
    uses: z.string().nullable(),
    /** Where the element is found / how it is obtained, as compiled by the secondary source. */
    occurrence: z.string().nullable(),
    abundanceCrustMgPerKg: z.number().nonnegative().nullable(),
    abundanceSeaMgPerL: z.number().nonnegative().nullable(),
    thermalConductivityWPerMK: nullableNumber,
    oxidationStates: z.strictObject({ common: z.array(z.number().int()), other: z.array(z.number().int()) }),
    /** First ionisation energy from NIST ASD (via the mendeleev package). */
    ionizationEnergy1: z
      .strictObject({
        eV: z.number().positive(),
        kJPerMol: z.number().positive(),
        uncertaintyEV: z.number().nonnegative().nullable(),
        basis: z.enum(['measured', 'semi-empirical', 'theoretical']),
      })
      .nullable(),
    summary: z.string().min(20),

    noStableIsotope: z.boolean(),
    /** True from Z=100 up: numeric property values are estimates or predictions. */
    propertiesTheoretical: z.boolean(),

    sourceUrl: z.url(),
  })
  .superRefine((el, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message: `${el.symbol}: ${message}` })
    const canon = CANONICAL_ELEMENTS[el.number - 1]
    if (!canon || canon[0] !== el.symbol) issue('symbol does not match canonical list')
    if (canon && canon[1] !== el.name) issue('name does not match canonical list')
    if (el.period !== periodOf(el.number)) issue('period mismatch')
    if (el.group !== groupOf(el.number)) issue('group mismatch')
    if (el.block !== blockOf(el.number)) issue('block mismatch')
    const pos = positionOf(el.number)
    if (pos.row !== el.position.row || pos.col !== el.position.col || pos.section !== el.position.section) {
      issue('position mismatch')
    }
    if (el.shells.reduce((a, b) => a + b, 0) !== el.number) issue('shell electrons do not sum to atomic number')
    if (el.meltingPointK !== null && el.boilingPointK !== null && el.meltingPointK >= el.boilingPointK) {
      // Carbon and arsenic sublime; the source gives triple-point values, so equality or inversion is not auto-rejected.
      if (el.number !== 6 && el.number !== 33) issue('melting point is not below boiling point')
    }
  })

export type ElementRecord = z.infer<typeof ElementSchema>

export const ElementListSchema = z
  .array(ElementSchema)
  .length(ELEMENT_COUNT)
  .superRefine((list, ctx) => {
    list.forEach((el, i) => {
      if (el.number !== i + 1) ctx.addIssue({ code: 'custom', message: `index ${i} holds element ${el.number}` })
    })
    const cells = new Set(list.map((e) => `${e.position.row}:${e.position.col}`))
    if (cells.size !== ELEMENT_COUNT) ctx.addIssue({ code: 'custom', message: 'two elements share a table cell' })
  })

export const FIELD_STATUSES = [
  'critically-evaluated',
  'experimentally-established',
  'compiled-secondary',
  'predicted',
  'unknown',
  'not-applicable',
] as const
export type FieldStatus = (typeof FIELD_STATUSES)[number]

export const DatasetSchema = z.strictObject({
  meta: z.strictObject({
    generatedFrom: z.string(),
    upstreamRepository: z.url(),
    upstreamLicense: z.string(),
    rawSha256: z.string().length(64),
    mendeleevSha256: z.string().length(64),
    retrieved: z.string(),
    sources: z.array(z.strictObject({ id: z.string(), name: z.string(), version: z.string().nullable(), role: z.string(), url: z.string() })),
    /** Dataset-wide provenance per field: which source, and how far to trust it. */
    fieldStatus: z.record(z.string(), z.strictObject({ sourceId: z.string(), status: z.enum(FIELD_STATUSES), note: z.string().optional() })),
    crossChecks: z.strictObject({
      isotopesVsNist: z.strictObject({
        reference: z.string(),
        compared: z.number().int(),
        massDisagreements: z.number().int(),
        abundanceDisagreements: z.array(z.string()),
        referenceHasNoValue: z.array(z.string()),
      }),
      atomicWeightCommunityVsCiaaw: z.array(z.string()),
      ionizationEnergy1CommunityVsNist: z.array(z.string()),
    }),
    droppedRecords: z.array(z.string()),
    nameOverrides: z.array(z.string()),
    categoryDisagreements: z.array(z.string()),
    corrections: z.array(z.string()),
    notes: z.array(z.string()),
  }),
  elements: ElementListSchema,
})

export type Dataset = z.infer<typeof DatasetSchema>
