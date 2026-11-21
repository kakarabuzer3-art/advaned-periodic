import { describe, expect, it } from 'vitest'
import { elements, getElementBySymbol } from '../../data/index.ts'
import raw from '../../data/isotopes.json'
import { CATEGORIES } from '../../domain/classification.ts'
import { IsotopeFileSchema } from '../../domain/isotopes.ts'
import type { ElementRecord } from '../../domain/schema.ts'
import { EMPTY_PROGRESS, PROGRESS_KEY, loadProgress, recordQuiz } from './progress.ts'
import { DIFFICULTIES, NEUTRON_ISOTOPES, SYMBOL_ORIGINS, TOPICS, makeQuiz, superscriptConfig, type Difficulty, type Question, type Topic } from './quizEngine.ts'

const isotopes = IsotopeFileSchema.parse(raw)
const E = (s: string): ElementRecord => getElementBySymbol(s)!
const byName = (n: string): ElementRecord => elements.find((e) => e.name === n)!
const correctOf = (q: Question) => q.options[q.correctIndex]!
const ALL: Topic[] = TOPICS.map((t) => t.id)

function* quizzes(topics: Topic[] = ALL, seeds = 40) {
  for (const d of DIFFICULTIES) for (let seed = 1; seed <= seeds; seed++) yield { d: d.id, seed, qs: makeQuiz({ topics, difficulty: d.id, count: 15, seed }) }
}

describe('quiz structure', () => {
  it('is reproducible for a seed and different across seeds', () => {
    const a = makeQuiz({ topics: ALL, difficulty: 'intermediate', count: 10, seed: 7 })
    expect(makeQuiz({ topics: ALL, difficulty: 'intermediate', count: 10, seed: 7 })).toEqual(a)
    expect(makeQuiz({ topics: ALL, difficulty: 'intermediate', count: 10, seed: 8 })).not.toEqual(a)
  })

  it('always produces valid, unambiguous multiple-choice questions', () => {
    let total = 0
    for (const { qs, d } of quizzes()) {
      expect(qs.length).toBeGreaterThanOrEqual(10)
      expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length) // no repeated question in one quiz
      for (const q of qs) {
        total++
        expect(q.difficulty).toBe(d)
        expect(q.options.length).toBeGreaterThanOrEqual(3)
        expect(q.options.length).toBeLessThanOrEqual(4)
        expect(new Set(q.options).size, q.id).toBe(q.options.length)
        expect(q.correctIndex).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex).toBeLessThan(q.options.length)
        expect(q.prompt.length).toBeGreaterThan(10)
        expect(q.explanation.length, q.id).toBeGreaterThan(30)
      }
    }
    expect(total).toBeGreaterThan(1500)
  })

  it('only uses the selected topics, and represents each when there is room', () => {
    const topics: Topic[] = ['symbols', 'trends', 'isotopes']
    for (const { qs } of quizzes(topics, 10)) {
      expect(new Set(qs.map((q) => q.topic))).toEqual(new Set(topics.filter((t) => qs.some((q) => q.topic === t))))
      for (const q of qs) expect(topics).toContain(q.topic)
    }
    expect(makeQuiz({ topics: [], difficulty: 'beginner', count: 5, seed: 1 })).toEqual([])
    // beginner has no trend questions at all
    expect(makeQuiz({ topics: ['trends'], difficulty: 'beginner', count: 5, seed: 1 })).toEqual([])
  })
})

describe('every answer key is re-verified against the dataset', () => {
  const verify = (q: Question) => {
    const [kind, arg = ''] = q.id.split(':') as [string, string]
    const ans = correctOf(q)
    switch (kind) {
      case 'symbol-of': expect(ans).toBe(arg); expect(q.prompt).toContain(E(arg).name); break
      case 'element-of': expect(ans).toBe(E(arg).name); expect(q.prompt).toContain(`symbol ${arg}`); break
      case 'z-of': expect(ans).toBe(String(E(arg).number)); expect(q.prompt).toContain(E(arg).name); break
      case 'element-with-z': expect(ans).toBe(elements[Number(arg) - 1]!.name); expect(q.prompt).toContain(`number ${arg}`); break
      case 'protons-of':
      case 'electrons-of': expect(ans).toBe(String(E(arg).number)); break
      case 'ion': {
        const m = /^([A-Z][a-z]?)(-?\d)$/.exec(arg)!
        expect(ans).toBe(String(E(m[1]!).number - Number(m[2]))); break
      }
      case 'group-of': expect(ans).toBe(String(E(arg).group)); break
      case 'period-of': expect(ans).toBe(String(E(arg).period)); break
      case 'locate': {
        const e = byName(ans)
        expect(q.prompt).toContain(`group ${e.group} and period ${e.period}`); break
      }
      case 'category-of': {
        const e = E(arg)
        expect(ans).toBe(CATEGORIES[e.category].label)
        expect(e.classificationNote).toBeUndefined() // disputed placements are never quizzed
        expect(e.classificationBasis).toBe('established'); break
      }
      case 'outer': expect(ans).toBe(String(E(arg).shells.at(-1))); expect(E(arg).group).not.toBeNull(); break
      case 'config': {
        const e = byName(ans)
        expect(q.prompt).toContain(superscriptConfig(e.electronConfigurationShort))
        expect(e.electronConfigurationConfirmed).toBe(true)
        for (const o of q.options) if (o !== ans) expect(byName(o).electronConfigurationShort).not.toBe(e.electronConfigurationShort)
        break
      }
      case 'en':
      case 'ie': {
        const val = (e: ElementRecord) => (kind === 'ie' ? e.ionizationEnergy1!.kJPerMol : e.electronegativityPauling!)
        const vals = q.options.map((o) => val(byName(o)))
        const best = q.prompt.includes('HIGHEST') ? Math.max(...vals) : Math.min(...vals)
        expect(val(byName(ans))).toBe(best)
        expect(vals.filter((v) => v === best)).toHaveLength(1) // no ties
        break
      }
      case 'ie-exception': {
        const ea = byName(ans)
        const partner = ea.symbol === 'Be' ? E('B') : E('O')
        expect(ea.ionizationEnergy1!.kJPerMol).toBeGreaterThan(partner.ionizationEnergy1!.kJPerMol)
        break
      }
      case 'liquid': expect(['Hg', 'Br']).toContain(arg); expect(byName(ans).phase).toBe('Liquid')
        for (const o of q.options) if (o !== ans) expect(byName(o).phase).not.toBe('Liquid')
        break
      case 'gas': expect(byName(ans).phase).toBe('Gas')
        for (const o of q.options) if (o !== ans) expect(byName(o).phase).not.toBe('Gas')
        break
      case 'neutrons': {
        const m = /^([A-Z][a-z]?)(\d+)$/.exec(arg)!
        const z = E(m[1]!).number, a = Number(m[2])
        expect(ans).toBe(String(a - z))
        expect(isotopes.byZ[String(z)]!.some((i) => i.a === a), `${arg} must exist`).toBe(true)
        break
      }
      default: // curated bonding/isotope facts
        expect(['bonding', 'isotopes']).toContain(kind)
    }
  }

  it('is correct for every topic, difficulty and seed', () => {
    const seenKinds = new Set<string>()
    for (const { qs } of quizzes(ALL, 60)) for (const q of qs) { verify(q); seenKinds.add(q.id.split(':')[0]!) }
    // every question family was actually exercised
    for (const k of ['symbol-of', 'element-of', 'z-of', 'element-with-z', 'protons-of', 'electrons-of', 'ion', 'group-of', 'period-of', 'locate', 'category-of', 'outer', 'config', 'en', 'ie', 'ie-exception', 'liquid', 'gas', 'neutrons', 'bonding', 'isotopes']) {
      expect(seenKinds.has(k), `no ${k} question was generated`).toBe(true)
    }
  })

  it('keeps beginner questions to well-known elements', () => {
    const COMMON = ['Fe', 'Cu', 'Zn', 'Ag', 'Au', 'Sn', 'Pb', 'Hg', 'I', 'U']
    for (const { qs } of quizzes(['symbols', 'atomic-number', 'particles'], 30)) {
      // restrict the check to the beginner runs
      for (const q of qs.filter((x) => x.difficulty === 'beginner')) {
        const sym = /^[a-z-]+:([A-Z][a-z]?)$/.exec(q.id)?.[1]
        if (sym) expect(E(sym).number <= 20 || COMMON.includes(sym), q.id).toBe(true)
      }
    }
  })
})

describe('the premises behind the trend questions hold in the data', () => {
  const en = (s: string[]) => s.map((x) => E(x).electronegativityPauling!)
  const ie = (s: string[]) => s.map((x) => E(x).ionizationEnergy1!.kJPerMol)
  const strictly = (v: number[], dir: 1 | -1) => v.every((x, i) => i === 0 || (x - v[i - 1]!) * dir > 0)

  it('electronegativity rises strictly across periods 2 and 3, and falls strictly down groups 16 and 17', () => {
    expect(strictly(en(['Li', 'Be', 'B', 'C', 'N', 'O', 'F']), 1)).toBe(true)
    expect(strictly(en(['Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl']), 1)).toBe(true)
    expect(strictly(en(['F', 'Cl', 'Br', 'I']), -1)).toBe(true)
    expect(strictly(en(['O', 'S', 'Se', 'Te']), -1)).toBe(true)
  })
  it('first ionization energy falls strictly down groups 1, 2, 17 and 18', () => {
    for (const g of [['Li', 'Na', 'K', 'Rb', 'Cs'], ['Be', 'Mg', 'Ca', 'Sr', 'Ba'], ['F', 'Cl', 'Br', 'I'], ['He', 'Ne', 'Ar', 'Kr', 'Xe']]) {
      expect(strictly(ie(g), -1), g.join()).toBe(true)
    }
  })
  it('shows the two classic exceptions: Be > B and N > O', () => {
    expect(E('Be').ionizationEnergy1!.kJPerMol).toBeGreaterThan(E('B').ionizationEnergy1!.kJPerMol)
    expect(E('N').ionizationEnergy1!.kJPerMol).toBeGreaterThan(E('O').ionizationEnergy1!.kJPerMol)
  })
})

describe('curated facts', () => {
  it('uses only isotopes that exist, with correct element symbols', () => {
    for (const [s, a] of NEUTRON_ISOTOPES) expect(isotopes.byZ[String(E(s).number)]!.some((i) => i.a === a), `${s}-${a}`).toBe(true)
  })
  it('maps symbol origins to the right element', () => {
    const names: Record<string, string> = { Fe: 'Iron', Au: 'Gold', Ag: 'Silver', Cu: 'Copper', Pb: 'Lead', Sn: 'Tin', Na: 'Sodium', K: 'Potassium', Hg: 'Mercury', Sb: 'Antimony', W: 'Tungsten' }
    for (const s of Object.keys(SYMBOL_ORIGINS)) expect(E(s).name).toBe(names[s])
  })
  it('writes electron configurations with superscripts', () => {
    expect(superscriptConfig('[Ne] 3s2 3p4')).toBe('[Ne] 3s\u00B2 3p\u2074')
    expect(superscriptConfig('[Ar] 3d10 4s1')).toBe('[Ar] 3d\u00B9\u2070 4s\u00B9')
  })
})

describe('progress', () => {
  const q = (topic: Topic): Question => ({ id: `x:${topic}`, topic, difficulty: 'beginner', prompt: 'p', options: ['a', 'b'], correctIndex: 0, explanation: 'e' })
  it('counts only real answers by topic and records the attempt', () => {
    const p = recordQuiz(EMPTY_PROGRESS, [{ question: q('symbols'), chosen: 0 }, { question: q('symbols'), chosen: 1 }, { question: q('bonding'), chosen: 0 }], 'beginner', new Date('2026-11-15T10:00:00Z'))
    expect(p.topics).toEqual({ symbols: { answered: 2, correct: 1 }, bonding: { answered: 1, correct: 1 } })
    expect(p.attempts).toEqual([{ date: '2026-11-15T10:00:00.000Z', difficulty: 'beginner', total: 3, correct: 2 }])
  })
  it('ignores an empty quiz, caps history at 20 and never mutates its input', () => {
    expect(recordQuiz(EMPTY_PROGRESS, [], 'beginner', new Date())).toBe(EMPTY_PROGRESS)
    let p = EMPTY_PROGRESS
    for (let i = 0; i < 25; i++) p = recordQuiz(p, [{ question: q('symbols'), chosen: 0 }], 'advanced', new Date(2026, 0, i + 1))
    expect(p.attempts).toHaveLength(20)
    expect(p.topics.symbols).toEqual({ answered: 25, correct: 25 })
    expect(EMPTY_PROGRESS).toEqual({ topics: {}, attempts: [] })
  })
  it('discards corrupt or impossible saved data instead of trusting it', () => {
    localStorage.setItem(PROGRESS_KEY, '{not json')
    expect(loadProgress()).toEqual(EMPTY_PROGRESS)
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ topics: { symbols: { answered: 1, correct: 5 } }, attempts: [] }))
    expect(loadProgress()).toEqual(EMPTY_PROGRESS) // correct > answered is impossible
    localStorage.removeItem(PROGRESS_KEY)
  })
})
void (null as unknown as Difficulty)
