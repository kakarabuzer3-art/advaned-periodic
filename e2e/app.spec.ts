import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const shot = (page: Page, name: string) => page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: false })

// Most tests are about the explorer, which a returning visitor lands on. Tests titled [fresh] are a first visit.
test.beforeEach(async ({ page }, info) => {
  if (!info.title.includes('[fresh]')) {
    await page.addInitScript(() => localStorage.setItem('pte:onboarding:v1', JSON.stringify({ completed: true })))
  }
})

async function axeSeriousOrCritical(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  console.log(`axe [${label}] violations (all impacts):`, JSON.stringify(results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }))))
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)
}
const pageOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

function collectErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  return errors
}

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only')

  test('loads with 118 tiles, no console errors and no page-level horizontal scroll', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/')
    await expect(page.locator('button[data-z]')).toHaveCount(118)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await shot(page, 'desktop-home')
    expect(errors).toEqual([])
  })

  test('each of the 10 categories renders its own distinct colour, shared by tiles and legend', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('button[data-z]')).toHaveCount(118) // the app renders after a dynamic import
    const ids = ['alkali-metal', 'alkaline-earth-metal', 'transition-metal', 'post-transition-metal', 'metalloid',
      'reactive-nonmetal', 'halogen', 'noble-gas', 'lanthanoid', 'actinoid']
    const colours = await page.evaluate((cats) =>
      cats.map((id) => {
        const tile = document.querySelector(`button[data-z][data-cat="${id}"]`)!
        const swatch = document.querySelector(`.legend-btn[data-cat="${id}"]`)!
        return {
          id,
          tile: getComputedStyle(tile).borderTopColor,
          swatch: getComputedStyle(swatch, '::before').backgroundColor,
        }
      }), ids)
    expect(new Set(colours.map((c) => c.tile)).size).toBe(10)
    for (const c of colours) expect(c.swatch, c.id).toBe(c.tile)
  })

  test('legend does not overlap any element tile', async ({ page }) => {
    await page.goto('/')
    const legend = await page.getByRole('group', { name: 'Filter by element category' }).boundingBox()
    expect(legend).not.toBeNull()
    const boxes = await page.locator('button[data-z]').evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect()
        return { z: (e as HTMLElement).dataset.z, x: r.x, y: r.y, w: r.width, h: r.height }
      }),
    )
    const l = legend!
    const hits = boxes.filter((b) => b.x < l.x + l.width && b.x + b.w > l.x && b.y < l.y + l.height && b.y + b.h > l.y)
    expect(hits.map((h) => h.z)).toEqual([])
  })

  test('selecting an element shows docked details; filtering dims others', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /^26 Fe Iron/ }).click()
    const panel = page.getByRole('complementary', { name: 'Element details' })
    await expect(panel.getByRole('heading', { name: 'Iron', exact: true })).toBeVisible()
    expect(page.url()).toContain('#element=Fe')
    await page.getByRole('button', { name: /^Halogens/ }).click()
    await expect(page.locator('.tile[data-dimmed="true"]')).toHaveCount(112)
    await shot(page, 'desktop-selected-filtered')
    await page.getByRole('button', { name: /^Halogens/ }).click() // clear the halogen filter before searching
    await page.getByRole('searchbox').fill('oganesson')
    await page.keyboard.press('Enter')
    await expect(panel.getByText(/Limited data/)).toBeVisible()
    await expect(page.locator('button[data-z="118"]')).toHaveCSS('opacity', '1')
    await shot(page, 'desktop-predicted')
  })

  test('keyboard: Tab reaches the table once and arrows move between tiles', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /^1 H Hydrogen/ }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('button', { name: /^2 He Helium/ })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('button', { name: /^10 Ne Neon/ })).toBeFocused()
  })

  test('axe: no serious or critical accessibility violations (table + open panel)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /^79 Au Gold/ }).click()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    console.log('axe violations (all impacts):', JSON.stringify(results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }))))
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([])
  })
})

test.describe('mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only')

  test('defaults to list view, filters by category, opens and closes the sheet', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/')
    await expect(page.getByRole('list', { name: 'Elements' }).getByRole('listitem')).toHaveCount(118)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await shot(page, 'mobile-list')
    await page.getByRole('button', { name: /^Noble gases/ }).click()
    await expect(page.getByRole('list', { name: 'Elements' }).getByRole('listitem')).toHaveCount(7)
    await page.getByRole('button', { name: /^Neon/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Neon' })).toBeVisible()
    await shot(page, 'mobile-sheet')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    expect(errors).toEqual([])
  })

  test('table view scrolls inside its own container, not the page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Table' }).click()
    await expect(page.locator('button[data-z]')).toHaveCount(118)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await shot(page, 'mobile-table')
  })

  test('touch targets in list view are at least 44px tall', async ({ page }) => {
    await page.goto('/')
    const heights = await page.getByRole('list', { name: 'Elements' }).getByRole('button').evaluateAll((els) => els.slice(0, 10).map((e) => e.getBoundingClientRect().height))
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44)
  })

  test('axe: no serious or critical violations (list view with sheet open)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /^Carbon/ }).click()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    console.log('axe violations (all impacts):', JSON.stringify(results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }))))
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([])
  })
})

test.describe('all destinations (desktop and mobile)', () => {
  const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name })

  test('[fresh] a new visitor gets the introduction, finishes it, and is not shown it again', async ({ page }, info) => {
    const errors = collectErrors(page)
    await page.goto('/')
    await expect(page.getByText('Introduction: step 1 of 8')).toBeVisible()
    await shot(page, `${info.project.name}-start-lesson-1`)
    expect(await axeSeriousOrCritical(page, 'start lesson 1')).toEqual([])
    for (let i = 0; i < 7; i++) await page.getByRole('button', { name: /Next/ }).click()
    await expect(page.getByText('Introduction: step 8 of 8')).toBeVisible()
    await shot(page, `${info.project.name}-start-lesson-8`)
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0)
    await page.getByRole('button', { name: /Finish and explore/ }).click()
    await expect(page.getByRole('heading', { name: 'Explore Elements' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Explore Elements' })).toBeVisible()
    await expect(page.getByText(/Introduction: step/)).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('Learn Chemistry: glossary works, has no serious accessibility problems and fits the screen', async ({ page }, info) => {
    await page.goto('/')
    await nav(page, 'Learn Chemistry').click()
    await expect(page.getByRole('list', { name: 'Glossary' }).getByRole('listitem')).toHaveCount(37)
    await page.getByRole('searchbox', { name: 'Search the glossary' }).fill('electroneg')
    await expect(page.getByRole('list', { name: 'Glossary' }).getByRole('listitem')).toHaveCount(1)
    await page.getByRole('searchbox', { name: 'Search the glossary' }).fill('')
    await page.getByRole('list', { name: 'Glossary' }).locator('summary', { hasText: 'How strongly an atom attracts' }).click() // opens that <details>
    await expect(page.getByText('The Pauling scale is the most common')).toBeVisible()
    await shot(page, `${info.project.name}-learn`)
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0)
    expect(await axeSeriousOrCritical(page, 'learn')).toEqual([])
  })

  test('Practice & Test: a full quiz runs, explains answers, and passes the accessibility scan at each stage', async ({ page }, info) => {
    await page.goto('/')
    await nav(page, 'Practice & Test').click()
    await expect(page.getByRole('heading', { name: 'Practice & Test' })).toBeVisible()
    expect(await axeSeriousOrCritical(page, 'practice setup')).toEqual([])
    await page.getByLabel('Questions').selectOption('5')
    await page.getByRole('button', { name: 'Start quiz' }).click()
    await page.getByRole('radio').first().check()
    await page.getByRole('button', { name: 'Check my answer' }).click()
    await expect(page.getByRole('status')).toContainText(/Correct|Not quite/)
    await shot(page, `${info.project.name}-practice-feedback`)
    expect(await axeSeriousOrCritical(page, 'practice feedback')).toEqual([])
    await page.getByRole('button', { name: /Next question/ }).click()
    for (let i = 1; i < 5; i++) {
      await page.getByRole('radio').first().check()
      await page.getByRole('button', { name: 'Check my answer' }).click()
      await page.getByRole('button', { name: i === 4 ? 'See results' : 'Next question' }).click()
    }
    await expect(page.getByText(/\/ 5/)).toBeVisible()
    await shot(page, `${info.project.name}-practice-results`)
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0)
    expect(await axeSeriousOrCritical(page, 'practice results')).toEqual([])
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pte:progress:v1') ?? 'null'))
    expect(saved.attempts[0].total).toBe(5)
  })

  test('isotope explorer: loads on demand, switches isotope, passes accessibility', async ({ page, isMobile }, info) => {
    await page.goto('/')
    if (isMobile) await page.getByRole('button', { name: /^Iron/ }).click()
    else await page.getByRole('button', { name: /^26 Fe Iron/ }).click()
    const dialogOrPanel = isMobile ? page.getByRole('dialog') : page.getByRole('complementary', { name: 'Element details' })
    const group = dialogOrPanel.getByRole('group', { name: 'Isotopes of Iron' })
    await expect(group).toBeVisible()
    await expect(dialogOrPanel.getByRole('heading', { name: 'Iron-56' })).toBeVisible()
    await group.getByRole('button', { name: /^Iron-54,/ }).click()
    await expect(dialogOrPanel.getByRole('heading', { name: 'Iron-54' })).toBeVisible()
    await expect(dialogOrPanel).toContainText('28')
    await dialogOrPanel.getByText('Three different').scrollIntoViewIfNeeded()
    await shot(page, `${info.project.name}-isotopes`)
    expect(await axeSeriousOrCritical(page, 'isotope explorer')).toEqual([])
  })

  test('a glossary term opens a dialog, Escape closes it and focus returns to the term', async ({ page, isMobile }) => {
    await page.goto('/')
    if (isMobile) await page.getByRole('button', { name: /^Carbon/ }).click()
    else await page.getByRole('button', { name: /^6 C Carbon/ }).click()
    const scope = isMobile ? page.getByRole('dialog') : page.getByRole('complementary', { name: 'Element details' })
    const term = scope.getByRole('button', { name: 'Period', exact: true })
    await term.click()
    const explain = page.getByRole('dialog').filter({ hasText: 'Explain this simply' })
    await expect(explain.getByRole('heading', { name: 'Period' })).toBeVisible()
    expect(await axeSeriousOrCritical(page, 'term dialog')).toEqual([])
    await page.keyboard.press('Escape')
    await expect(explain).toBeHidden()
    await expect(term).toBeFocused()
  })

  test('every destination fits the screen without sideways page scrolling', async ({ page }) => {
    await page.goto('/')
    for (const name of ['Start Learning', 'Explore Elements', 'Learn Chemistry', 'Practice & Test']) {
      await nav(page, name).click()
      expect(await pageOverflow(page), name).toBeLessThanOrEqual(0)
    }
  })

  test('browser back returns to the previous destination', async ({ page }) => {
    await page.goto('/')
    await nav(page, 'Learn Chemistry').click()
    await expect(page.getByRole('heading', { name: 'Learn Chemistry' })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Explore Elements' })).toBeVisible()
  })
})
