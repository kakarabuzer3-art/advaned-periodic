import { describe, expect, it } from 'vitest'
import { elements, getElementBySymbol } from '../../data/index.ts'
import { isotopesOf, weightedAtomicMass } from '../../data/isotopeLoader.ts'
import raw from '../../data/isotopes.json'
import { IsotopeFileSchema, halfLifeSeconds, neutronsOf } from '../../domain/isotopes.ts'
import { SYMBOL_ORIGINS } from '../practice/quizEngine.ts'
import { LESSONS } from '../start/lessons.ts'
import { GLOSSARY, getTerm, searchGlossary } from './glossary.ts'

const iso = IsotopeFileSchema.parse(raw)
const E = (s: string) => getElementBySymbol(s)!

describe('glossary integrity', () => {
  it('has unique ids, complete entries and only valid cross-references', () => {
    expect(new Set(GLOSSARY.map((t) => t.id)).size).toBe(GLOSSARY.length)
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(35)
    for (const t of GLOSSARY) {
      expect(t.term.trim().length, t.id).toBeGreaterThan(2)
      for (const f of [t.short, t.plain, t.example]) expect(f.trim().length, t.id).toBeGreaterThan(8)
      expect(t.related.length, t.id).toBeGreaterThan(0)
      for (const r of t.related) expect(getTerm(r), `${t.id} -> ${r}`).toBeDefined()
      expect(t.related).not.toContain(t.id)
    }
  })

  it('covers every term the directive names', () => {
    for (const id of ['atomic-number', 'isotope', 'electronegativity', 'ionization-energy', 'valence-electron', 'electron-configuration']) expect(getTerm(id)).toBeDefined()
  })

  it('qualifies the concepts that are easy to teach wrongly', () => {
    expect(getTerm('ionization-energy')!.short).toMatch(/isolated gaseous/)
    expect(getTerm('valence-electron')!.caution).toMatch(/transition metals/)
    expect(getTerm('molecule')!.caution).toMatch(/Ionic compounds/)
    expect(getTerm('oxidation-state')!.caution).toMatch(/bookkeeping/)
    expect(getTerm('electron-shell')!.plain).toMatch(/simplified/)
    expect(getTerm('orbital')!.plain).toMatch(/not paths/)
    expect(getTerm('atomic-weight')!.caution).toMatch(/not the mass of any single atom/)
  })

  it('searches by term and by words in the explanation', () => {
    expect(searchGlossary('isotope')[0]!.id).toBe('isotope')
    expect(searchGlossary('').length).toBe(GLOSSARY.length)
    expect(searchGlossary('zzzz')).toEqual([])
    expect(searchGlossary('dalton').map((t) => t.id)).toContain('atomic-mass-unit')
  })
})

describe('glossary examples agree with the data', () => {
  it('matches the element facts quoted in the examples', () => {
    expect(E('Na').number).toBe(11) // "A neutral sodium atom has 11 electrons"
    expect(E('Na').shells).toEqual([2, 8, 1])
    expect(E('O').electronConfigurationShort).toBe('[He] 2s2 2p4')
    expect(E('O').number).toBe(8)
    expect(E('Li').number).toBe(3) // period 2 runs from lithium (3) to neon (10)
    expect(E('Ne').number).toBe(10)
    expect(elements.filter((e) => e.period === 2).map((e) => e.symbol)).toEqual(['Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne'])
    expect(elements.filter((e) => e.group === 18).map((e) => e.symbol)).toEqual(['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn', 'Og'])
    expect(E('He')).toMatchObject({ block: 's', group: 18 }) // block caution
    expect(E('F').electronegativityPauling).toBe(3.98) // "about 3.98"
    expect(E('Fe').block).toBe('d')
    expect(elements).toHaveLength(118)
  })

  it('has isotope numbers that match the examples', () => {
    const has = (sym: string, a: number) => isotopesOf(iso, E(sym).number).some((i) => i.a === a)
    expect(neutronsOf(56, 26)).toBe(30)
    expect([has('H', 1), has('H', 2), has('H', 3)]).toEqual([true, true, true])
    expect(neutronsOf(2, 1)).toBe(1)
    expect(neutronsOf(3, 1)).toBe(2)
    expect(neutronsOf(12, 6)).toBe(6)
    expect(neutronsOf(14, 6)).toBe(8)
    const c12 = isotopesOf(iso, 6).find((i) => i.a === 12)!
    expect(c12.mass).toBeCloseTo(12, 8) // "a carbon-12 atom has a mass of exactly 12 u"
    const c14 = isotopesOf(iso, 6).find((i) => i.a === 14)!
    const years = halfLifeSeconds(c14.halfLife!) / 31556926 // stored as 5.7 "kyear"
    expect(years).toBeGreaterThan(5600) // "about 5,700 years"
    expect(years).toBeLessThan(5800)
  })

  it('reproduces the CIAAW atomic weight from isotope masses and abundances', () => {
    // "chlorine is about 76 % chlorine-35 and 24 % chlorine-37, so its atomic weight is about 35.45"
    const cl = isotopesOf(iso, 17)
    expect(cl.find((i) => i.a === 35)!.abundance).toBeCloseTo(76, 0)
    expect(cl.find((i) => i.a === 37)!.abundance).toBeCloseTo(24, 0)
    expect(weightedAtomicMass(cl)!).toBeCloseTo(35.45, 2)
    // The same check for every element that has a standard weight (84 of them).
    const off: string[] = []
    let checked = 0
    for (const e of elements) {
      if (e.atomicMass.kind !== 'standard') continue
      checked++
      const avg = weightedAtomicMass(isotopesOf(iso, e.number))!
      const tolerance = Math.max(0.01, 3 * (e.atomicMass.uncertainty ?? 0), e.atomicMass.value * 2e-4)
      if (Math.abs(avg - e.atomicMass.value) > tolerance) off.push(`${e.symbol}: ${avg.toFixed(4)} vs ${e.atomicMass.value}`)
    }
    expect(checked).toBe(84)
    // Lithium is the one exception, and a genuine one: IUPAC publishes a RANGE for lithium because its isotopic composition varies
    // in nature. 6.94 is the conventional value; the single abundance table gives 6.9675.
    expect(off).toEqual(['Li: 6.9675 vs 6.94'])
    expect(E('Li').atomicMass.uncertainty).toBeNull()
  })
})

describe('introductory lessons', () => {
  it('has the eight required lessons, each with explanation, example, visual and one question', () => {
    expect(LESSONS.map((l) => l.id)).toEqual(['matter', 'element', 'atom', 'particles', 'atomic-number', 'symbols', 'groups', 'periods'])
    for (const l of LESSONS) {
      expect(l.explanation.length).toBeGreaterThan(40)
      expect(l.example.length).toBeGreaterThan(30)
      expect(l.visualAlt.length).toBeGreaterThan(30)
      expect(l.question.options.length).toBeGreaterThanOrEqual(3)
      expect(l.question.correctIndex).toBeLessThan(l.question.options.length)
      expect(new Set(l.question.options).size).toBe(l.question.options.length)
      expect(l.question.right.length).toBeGreaterThan(10)
      expect(l.question.wrong.length).toBeGreaterThan(30) // teaches, not just "incorrect"
      for (const t of l.terms) expect(getTerm(t), `${l.id} term ${t}`).toBeDefined()
    }
  })

  it('has correct answers that agree with the dataset', () => {
    const q = (id: string) => LESSONS.find((l) => l.id === id)!.question
    const ans = (id: string) => q(id).options[q(id).correctIndex]
    expect(ans('matter')).toBe('The air inside a balloon')
    expect(ans('element')).toBe('Iron')
    expect(ans('atom')).toBe('The nucleus')
    expect(ans('particles')).toBe('8')
    expect(elements[25]!.name).toBe(ans('atomic-number')) // 26 protons
    expect(E('Cu').number).toBe(29) // wrong-answer text: "Copper is 29 and carbon is 6"
    expect(E('C').number).toBe(6)
    expect(E('Au').name).toBe('Gold')
    expect(ans('symbols')).toBe('Au')
    expect(E('Ag').name).toBe('Silver')
    expect(ans('groups')).toBe(String(Math.max(...elements.map((e) => e.group ?? 0))))
    expect(Math.max(...elements.map((e) => e.period))).toBe(7)
    expect(E('Na').period).toBe(3)
    const next = elements[E('Na').number]! // the element after sodium
    expect([next.name, next.period]).toEqual([ans('periods'), 3])
    expect(E('K').period).toBe(4)
    expect(E('Li').period).toBe(2)
    expect(E('Mg').number).toBe(12)
  })

  it('has lesson facts that agree with the data and the symbol-origin table', () => {
    for (const s of ['Fe', 'Au', 'Na', 'Pb']) expect(SYMBOL_ORIGINS[s]).toBeDefined()
    expect(LESSONS[1]!.explanation).toContain('118 known elements')
    expect(E('H').number + E('C').number + E('Au').number).toBe(1 + 6 + 79) // lesson "atomic number" tiles
    expect(E('C').shells).toEqual([2, 4]) // the drawn atom: 2 + 4 electrons
    expect(neutronsOf(12, 6)).toBe(6) // the drawn atom: carbon-12 has 6 neutrons
  })
})
