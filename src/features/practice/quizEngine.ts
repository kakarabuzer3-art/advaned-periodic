import { elements } from '../../data/index.ts'
import { CATEGORIES, CATEGORY_IDS } from '../../domain/classification.ts'
import type { ElementRecord } from '../../domain/schema.ts'

export type Topic =
  | 'elements' | 'symbols' | 'atomic-number' | 'particles' | 'group-period'
  | 'categories' | 'configuration' | 'trends' | 'bonding' | 'isotopes'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export const TOPICS: readonly { id: Topic; label: string }[] = [
  { id: 'elements', label: 'Element identification' },
  { id: 'symbols', label: 'Chemical symbols' },
  { id: 'atomic-number', label: 'Atomic number' },
  { id: 'particles', label: 'Protons, neutrons and electrons' },
  { id: 'group-period', label: 'Groups and periods' },
  { id: 'categories', label: 'Element categories' },
  { id: 'configuration', label: 'Electron configurations' },
  { id: 'trends', label: 'Periodic trends' },
  { id: 'bonding', label: 'Chemical bonding' },
  { id: 'isotopes', label: 'Isotopes' },
]
export const DIFFICULTIES: readonly { id: Difficulty; label: string }[] = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
]

export interface Question {
  /** Stable key built from the question's parameters, e.g. "symbol-of:Na". */
  id: string
  topic: Topic
  difficulty: Difficulty
  prompt: string
  options: string[]
  correctIndex: number
  /** Teaches the right idea. Shown after every answer, right or wrong. */
  explanation: string
  /** Glossary term that explains the underlying idea. */
  termId?: string
}

// ---------- seeded randomness (so tests are reproducible) ----------
export type Rng = () => number
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = <T,>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)] as T
function shuffle<T>(rng: Rng, list: readonly T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j] as T, a[i] as T]
  }
  return a
}
const sample = <T,>(rng: Rng, list: readonly T[], n: number): T[] => shuffle(rng, list).slice(0, n)

/** Build a question from the correct answer and distractors; option order is shuffled. */
function build(rng: Rng, q: Omit<Question, 'options' | 'correctIndex'> & { correct: string; distractors: readonly string[] }): Question | null {
  const distractors = [...new Set(q.distractors.filter((d) => d !== q.correct))].slice(0, 3)
  if (distractors.length < 2) return null
  const options = shuffle(rng, [q.correct, ...distractors])
  const { correct, distractors: _d, ...rest } = q
  void _d
  return { ...rest, options, correctIndex: options.indexOf(correct) }
}

// ---------- element pools ----------
const COMMON = ['Fe', 'Cu', 'Zn', 'Ag', 'Au', 'Sn', 'Pb', 'Hg', 'I', 'U']
function pool(d: Difficulty): ElementRecord[] {
  if (d === 'advanced') return [...elements]
  const max = d === 'beginner' ? 20 : 54
  return elements.filter((e) => e.number <= max || COMMON.includes(e.symbol))
}
const SUPER: Record<string, string> = { '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3', '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079' }
/** "[Ne] 3s2 3p4" -> "[Ne] 3s\u00B2 3p\u2074" */
export const superscriptConfig = (c: string): string => c.replace(/([spdf])(\d+)/g, (_m, o: string, n: string) => o + [...n].map((ch) => SUPER[ch] ?? ch).join(''))

export const SYMBOL_ORIGINS: Readonly<Record<string, string>> = {
  Fe: 'ferrum (Latin for iron)', Au: 'aurum (Latin for gold)', Ag: 'argentum (Latin for silver)', Cu: 'cuprum (Latin for copper)',
  Pb: 'plumbum (Latin for lead)', Sn: 'stannum (Latin for tin)', Na: 'natrium (the Latin-based name for sodium)',
  K: 'kalium (the Latin-based name for potassium)', Hg: 'hydrargyrum (from Latin and Greek, meaning liquid silver)',
  Sb: 'stibium (Latin for antimony)', W: 'wolfram (the German name for tungsten)',
}

interface Ctx { rng: Rng; d: Difficulty }
interface Generator { topic: Topic; levels: readonly Difficulty[]; make: (c: Ctx) => Question | null }

const el = (s: string) => elements.find((e) => e.symbol === s) as ElementRecord

// ---------- generators ----------
const GENERATORS: Generator[] = [
  // Element identification
  {
    topic: 'elements', levels: ['beginner', 'intermediate', 'advanced'],
    make: ({ rng, d }) => {
      const p = pool(d)
      const kind = pick(rng, ['liquid', 'gas'] as const)
      if (kind === 'liquid') {
        const correct = pick(rng, p.filter((e) => e.symbol === 'Hg' || e.symbol === 'Br'))
        return build(rng, {
          id: `liquid:${correct.symbol}`, topic: 'elements', difficulty: d, correct: correct.name,
          prompt: 'Which of these elements is a liquid at room temperature (about 25 \u00B0C)?',
          distractors: sample(rng, p.filter((e) => e.phase !== 'Liquid' && e.phase !== null), 3).map((e) => e.name),
          explanation: `${correct.name} is one of only two elements that are liquid at room temperature; the other is ${correct.symbol === 'Hg' ? 'bromine' : 'mercury'}. The other options are solids or gases under these conditions.`, termId: 'element',
        })
      }
      const correct = pick(rng, p.filter((e) => e.phase === 'Gas'))
      return build(rng, {
        id: `gas:${correct.symbol}`, topic: 'elements', difficulty: d, correct: correct.name,
        prompt: 'Which of these elements is a gas at room temperature (about 25 \u00B0C)?',
        distractors: sample(rng, p.filter((e) => e.phase === 'Solid'), 3).map((e) => e.name),
        explanation: `${correct.name} (${correct.symbol}) is a gas at room temperature. The other options are solids.`, termId: 'element',
      })
    },
  },
  // Symbols
  {
    topic: 'symbols', levels: ['beginner', 'intermediate', 'advanced'],
    make: ({ rng, d }) => {
      const p = pool(d)
      const e = pick(rng, p)
      const origin = SYMBOL_ORIGINS[e.symbol]
      const why = origin ? ` The symbol comes from ${origin}.` : ' The symbol is usually the first one or two letters of the English or Latin name.'
      if (rng() < 0.5) {
        return build(rng, {
          id: `symbol-of:${e.symbol}`, topic: 'symbols', difficulty: d, correct: e.symbol,
          prompt: `What is the chemical symbol for ${e.name}?`,
          distractors: sample(rng, p.filter((x) => x.symbol !== e.symbol), 3).map((x) => x.symbol),
          explanation: `The symbol for ${e.name} is ${e.symbol}.${why}`, termId: 'element',
        })
      }
      return build(rng, {
        id: `element-of:${e.symbol}`, topic: 'symbols', difficulty: d, correct: e.name,
        prompt: `Which element has the symbol ${e.symbol}?`,
        distractors: sample(rng, p.filter((x) => x.symbol !== e.symbol), 3).map((x) => x.name),
        explanation: `${e.symbol} is the symbol for ${e.name}.${why}`, termId: 'element',
      })
    },
  },
  // Atomic number
  {
    topic: 'atomic-number', levels: ['beginner', 'intermediate', 'advanced'],
    make: ({ rng, d }) => {
      const p = pool(d)
      const e = pick(rng, p)
      if (rng() < 0.5) {
        const near = [e.number - 2, e.number - 1, e.number + 1, e.number + 2, e.number + 5, e.number * 2].filter((n) => n >= 1 && n <= 118 && n !== e.number)
        return build(rng, {
          id: `z-of:${e.symbol}`, topic: 'atomic-number', difficulty: d, correct: String(e.number),
          prompt: `What is the atomic number of ${e.name}?`, distractors: sample(rng, near, 3).map(String),
          explanation: `${e.name} has atomic number ${e.number}, so every ${e.name.toLowerCase()} atom has ${e.number} proton${e.number === 1 ? '' : 's'}. The atomic number is the number of protons in the nucleus.`, termId: 'atomic-number',
        })
      }
      return build(rng, {
        id: `element-with-z:${e.number}`, topic: 'atomic-number', difficulty: d, correct: e.name,
        prompt: `Which element has atomic number ${e.number}?`,
        distractors: sample(rng, p.filter((x) => x.number !== e.number), 3).map((x) => x.name),
        explanation: `Atomic number ${e.number} means ${e.number} proton${e.number === 1 ? '' : 's'} in the nucleus. That is ${e.name} (${e.symbol}).`, termId: 'atomic-number',
      })
    },
  },
  // Protons, neutrons, electrons
  {
    topic: 'particles', levels: ['beginner', 'intermediate', 'advanced'],
    make: ({ rng, d }) => {
      const p = pool(d)
      const kind = d === 'beginner' ? pick(rng, ['protons', 'electrons'] as const) : pick(rng, ['protons', 'electrons', 'ion'] as const)
      if (kind === 'ion') {
        const IONS: [string, number][] = [['Na', 1], ['Li', 1], ['K', 1], ['Mg', 2], ['Ca', 2], ['Al', 3], ['Cl', -1], ['F', -1], ['O', -2], ['S', -2]]
        const [sym, charge] = pick(rng, IONS)
        const e = el(sym)
        const answer = e.number - charge
        const label = `${sym}${Math.abs(charge) === 1 ? '' : Math.abs(charge)}${charge > 0 ? '\u207A' : '\u207B'}`
        return build(rng, {
          id: `ion:${sym}${charge}`, topic: 'particles', difficulty: d, correct: String(answer),
          prompt: `How many electrons does a ${label} ion of ${e.name.toLowerCase()} have?`,
          distractors: [e.number, e.number + charge, answer + 2, answer - 1, e.number + 2 * Math.abs(charge)].filter((n) => n > 0).map(String),
          explanation: `A neutral ${e.name.toLowerCase()} atom has ${e.number} electrons. ${charge > 0 ? `Losing ${charge} electron${charge > 1 ? 's' : ''} gives a charge of +${charge}` : `Gaining ${-charge} electron${-charge > 1 ? 's' : ''} gives a charge of \u2212${-charge}`}, so the ion has ${answer} electrons. The number of protons (${e.number}) does not change.`, termId: 'ion',
        })
      }
      const e = pick(rng, p)
      const near = [e.number - 2, e.number - 1, e.number + 1, e.number + 2, e.number * 2].filter((n) => n >= 1 && n !== e.number)
      return build(rng, {
        id: `${kind}-of:${e.symbol}`, topic: 'particles', difficulty: d, correct: String(e.number),
        prompt: kind === 'protons' ? `How many protons does an atom of ${e.name.toLowerCase()} have?` : `How many electrons does a neutral atom of ${e.name.toLowerCase()} have?`,
        distractors: sample(rng, near, 3).map(String),
        explanation: kind === 'protons'
          ? `The number of protons is the atomic number. ${e.name} has ${e.number}.`
          : `A neutral atom has equal numbers of protons and electrons, so ${e.name.toLowerCase()} has ${e.number} electrons. An ion has gained or lost electrons.`,
        termId: kind === 'protons' ? 'proton' : 'electron',
      })
    },
  },
  // Groups and periods
  {
    topic: 'group-period', levels: ['beginner', 'intermediate', 'advanced'],
    make: ({ rng, d }) => {
      const p = pool(d).filter((e) => e.group !== null)
      const kind = pick(rng, ['group', 'period', 'locate'] as const)
      if (kind === 'locate') {
        const cells = p.filter((e) => e.group !== null && e.group !== 3 && p.filter((x) => x.group === e.group && x.period === e.period).length === 1)
        const e = pick(rng, cells)
        return build(rng, {
          id: `locate:${e.symbol}`, topic: 'group-period', difficulty: d, correct: e.name,
          prompt: `Which element is in group ${e.group} and period ${e.period}?`,
          distractors: sample(rng, p.filter((x) => x.symbol !== e.symbol), 3).map((x) => x.name),
          explanation: `Groups are columns and periods are rows. Group ${e.group}, period ${e.period} is ${e.name} (${e.symbol}).`, termId: 'group',
        })
      }
      const e = pick(rng, p)
      if (kind === 'group') {
        const options = Array.from({ length: 18 }, (_, i) => i + 1).filter((g) => g !== e.group)
        return build(rng, {
          id: `group-of:${e.symbol}`, topic: 'group-period', difficulty: d, correct: String(e.group),
          prompt: `Which group of the periodic table is ${e.name} in?`, distractors: sample(rng, options, 3).map(String),
          explanation: `${e.name} is in group ${e.group}, which is a vertical column. Elements in a group often behave similarly because their atoms have similar outer electron arrangements.`, termId: 'group',
        })
      }
      return build(rng, {
        id: `period-of:${e.symbol}`, topic: 'group-period', difficulty: d, correct: String(e.period),
        prompt: `Which period (row) of the periodic table is ${e.name} in?`, distractors: sample(rng, [1, 2, 3, 4, 5, 6, 7].filter((x) => x !== e.period), 3).map(String),
        explanation: `${e.name} is in period ${e.period}. Periods are horizontal rows, numbered 1 to 7.`, termId: 'period',
      })
    },
  },
  // Categories (only elements whose category is not disputed)
  {
    topic: 'categories', levels: ['beginner', 'intermediate', 'advanced'],
    make: ({ rng, d }) => {
      const e = pick(rng, pool(d).filter((x) => !x.classificationNote && x.classificationBasis === 'established'))
      const cat = CATEGORIES[e.category]
      return build(rng, {
        id: `category-of:${e.symbol}`, topic: 'categories', difficulty: d, correct: cat.label,
        prompt: `Which category does ${e.name} belong to?`,
        distractors: sample(rng, CATEGORY_IDS.filter((c) => c !== e.category), 3).map((c) => CATEGORIES[c].label),
        explanation: `${e.name} is in the category ${cat.label.toLowerCase()}. ${cat.description}`, termId: 'group',
      })
    },
  },
  // Electron configurations
  {
    topic: 'configuration', levels: ['beginner', 'intermediate', 'advanced'],
    make: ({ rng, d }) => {
      const p = pool(d)
      if (d === 'beginner' || rng() < 0.4) {
        const mainGroup = p.filter((e) => e.group !== null && (e.group <= 2 || e.group >= 13) && e.number > 2)
        const e = pick(rng, mainGroup)
        const n = e.shells[e.shells.length - 1] as number
        return build(rng, {
          id: `outer:${e.symbol}`, topic: 'configuration', difficulty: d, correct: String(n),
          prompt: `How many electrons are in the outermost shell of a neutral ${e.name.toLowerCase()} atom? (Shell distribution: ${e.shells.join(', ')})`,
          distractors: [n - 1, n + 1, n + 2, n - 2, e.shells.length].filter((x) => x > 0 && x <= 8).map(String),
          explanation: `The shells hold ${e.shells.join(', ')} electrons, so the outermost shell has ${n}. For main-group elements these outer electrons are the valence electrons, which take part in bonding.`, termId: 'valence-electron',
        })
      }
      const confirmed = p.filter((e) => e.electronConfigurationConfirmed && e.number > 2)
      const e = pick(rng, confirmed)
      const others = confirmed.filter((x) => x.electronConfigurationShort !== e.electronConfigurationShort)
      return build(rng, {
        id: `config:${e.symbol}`, topic: 'configuration', difficulty: d, correct: e.name,
        prompt: `Which element has the ground-state electron configuration ${superscriptConfig(e.electronConfigurationShort)}?`,
        distractors: sample(rng, others, 3).map((x) => x.name),
        explanation: `${superscriptConfig(e.electronConfigurationShort)} adds up to ${e.number} electrons, which is ${e.name}. The part in square brackets stands for the electrons of the previous noble gas.`, termId: 'electron-configuration',
      })
    },
  },
  // Periodic trends: only where the data is strictly monotonic, plus taught exceptions
  {
    topic: 'trends', levels: ['intermediate', 'advanced'],
    make: ({ rng, d }) => {
      if (d === 'advanced' && rng() < 0.35) {
        const EXC = [
          { a: 'Be', b: 'B', why: 'Boron\u2019s outer electron is in a 2p orbital, which is slightly higher in energy and partly shielded by the 2s electrons, so it is easier to remove than one of beryllium\u2019s 2s electrons.' },
          { a: 'N', b: 'O', why: 'Oxygen has a pair of electrons in one 2p orbital. The repulsion between them makes one easier to remove than an electron from nitrogen\u2019s half-filled 2p subshell.' },
        ]
        const x = pick(rng, EXC)
        const ea = el(x.a), eb = el(x.b)
        const va = ea.ionizationEnergy1?.kJPerMol as number, vb = eb.ionizationEnergy1?.kJPerMol as number
        return build(rng, {
          id: `ie-exception:${x.a}${x.b}`, topic: 'trends', difficulty: d, correct: ea.name,
          prompt: `First ionization energy generally increases from left to right across a period. Yet one of these two elements has a HIGHER first ionization energy than the element to its right. Which one?`,
          distractors: [eb.name, 'Neither: they are equal', 'It depends on the temperature'],
          explanation: `${ea.name} (${va} kJ/mol) is higher than ${eb.name} (${vb} kJ/mol). Trends are general patterns, not laws. ${x.why}`, termId: 'periodic-trend',
        })
      }
      const symbols = (s: string[]) => s.map(el)
      const EN_SETS: { label: string; list: ElementRecord[]; reason: string }[] = [
        { label: 'across period 2', list: symbols(['Li', 'Be', 'B', 'C', 'N', 'O', 'F']), reason: 'Across a period the nuclear charge increases while the outer electrons stay in the same shell, so atoms attract shared electrons more strongly.' },
        { label: 'across period 3', list: symbols(['Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl']), reason: 'Across a period the nuclear charge increases while the outer electrons stay in the same shell, so atoms attract shared electrons more strongly.' },
        { label: 'down group 17', list: symbols(['F', 'Cl', 'Br', 'I']), reason: 'Down a group the outer electrons are farther from the nucleus and more shielded, so atoms attract shared electrons less strongly.' },
        { label: 'down group 16', list: symbols(['O', 'S', 'Se', 'Te']), reason: 'Down a group the outer electrons are farther from the nucleus and more shielded, so atoms attract shared electrons less strongly.' },
      ]
      const IE_SETS: { label: string; list: ElementRecord[] }[] = [
        { label: 'group 1', list: symbols(['Li', 'Na', 'K', 'Rb', 'Cs']) },
        { label: 'group 2', list: symbols(['Be', 'Mg', 'Ca', 'Sr', 'Ba']) },
        { label: 'group 17', list: symbols(['F', 'Cl', 'Br', 'I']) },
        { label: 'group 18', list: symbols(['He', 'Ne', 'Ar', 'Kr', 'Xe']) },
      ]
      const useIe = d === 'advanced' && rng() < 0.5
      const set = useIe ? pick(rng, IE_SETS) : pick(rng, EN_SETS)
      const value = (e: ElementRecord) => (useIe ? (e.ionizationEnergy1?.kJPerMol as number) : (e.electronegativityPauling as number))
      const four = sample(rng, set.list, Math.min(4, set.list.length))
      const highest = rng() < 0.5
      const sorted = [...four].sort((a, b) => value(b) - value(a))
      const correct = highest ? sorted[0] as ElementRecord : sorted[sorted.length - 1] as ElementRecord
      const second = highest ? sorted[1] as ElementRecord : sorted[sorted.length - 2] as ElementRecord
      if (value(correct) === value(second)) return null // never ask a question with a tie
      const values = sorted.map((e) => `${e.name} ${value(e)}`).join(', ')
      const reason = 'reason' in set ? set.reason : ''
      return build(rng, {
          id: `${useIe ? 'ie' : 'en'}:${highest ? 'max' : 'min'}:${four.map((e) => e.symbol).sort().join('')}`,
          topic: 'trends', difficulty: d, correct: correct.name,
          prompt: `Which of these has the ${highest ? 'HIGHEST' : 'LOWEST'} ${useIe ? 'first ionization energy' : 'electronegativity'}?`,
          distractors: four.filter((e) => e !== correct).map((e) => e.name),
          explanation: useIe
            ? `Values (kJ/mol): ${values}. Down a group the outermost electron is farther from the nucleus and more shielded, so it is easier to remove and the first ionization energy falls. This is a general trend, not a law.`
            : `Values (Pauling scale): ${values}. ${reason} This is a general trend, not a law.`,
          termId: useIe ? 'ionization-energy' : 'electronegativity',
      })
    },
  },
]

// ---------- curated bonding and isotope questions (no data lookup needed, facts checked by hand) ----------
interface Curated { id: string; levels: readonly Difficulty[]; prompt: string; correct: string; wrong: readonly string[]; explanation: string; termId: string }
const BONDING: Curated[] = [
  { id: 'nacl', levels: ['beginner', 'intermediate', 'advanced'], prompt: 'What kind of bond holds the ions together in table salt (NaCl)?', correct: 'Ionic bond', wrong: ['Covalent bond', 'Metallic bond', 'No bond at all'],
    explanation: 'Sodium gives one electron to chlorine, forming Na\u207A and Cl\u207B ions. The attraction between these oppositely charged ions is an ionic bond. Table salt is a compound, not the metal sodium.', termId: 'ionic-bond' },
  { id: 'h2o', levels: ['beginner', 'intermediate', 'advanced'], prompt: 'How are the atoms in a water molecule (H\u2082O) held together?', correct: 'By covalent bonds, where atoms share electrons', wrong: ['By ionic bonds, where an electron is transferred', 'By metallic bonds', 'They are not joined'],
    explanation: 'Oxygen shares a pair of electrons with each hydrogen atom. Because oxygen attracts the shared electrons more strongly, the bonds are polar covalent bonds.', termId: 'covalent-bond' },
  { id: 'co2-formula', levels: ['beginner', 'intermediate'], prompt: 'How many oxygen atoms are in one molecule of carbon dioxide, CO\u2082?', correct: '2', wrong: ['1', '3', '12'],
    explanation: 'The small number after a symbol tells you how many atoms of that element are in the formula. CO\u2082 has one carbon atom and two oxygen atoms.', termId: 'molecule' },
  { id: 'co-cobalt', levels: ['beginner', 'intermediate', 'advanced'], prompt: 'What is the difference between \u201CCo\u201D and \u201CCO\u201D?', correct: 'Co is the element cobalt; CO is the compound carbon monoxide', wrong: ['They mean the same thing', 'Co is carbon and CO is oxygen', 'CO is the element cobalt'],
    explanation: 'An element symbol has a capital first letter and, if there is a second letter, it is lowercase. Capital letters side by side show a formula of several elements: C (carbon) and O (oxygen).', termId: 'element' },
  { id: 'o2-double', levels: ['intermediate', 'advanced'], prompt: 'In an oxygen molecule (O\u2082), how many pairs of electrons do the two atoms share?', correct: 'Two pairs (a double bond)', wrong: ['One pair (a single bond)', 'Three pairs (a triple bond)', 'None; electrons are transferred'],
    explanation: 'Each oxygen atom needs two more electrons to fill its outer shell, so the atoms share two pairs. This is a double covalent bond.', termId: 'covalent-bond' },
  { id: 'ch4', levels: ['beginner', 'intermediate'], prompt: 'How many hydrogen atoms bond to one carbon atom in methane (CH\u2084)?', correct: '4', wrong: ['1', '2', '6'],
    explanation: 'Carbon has four outer electrons and forms four covalent bonds, one with each of four hydrogen atoms.', termId: 'covalent-bond' },
  { id: 'cu-conduct', levels: ['intermediate', 'advanced'], prompt: 'Why does copper conduct electricity so well?', correct: 'Some of its electrons are free to move through the metal (metallic bonding)', wrong: ['It contains lots of positive ions that flow along the wire', 'Its atoms are held together in separate molecules', 'It has no electrons in its outer shell'],
    explanation: 'In metallic bonding, outer electrons are shared among many atoms and can move through the metal. When a voltage is applied, these electrons carry the current.', termId: 'metallic-bond' },
]
const ISOTOPE_FACTS: Curated[] = [
  { id: 'iso-same', levels: ['beginner', 'intermediate', 'advanced'], prompt: 'Which of these is the SAME in every isotope of an element?', correct: 'The number of protons', wrong: ['The number of neutrons', 'The mass number', 'The mass of the atom'],
    explanation: 'Isotopes of an element all have the same atomic number, which is the number of protons. They differ in the number of neutrons, and therefore in mass number and mass.', termId: 'isotope' },
  { id: 'iso-c12c14', levels: ['beginner', 'intermediate', 'advanced'], prompt: 'Carbon-12 and carbon-14 are:', correct: 'Isotopes of carbon', wrong: ['Two different elements', 'Two different compounds', 'The same atom'],
    explanation: 'Both have 6 protons, so both are carbon. Carbon-12 has 6 neutrons and carbon-14 has 8, so they are isotopes of the same element.', termId: 'isotope' },
]
/** Real isotopes used for neutron-counting questions. Verified against the isotope dataset in the tests. */
export const NEUTRON_ISOTOPES: readonly (readonly [string, number])[] = [
  ['H', 2], ['C', 12], ['C', 14], ['O', 16], ['Na', 23], ['Cl', 35], ['Cl', 37], ['K', 40], ['Fe', 56], ['Cu', 63], ['Au', 197], ['Pb', 208], ['U', 235], ['U', 238],
]

function fromCurated(rng: Rng, topic: Topic, d: Difficulty, c: Curated): Question | null {
  return build(rng, { id: `${topic}:${c.id}`, topic, difficulty: d, correct: c.correct, distractors: c.wrong, prompt: c.prompt, explanation: c.explanation, termId: c.termId })
}

GENERATORS.push(
  {
    topic: 'bonding', levels: ['beginner', 'intermediate', 'advanced'],
    make: ({ rng, d }) => {
      const c = pick(rng, BONDING.filter((b) => b.levels.includes(d)))
      return fromCurated(rng, 'bonding', d, c)
    },
  },
  {
    topic: 'isotopes', levels: ['beginner', 'intermediate', 'advanced'],
    make: ({ rng, d }) => {
      if (rng() < 0.3) return fromCurated(rng, 'isotopes', d, pick(rng, ISOTOPE_FACTS))
      const list = d === 'beginner' ? NEUTRON_ISOTOPES.filter(([s]) => el(s).number <= 26) : NEUTRON_ISOTOPES
      const [sym, a] = pick(rng, list)
      const e = el(sym)
      const n = a - e.number
      return build(rng, {
        id: `neutrons:${sym}${a}`, topic: 'isotopes', difficulty: d, correct: String(n),
        prompt: `An atom of ${e.name.toLowerCase()}-${a} has atomic number ${e.number} and mass number ${a}. How many neutrons does it have?`,
        distractors: [a, e.number, n + 1, n - 1, a + e.number].filter((x) => x >= 0).map(String),
        explanation: `Neutrons = mass number \u2212 atomic number = ${a} \u2212 ${e.number} = ${n}. Mass number counts protons plus neutrons, and the atomic number counts only the protons.`, termId: 'mass-number',
      })
    },
  },
)

export function makeQuiz(opts: { topics: readonly Topic[]; difficulty: Difficulty; count: number; seed: number }): Question[] {
  const rng = mulberry32(opts.seed)
  const gens = GENERATORS.filter((g) => opts.topics.includes(g.topic) && g.levels.includes(opts.difficulty))
  const out: Question[] = []
  const seen = new Set<string>()
  if (gens.length === 0) return out
  // Round-robin over a shuffled generator order, so every selected topic is represented.
  const order = shuffle(rng, gens)
  for (let attempts = 0; out.length < opts.count && attempts < opts.count * 40; attempts++) {
    const gen = order[attempts % order.length] as Generator
    const q = gen.make({ rng, d: opts.difficulty })
    if (!q || seen.has(q.id)) continue
    seen.add(q.id)
    out.push(q)
  }
  return out
}
