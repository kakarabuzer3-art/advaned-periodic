export type VisualId = 'matter' | 'element' | 'atom' | 'particles' | 'atomic-number' | 'symbols' | 'groups' | 'periods'

export interface Lesson {
  id: string
  title: string
  explanation: string
  example: string
  visual: VisualId
  /** Plain-text description of the visual, for screen readers and for reading without the picture. */
  visualAlt: string
  /** Glossary terms to offer for this lesson. */
  terms: readonly string[]
  question: {
    prompt: string
    options: readonly string[]
    correctIndex: number
    /** Shown after a correct answer. */
    right: string
    /** Shown after a wrong answer: teaches the concept instead of saying "incorrect". */
    wrong: string
  }
}

export const LESSONS: readonly Lesson[] = [
  {
    id: 'matter', title: 'What is matter?',
    explanation: 'Matter is anything that has mass and takes up space. It exists in everyday states such as solid, liquid and gas.',
    example: 'A glass of water, the glass itself and the air around you are all matter. Light and sound are not matter.',
    visual: 'matter', visualAlt: 'Three boxes showing particles. In a solid they are packed in a fixed pattern, in a liquid they are close but free to move past each other, and in a gas they are far apart.',
    terms: ['matter'],
    question: { prompt: 'Which of these is matter?', options: ['The air inside a balloon', 'A shadow', 'The light from a torch', 'A sound'], correctIndex: 0,
      right: 'Yes. Air has mass and takes up space, which is why a balloon can be inflated with it.',
      wrong: 'Not quite. Shadows, light and sound do not have mass. Air does have mass and takes up space, so it is matter.' },
  },
  {
    id: 'element', title: 'What is an element?',
    explanation: 'An element is a pure substance made of only one kind of atom. It cannot be broken down into simpler substances by chemical reactions. There are 118 known elements.',
    example: 'Gold is an element: every atom in a pure gold ring is a gold atom. Water is not an element, because it contains hydrogen and oxygen joined together.',
    visual: 'element', visualAlt: 'On the left, a tile for the element gold (Au, atomic number 79). On the right, a water molecule made of two hydrogen atoms and one oxygen atom, labelled as a compound.',
    terms: ['element', 'compound'],
    question: { prompt: 'Which of these is an element?', options: ['Water', 'Table salt', 'Iron', 'Steel'], correctIndex: 2,
      right: 'Yes. Iron is an element. It is made only of iron atoms.',
      wrong: 'Water and table salt are compounds, and steel is an alloy that is mostly iron with a little carbon. Iron on its own is an element.' },
  },
  {
    id: 'atom', title: 'What is an atom?',
    explanation: 'An atom is the smallest unit of an element that keeps the identity of that element. It has a tiny dense nucleus in the centre, with electrons around it.',
    example: 'If you could keep dividing a copper wire, the smallest piece that is still copper is one copper atom.',
    visual: 'atom', visualAlt: 'A simplified drawing of a carbon atom: a small nucleus of 6 protons and 6 neutrons in the middle, with 2 electrons in an inner ring and 4 electrons in an outer ring.',
    terms: ['atom', 'nucleus'],
    question: { prompt: 'What is at the centre of an atom?', options: ['An electron', 'The nucleus', 'A molecule'], correctIndex: 1,
      right: 'Yes. The nucleus holds the protons and neutrons, and almost all of the atom\u2019s mass.',
      wrong: 'Electrons are outside the nucleus, and a molecule is a group of atoms. The nucleus is at the centre.' },
  },
  {
    id: 'particles', title: 'Protons, neutrons and electrons',
    explanation: 'Protons have a positive charge and electrons have a negative charge. Neutrons have no charge. Protons and neutrons are in the nucleus and electrons are outside it. A neutral atom has equal numbers of protons and electrons.',
    example: 'A neutral carbon atom has 6 protons and 6 electrons, so the positive and negative charges cancel.',
    visual: 'particles', visualAlt: 'A table. Proton: charge plus one, in the nucleus. Neutron: no charge, in the nucleus. Electron: charge minus one, outside the nucleus, with about one 1836th of the mass of a proton.',
    terms: ['proton', 'neutron', 'electron', 'ion'],
    question: { prompt: 'A neutral atom has 8 protons. How many electrons does it have?', options: ['8', '16', '0'], correctIndex: 0,
      right: 'Yes. In a neutral atom the electrons match the protons, so 8 protons means 8 electrons.',
      wrong: 'A neutral atom has no overall charge, so the number of electrons equals the number of protons: 8. (An ion has gained or lost electrons.)' },
  },
  {
    id: 'atomic-number', title: 'What the atomic number means',
    explanation: 'The atomic number is the number of protons in an atom\u2019s nucleus. It decides which element an atom is.',
    example: 'Every atom with 1 proton is hydrogen. Every atom with 6 protons is carbon. Every atom with 79 protons is gold.',
    visual: 'atomic-number', visualAlt: 'Three element tiles: hydrogen with atomic number 1, carbon with 6 and gold with 79.',
    terms: ['atomic-number', 'proton'],
    question: { prompt: 'An atom has 26 protons. Which element is it?', options: ['Iron', 'Copper', 'Carbon'], correctIndex: 0,
      right: 'Yes. Atomic number 26 is iron (Fe).',
      wrong: 'The number of protons is the atomic number. Atomic number 26 is iron. Copper is 29 and carbon is 6.' },
  },
  {
    id: 'symbols', title: 'What chemical symbols mean',
    explanation: 'Each element has a symbol of one or two letters. The first letter is a capital and the second, if there is one, is lowercase. Some symbols come from old Latin names.',
    example: 'Fe is iron (from ferrum), Au is gold (aurum) and Na is sodium (natrium). Careful: Co is the element cobalt, but CO is a compound, carbon monoxide.',
    visual: 'symbols', visualAlt: 'Four tiles: Fe, iron, from Latin ferrum. Au, gold, from aurum. Na, sodium, from natrium. Pb, lead, from plumbum.',
    terms: ['element'],
    question: { prompt: 'Which symbol stands for gold?', options: ['Go', 'Au', 'Ag'], correctIndex: 1,
      right: 'Yes. Au comes from the Latin word aurum.',
      wrong: 'Gold is Au, from the Latin aurum. Ag is silver (argentum), and Go is not an element symbol.' },
  },
  {
    id: 'groups', title: 'What groups are',
    explanation: 'A group is a vertical column in the periodic table. There are 18 groups. Elements in the same group often behave in similar ways because their atoms have similar outer electron arrangements.',
    example: 'Group 18 holds helium, neon and argon. These noble gases hardly react with anything.',
    visual: 'groups', visualAlt: 'A simplified periodic table with group 18, the far right column, highlighted.',
    terms: ['group', 'valence-electron'],
    question: { prompt: 'How many groups are there in the standard periodic table?', options: ['7', '18', '118'], correctIndex: 1,
      right: 'Yes. The groups are numbered 1 to 18 from left to right.',
      wrong: 'There are 18 groups (columns). There are 7 periods (rows) and 118 elements.' },
  },
  {
    id: 'periods', title: 'What periods are',
    explanation: 'A period is a horizontal row in the periodic table. There are 7 periods. Moving left to right along a period, the atomic number goes up by one each step.',
    example: 'Period 2 runs from lithium (atomic number 3) to neon (atomic number 10).',
    visual: 'periods', visualAlt: 'A simplified periodic table with period 2, the second row, highlighted.',
    terms: ['period', 'atomic-number'],
    question: { prompt: 'Sodium (Na) is in period 3. Which element comes straight after it in the same period?', options: ['Magnesium', 'Potassium', 'Lithium'], correctIndex: 0,
      right: 'Yes. Magnesium (12) comes right after sodium (11).',
      wrong: 'Magnesium (atomic number 12) follows sodium (11) in period 3. Potassium is in period 4 and lithium is in period 2.' },
  },
]
