/**
 * Canonical identity layer: the 118 officially recognised elements.
 *
 * This list is deliberately independent of the property dataset. The dataset
 * build FAILS if its symbols disagree with this list, so a typo or a bogus
 * extra record (the upstream file contains a non-existent "element 119")
 * cannot reach the application.
 *
 * Names follow IUPAC spelling (aluminium, caesium, sulfur).
 * Only identity lives here: number, symbol, name. No scientific properties.
 */
export const CANONICAL_ELEMENTS: readonly (readonly [symbol: string, name: string])[] = [
  ['H', 'Hydrogen'], ['He', 'Helium'], ['Li', 'Lithium'], ['Be', 'Beryllium'], ['B', 'Boron'],
  ['C', 'Carbon'], ['N', 'Nitrogen'], ['O', 'Oxygen'], ['F', 'Fluorine'], ['Ne', 'Neon'],
  ['Na', 'Sodium'], ['Mg', 'Magnesium'], ['Al', 'Aluminium'], ['Si', 'Silicon'], ['P', 'Phosphorus'],
  ['S', 'Sulfur'], ['Cl', 'Chlorine'], ['Ar', 'Argon'], ['K', 'Potassium'], ['Ca', 'Calcium'],
  ['Sc', 'Scandium'], ['Ti', 'Titanium'], ['V', 'Vanadium'], ['Cr', 'Chromium'], ['Mn', 'Manganese'],
  ['Fe', 'Iron'], ['Co', 'Cobalt'], ['Ni', 'Nickel'], ['Cu', 'Copper'], ['Zn', 'Zinc'],
  ['Ga', 'Gallium'], ['Ge', 'Germanium'], ['As', 'Arsenic'], ['Se', 'Selenium'], ['Br', 'Bromine'],
  ['Kr', 'Krypton'], ['Rb', 'Rubidium'], ['Sr', 'Strontium'], ['Y', 'Yttrium'], ['Zr', 'Zirconium'],
  ['Nb', 'Niobium'], ['Mo', 'Molybdenum'], ['Tc', 'Technetium'], ['Ru', 'Ruthenium'], ['Rh', 'Rhodium'],
  ['Pd', 'Palladium'], ['Ag', 'Silver'], ['Cd', 'Cadmium'], ['In', 'Indium'], ['Sn', 'Tin'],
  ['Sb', 'Antimony'], ['Te', 'Tellurium'], ['I', 'Iodine'], ['Xe', 'Xenon'], ['Cs', 'Caesium'],
  ['Ba', 'Barium'], ['La', 'Lanthanum'], ['Ce', 'Cerium'], ['Pr', 'Praseodymium'], ['Nd', 'Neodymium'],
  ['Pm', 'Promethium'], ['Sm', 'Samarium'], ['Eu', 'Europium'], ['Gd', 'Gadolinium'], ['Tb', 'Terbium'],
  ['Dy', 'Dysprosium'], ['Ho', 'Holmium'], ['Er', 'Erbium'], ['Tm', 'Thulium'], ['Yb', 'Ytterbium'],
  ['Lu', 'Lutetium'], ['Hf', 'Hafnium'], ['Ta', 'Tantalum'], ['W', 'Tungsten'], ['Re', 'Rhenium'],
  ['Os', 'Osmium'], ['Ir', 'Iridium'], ['Pt', 'Platinum'], ['Au', 'Gold'], ['Hg', 'Mercury'],
  ['Tl', 'Thallium'], ['Pb', 'Lead'], ['Bi', 'Bismuth'], ['Po', 'Polonium'], ['At', 'Astatine'],
  ['Rn', 'Radon'], ['Fr', 'Francium'], ['Ra', 'Radium'], ['Ac', 'Actinium'], ['Th', 'Thorium'],
  ['Pa', 'Protactinium'], ['U', 'Uranium'], ['Np', 'Neptunium'], ['Pu', 'Plutonium'], ['Am', 'Americium'],
  ['Cm', 'Curium'], ['Bk', 'Berkelium'], ['Cf', 'Californium'], ['Es', 'Einsteinium'], ['Fm', 'Fermium'],
  ['Md', 'Mendelevium'], ['No', 'Nobelium'], ['Lr', 'Lawrencium'], ['Rf', 'Rutherfordium'], ['Db', 'Dubnium'],
  ['Sg', 'Seaborgium'], ['Bh', 'Bohrium'], ['Hs', 'Hassium'], ['Mt', 'Meitnerium'], ['Ds', 'Darmstadtium'],
  ['Rg', 'Roentgenium'], ['Cn', 'Copernicium'], ['Nh', 'Nihonium'], ['Fl', 'Flerovium'], ['Mc', 'Moscovium'],
  ['Lv', 'Livermorium'], ['Ts', 'Tennessine'], ['Og', 'Oganesson'],
]

export const ELEMENT_COUNT = 118

/** Elements with no standard atomic weight: IUPAC lists a mass number in brackets instead. */
export const NO_STANDARD_ATOMIC_WEIGHT: ReadonlySet<number> = new Set([
  43, 61, 84, 85, 86, 87, 88, 89,
  ...Array.from({ length: 118 - 93 + 1 }, (_, i) => 93 + i),
])

/** Elements with no stable isotope (Bi, Z=83, is excluded: its half-life exceeds the age of the universe). */
export function hasNoStableIsotope(z: number): boolean {
  return z === 43 || z === 61 || z >= 84
}

/** From this atomic number up, bulk properties have not been measured; numeric values are estimates or predictions. */
export const THEORETICAL_FROM_Z = 100
