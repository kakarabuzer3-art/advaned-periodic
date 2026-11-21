import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App.tsx'
import { ONBOARDING_KEY } from './features/start/onboardingState.ts'
import { PROGRESS_KEY } from './features/practice/progress.ts'

function mockMedia({ wide, small }: { wide: boolean; small: boolean }) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('min-width: 1280px') ? wide : query.includes('max-width: 767px') ? small : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

const tiles = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLButtonElement>('button[data-z]'))
const dimmed = (c: HTMLElement) => c.querySelectorAll('.tile[data-dimmed="true"]').length
const tile = (name: string) => screen.getByRole('button', { name: new RegExp(`^\\d+ [A-Z][a-z]? ${name} `) })
const details = () => within(screen.getByRole('complementary', { name: 'Element details' }))

const completeOnboarding = () => localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ completed: true }))

beforeEach(() => {
  localStorage.clear()
  completeOnboarding() // most tests are about the explorer, which a returning user lands on
  history.replaceState(null, '', '/')
  mockMedia({ wide: true, small: false })
})
afterEach(() => {
  localStorage.clear()
  history.replaceState(null, '', '/')
})

describe('periodic table view', () => {
  it('renders all 118 elements and the 10 category filters', () => {
    const { container } = render(<App />)
    expect(tiles(container)).toHaveLength(118)
    const legend = screen.getByRole('group', { name: 'Filter by element category' })
    expect(within(legend).getAllByRole('button')).toHaveLength(10)
    expect(dimmed(container)).toBe(0)
  })

  it('puts exactly one tile in the tab order (roving tabindex)', () => {
    const { container } = render(<App />)
    expect(tiles(container).filter((t) => t.tabIndex === 0)).toHaveLength(1)
  })

  it('shows details for the clicked element', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(details().getByText('Select an element')).toBeInTheDocument()
    await user.click(tile('Iron'))
    expect(details().getByRole('heading', { name: 'Iron' })).toBeInTheDocument()
    expect(details().getByText('2, 8, 14, 2')).toBeInTheDocument()
    expect(details().getByText('[Ar] 3d6 4s2')).toBeInTheDocument()
    expect(details().queryByText(/Limited data/)).not.toBeInTheDocument()
    await user.click(details().getByRole('button', { name: 'Close element details' }))
    expect(details().getByText('Select an element')).toBeInTheDocument()
  })

  it('labels the heaviest elements as predicted and limited', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(tile('Oganesson'))
    expect(details().getByText(/Limited data/)).toBeInTheDocument()
    expect(details().getAllByText('Predicted').length).toBeGreaterThan(2)
    expect(details().getByText('[294]')).toBeInTheDocument()
  })

  it('says so when a value is missing instead of inventing one', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(tile('Vanadium'))
    expect(details().getAllByText('Not in dataset').length).toBeGreaterThan(0) // namedBy scraping artefact removed
    expect(details().queryByText(/Isotopes of vanadium/)).not.toBeInTheDocument()
  })

  it('moves focus with the arrow keys', async () => {
    const user = userEvent.setup()
    render(<App />)
    tile('Hydrogen').focus()
    await user.keyboard('{ArrowRight}')
    expect(tile('Helium')).toHaveFocus()
    await user.keyboard('{ArrowLeft}{ArrowDown}')
    expect(tile('Lithium')).toHaveFocus()
  })
})

describe('search', () => {
  it('finds by name and selects the top hit on Enter', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.type(screen.getByRole('searchbox'), 'gold')
    expect(dimmed(container)).toBe(117)
    expect(screen.getByRole('status')).toHaveTextContent('1 of 118 elements match')
    await user.keyboard('{Enter}')
    expect(details().getByRole('heading', { name: 'Gold' })).toBeInTheDocument()
  })

  it('finds by symbol and by atomic number', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const box = screen.getByRole('searchbox')
    await user.type(box, 'Fe')
    expect(tile('Iron')).toHaveAttribute('data-dimmed', 'false')
    expect(dimmed(container)).toBe(116) // Fe and Fm (Fermium) match
    await user.clear(box)
    await user.type(box, '79')
    expect(tile('Gold')).toHaveAttribute('data-dimmed', 'false')
    expect(dimmed(container)).toBe(117)
  })

  it('does not open an element that the other filters have hidden', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^Halogens/ }))
    await user.type(screen.getByRole('searchbox'), 'oganesson{Enter}') // a noble gas: 0 matches with Halogens on
    expect(screen.getByRole('status')).toHaveTextContent('0 of 118 elements match')
    expect(details().getByText('Select an element')).toBeInTheDocument()
  })

  it('clears with Escape', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.type(screen.getByRole('searchbox'), 'xyz')
    expect(dimmed(container)).toBe(118)
    await user.keyboard('{Escape}')
    expect(dimmed(container)).toBe(0)
  })
})

describe('filters', () => {
  it('filters by category and resets', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const reset = screen.getByRole('button', { name: 'Reset filters' })
    expect(reset).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /^Halogens/ }))
    expect(screen.getByRole('button', { name: /^Halogens/ })).toHaveAttribute('aria-pressed', 'true')
    expect(dimmed(container)).toBe(112)
    expect(screen.getByRole('status')).toHaveTextContent('6 of 118 elements match')
    await user.click(screen.getByRole('button', { name: /^Noble gases/ }))
    expect(dimmed(container)).toBe(105) // 13 match
    await user.click(reset)
    expect(dimmed(container)).toBe(0)
  })

  it('filters by period, group and block', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.selectOptions(screen.getByLabelText('Period'), '7')
    expect(dimmed(container)).toBe(118 - 32)
    await user.selectOptions(screen.getByLabelText('Period'), '')
    await user.selectOptions(screen.getByLabelText('Block'), 'f')
    expect(dimmed(container)).toBe(118 - 28)
    await user.selectOptions(screen.getByLabelText('Block'), '')
    await user.selectOptions(screen.getByLabelText('Group'), '18')
    expect(dimmed(container)).toBe(118 - 7)
  })
})

describe('list view', () => {
  it('lists every element and respects filters', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'List' }))
    const list = screen.getByRole('list', { name: 'Elements' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(118)
    await user.click(screen.getByRole('button', { name: /^Halogens/ }))
    expect(within(screen.getByRole('list', { name: 'Elements' })).getAllByRole('listitem')).toHaveLength(6)
    await user.click(screen.getByRole('button', { name: 'Reset filters' }))
    await user.type(screen.getByRole('searchbox'), 'ium')
    expect(within(screen.getByRole('list', { name: 'Elements' })).getAllByRole('listitem').length).toBeGreaterThan(30)
    await user.type(screen.getByRole('searchbox'), 'zzz')
    expect(screen.getByText(/No elements match/)).toBeInTheDocument()
  })

  it('defaults to list view on small screens', () => {
    mockMedia({ wide: false, small: true })
    render(<App />)
    expect(screen.getByRole('list', { name: 'Elements' })).toBeInTheDocument()
  })
})

describe('selection, URL and layout', () => {
  it('reads the selected element from the URL hash and writes it back', async () => {
    history.replaceState(null, '', '/#element=Cu')
    const user = userEvent.setup()
    render(<App />)
    expect(details().getByRole('heading', { name: 'Copper' })).toBeInTheDocument()
    await user.click(tile('Hydrogen'))
    expect(window.location.hash).toBe('#element=H')
    await user.click(details().getByRole('button', { name: 'Close element details' }))
    expect(window.location.hash).toBe('')
  })

  it('opens a modal sheet instead of a docked panel on narrower screens', async () => {
    mockMedia({ wide: false, small: false })
    const user = userEvent.setup()
    const { container } = render(<App />)
    expect(container.querySelector('dialog[open]')).toBeNull()
    await user.click(tile('Carbon'))
    const dialog = container.querySelector('dialog')!
    expect(dialog).toHaveAttribute('open')
    expect(within(dialog).getByRole('heading', { name: 'Carbon' })).toBeInTheDocument()
  })
})

describe('owner identity', () => {
  it('shows the correct contact links in the footer', () => {
    render(<App />)
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByText('Abuzer KAkar')).toBeInTheDocument()
    expect(within(footer).getByRole('link', { name: '+92 323 3615296' })).toHaveAttribute('href', 'tel:+923233615296')
    expect(within(footer).getByRole('link', { name: 'kakarabuzer3@gmail.com' })).toHaveAttribute('href', 'mailto:kakarabuzer3@gmail.com')
    expect(within(footer).getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/923233615296')
  })
})

describe('four destinations', () => {
  it('offers exactly the four main destinations and switches between them', async () => {
    const user = userEvent.setup()
    render(<App />)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['Start Learning', 'Explore Elements', 'Learn Chemistry', 'Practice & Test'])
    expect(within(nav).getByRole('button', { name: 'Explore Elements' })).toHaveAttribute('aria-current', 'page')
    await user.click(within(nav).getByRole('button', { name: 'Learn Chemistry' }))
    expect(screen.getByRole('heading', { name: 'Learn Chemistry' })).toBeInTheDocument()
    await user.click(within(nav).getByRole('button', { name: 'Practice & Test' }))
    expect(screen.getByRole('heading', { name: 'Practice & Test' })).toBeInTheDocument()
    await user.click(within(nav).getByRole('button', { name: 'Start Learning' }))
    expect(window.location.hash).toBe('#start')
  })
})

describe('first-time introduction', () => {
  beforeEach(() => localStorage.clear()) // a brand-new visitor

  it('starts a new visitor on lesson 1 of 8 with progress, and walks forward and back', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByText('Introduction: step 1 of 8')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'What is matter?' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Next/ }))
    expect(screen.getByRole('heading', { name: 'What is an element?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Previous/ }))
    expect(screen.getByRole('heading', { name: 'What is matter?' })).toBeInTheDocument()
  })

  it('teaches instead of just saying "incorrect"', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('radio', { name: 'A shadow' }))
    await user.click(screen.getByRole('button', { name: 'Check my answer' }))
    expect(screen.getByRole('status')).toHaveTextContent(/Not quite.*Shadows, light and sound do not have mass/)
  })

  it('remembers completion and does not show the introduction again', async () => {
    const user = userEvent.setup()
    const first = render(<App />)
    for (let i = 0; i < 7; i++) await user.click(screen.getByRole('button', { name: /Next/ }))
    expect(screen.getByText('Introduction: step 8 of 8')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Finish and explore/ }))
    expect(screen.getByRole('heading', { name: 'Explore Elements' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(ONBOARDING_KEY)!)).toEqual({ completed: true })
    first.unmount()
    history.replaceState(null, '', '/')
    render(<App />) // a returning visitor
    expect(screen.getByRole('heading', { name: 'Explore Elements' })).toBeInTheDocument()
    expect(screen.queryByText(/Introduction: step/)).not.toBeInTheDocument()
  })

  it('can be skipped, and repeated afterwards', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Skip introduction' }))
    expect(screen.getByRole('heading', { name: 'Explore Elements' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('button', { name: 'Start Learning' }))
    await user.click(screen.getByRole('button', { name: /Repeat the introduction/ }))
    expect(screen.getByText('Introduction: step 1 of 8')).toBeInTheDocument()
  })
})

describe('glossary', () => {
  it('searches terms on the Learn page', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Learn Chemistry' }))
    const all = within(screen.getByRole('list', { name: 'Glossary' })).getAllByRole('listitem').length
    expect(all).toBeGreaterThanOrEqual(35)
    await user.type(screen.getByRole('searchbox', { name: 'Search the glossary' }), 'isotope')
    const hits = within(screen.getByRole('list', { name: 'Glossary' })).getAllByRole('listitem')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.length).toBeLessThan(all)
    expect(hits[0]).toHaveTextContent('Isotope')
  })

  it('explains a term from the element panel in a dialog, with related terms', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(tile('Iron'))
    await user.click(details().getAllByRole('button', { name: 'Atomic number' })[0]!)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Atomic number' })).toBeInTheDocument()
    expect(dialog).toHaveTextContent('The number of protons in an atom')
    await user.click(within(dialog).getByRole('button', { name: 'Proton' }))
    expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'Proton' })).toBeInTheDocument()
  })
})

describe('isotope explorer', () => {
  it('computes neutrons from the CHOSEN isotope, never from the element alone', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(tile('Iron'))
    const group = await within(screen.getByRole('complementary', { name: 'Element details' })).findByRole('group', { name: 'Isotopes of Iron' })
    expect(within(details().getByRole('heading', { name: 'Iron-56' }).closest('div')!).getByText('30')).toBeInTheDocument()
    await user.click(within(group).getByRole('button', { name: /^Iron-54,/ }))
    const card = details().getByRole('heading', { name: 'Iron-54' }).closest('div')!
    expect(within(card).getByText('28')).toBeInTheDocument()
    expect(card).toHaveTextContent('54 \u2212 26')
    expect(card).toHaveTextContent('5.845 %')
    expect(card).not.toHaveTextContent(/e-\d/) // no scientific notation in uncertainties
    await user.click(within(group).getByRole('button', { name: /^Iron-55,/ }))
    expect(details().getByRole('heading', { name: 'Iron-55' }).closest('div')).toHaveTextContent(/radioactive/i)
    expect(details().getByRole('heading', { name: 'Iron-55' }).closest('div')).toHaveTextContent('electron capture')
  })

  it('shows how the standard atomic weight comes from the isotopes', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(tile('Iron'))
    await details().findByRole('group', { name: 'Isotopes of Iron' })
    expect(details().getByText(/abundances above give/).textContent).toMatch(/55\.84\d+ u.*55\.845 u/)
  })

  it('explains why lithium differs, and why Tc has no standard weight', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(tile('Lithium'))
    await details().findByRole('group', { name: 'Isotopes of Lithium' })
    expect(details().getByText(/IUPAC publishes a range for Lithium/)).toBeInTheDocument()
    await user.click(tile('Technetium'))
    await details().findByRole('group', { name: 'Isotopes of Technetium' })
    expect(details().getByText(/no characteristic natural mixture of isotopes/)).toBeInTheDocument()
    expect(details().getAllByText(/every known isotope is radioactive|All isotopes of this element are radioactive/).length).toBeGreaterThanOrEqual(2) // isotope row and safety note
  })

  it('handles bismuth honestly: no strictly stable isotope, yet effectively stable', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(tile('Bismuth'))
    await details().findByRole('group', { name: 'Isotopes of Bismuth' })
    expect(details().getByText(/Strictly, bismuth has no stable isotope/)).toBeInTheDocument()
    expect(details().getByText(/negligible in practice/)).toBeInTheDocument()
    expect(details().queryByText(/must only be handled by trained people/)).not.toBeInTheDocument() // no alarmist radiation warning
  })

  it('does not call particle-unbound nuclides stable', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(tile('Lithium'))
    const group = await details().findByRole('group', { name: 'Isotopes of Lithium' })
    await user.click(within(group).getByRole('button', { name: /^Lithium-12,/ }))
    const card = details().getByRole('heading', { name: 'Lithium-12' }).closest('div')!
    expect(card).toHaveTextContent('Not established')
    expect(card).not.toHaveTextContent('Stable (no decay')
  })
})

describe('practice and test', () => {
  const answerQuiz = async (user: ReturnType<typeof userEvent.setup>, n: number) => {
    for (let i = 0; i < n; i++) {
      await user.click(screen.getAllByRole('radio')[0]!)
      await user.click(screen.getByRole('button', { name: 'Check my answer' }))
      expect(screen.getByRole('status').textContent!.length).toBeGreaterThan(40) // an explanation after every answer
      await user.click(screen.getByRole('button', { name: i === n - 1 ? 'See results' : 'Next question' }))
    }
  }

  it('runs a complete quiz, shows results and saves real progress', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Practice & Test' }))
    expect(screen.getByText(/Nothing yet/)).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Questions'), '5')
    await user.click(screen.getByRole('button', { name: 'Start quiz' }))
    expect(screen.getByText(/Question 1 of 5/)).toBeInTheDocument()
    await answerQuiz(user, 5)
    expect(screen.getByText(/\/ 5/)).toBeInTheDocument()
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY)!)
    const answered = Object.values(saved.topics as Record<string, { answered: number; correct: number }>).reduce((n, t) => n + t.answered, 0)
    expect(answered).toBe(5)
    expect(saved.attempts).toHaveLength(1)
    expect(saved.attempts[0].total).toBe(5)
    await user.click(screen.getByRole('button', { name: /new quiz with the same settings/ }))
    expect(screen.getByText(/Question 1 of 5/)).toBeInTheDocument()
  })

  it('lets the learner choose topics, blocks an empty selection and resets progress only after confirmation', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Practice & Test' }))
    for (const cb of screen.getAllByRole('checkbox')) await user.click(cb) // untick all topics
    expect(screen.getByRole('button', { name: 'Start quiz' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Choose at least one topic')
    await user.click(screen.getByRole('checkbox', { name: 'Isotopes' }))
    await user.click(screen.getByRole('radio', { name: 'Beginner' }))
    await user.selectOptions(screen.getByLabelText('Questions'), '5')
    await user.click(screen.getByRole('button', { name: 'Start quiz' }))
    expect(screen.getByText(/Isotopes/)).toBeInTheDocument()
    await answerQuiz(user, 5)
    await user.click(screen.getByRole('button', { name: 'Change settings' }))
    await user.click(screen.getByRole('button', { name: 'Reset saved progress' }))
    expect(localStorage.getItem(PROGRESS_KEY)).not.toBeNull() // not deleted until confirmed
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }))
    expect(localStorage.getItem(PROGRESS_KEY)).toBeNull()
    expect(screen.getByText(/Nothing yet/)).toBeInTheDocument()
  })

  it('survives corrupt saved progress', async () => {
    localStorage.setItem(PROGRESS_KEY, '{broken')
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Practice & Test' }))
    expect(screen.getByText(/Nothing yet/)).toBeInTheDocument()
  })
})
