# Periodic Table Explorer

Interactive chemistry learning platform. React 19, Vite 8, TypeScript (strict), Tailwind CSS v4, Zod. No account, no backend, no paid API: everything runs from local data.

## What works today

| Area | State |
|---|---|
| Four destinations: Start Learning, Explore Elements, Learn Chemistry, Practice & Test | Working |
| First-visit introduction: 8 lessons (matter to periods), each with explanation, example, visual and a question; skip, repeat, completion remembered | Working |
| Periodic table (118 elements), list view, search (name/symbol/number), filters (category, period, group, block), keyboard navigation | Working |
| Element panel: identity, structure, physical/chemical properties, discovery, abundance, uses, safety, source status | Working |
| **Isotope explorer** (3,557 isotopes): pick an isotope, neutrons computed as A - Z, mass, abundance, half-life, decay, spin; shows the standard atomic weight being derived from isotope masses | Working |
| Glossary: 37 terms, searchable, and any underlined term in the app opens a plain-English dialog | Working |
| Quiz engine: 10 topics, 3 difficulties, explanations after every answer, results by topic, locally saved progress | Working |

## Not built yet (do not assume these exist)

Three explanation levels per element; table colour modes (families, states, radius, electronegativity...); element comparison; related-element highlighting; hover tooltips on tiles; atomic visualization lab (Bohr, orbitals, probability, 3D); periodic trends engine and heatmaps; real-world scenes (the panel shows compiled text only); structure builder; bonding explorer; guided learning paths; spaced-repetition scheduling (only history is saved); PWA/offline install; per-element field-level provenance (provenance is per field, dataset-wide); atomic radius, metallic character, electrical conductivity and reactivity data.

## Commands

```
npm run dev | build | test | typecheck | lint
npm run data:build                       # rebuild src/data/*.json from data/raw/
python3 scripts/extract_mendeleev.py     # refresh data/raw/mendeleev-extract.json (needs: pip install mendeleev periodictable)
PW_CHROMIUM_PATH=/path/to/chrome npx playwright test   # e2e + axe (omit the variable if Playwright's browsers are installed)
```

## Data and how it was checked

Sources (all recorded in `src/data/elements.json` under `meta.sources` and `meta.fieldStatus`):

| Field | Source | Status |
|---|---|---|
| Standard atomic weights | CIAAW (Meija 2016) via the `mendeleev` package | Critically evaluated |
| Isotope masses | IUPAC/AME via `mendeleev` | Critically evaluated |
| Half-lives, decay modes, spins, abundances | NUBASE2020 (Kondev 2021) via `mendeleev` | Critically evaluated |
| First ionization energy | NIST Atomic Spectra Database via `mendeleev` | Critically evaluated (theoretical for Mt-Og: not available) |
| Oxidation states | Wikipedia-derived table via `mendeleev` | Compiled, secondary |
| Uses, occurrence, name origin | Text in `mendeleev`, original source not stated | Compiled, secondary |
| Melting/boiling, density, electronegativity, electron affinity, configurations | Community dataset (Periodic-Table-JSON) | Compiled, secondary; estimates from Z=100 |

The NIST, CIAAW and NNDC websites are not reachable from the build sandbox, so the evaluated data is taken from the `mendeleev` package, which cites them, not from the sites directly. **Nothing has been verified element by element against IUPAC or NIST.**

Cross-checks that were actually run:

- 288 naturally occurring isotopes compared with NIST values in `periodictable`: 0 mass differences over 0.0002 u; 10 abundance differences of at most 0.13 percentage points (Yb, Hf, Ir; edition differences); the reference has no uranium abundances.
- Community vs CIAAW atomic weights: 0 disagreements. Community vs NIST first ionization energy: 9 disagreements of 1-4% (Tc, Ta, W, Os, Ir, Fr, Ac, Th, Lr), NIST used.
- The abundance-weighted mean of isotope masses reproduces the CIAAW weight for 83 of 84 elements; lithium is the exception because IUPAC publishes a range for it.
- Stable nuclides: 252 found by rule (naturally occurring, no observed decay), against about 251 in the literature; tin has 10, the most of any element; elements without a stable isotope are exactly Tc, Pm and Z >= 83.
- Elements with no natural isotope equal the independently written list of elements with no standard atomic weight (34).
- Layout derived from first principles agrees with the upstream coordinates for all 118.

Bugs the cross-checks caught (now covered by tests): second ionization energies labelled "first"; the source's `is_radioactive` flag treating particle-unbound nuclides such as Li-12 as stable; bismuth treated as having a stable isotope; a fake element 119, a misspelled name and three scraping artefacts in the community file.

Licence: the community dataset repository has no LICENSE file and its summaries are Wikipedia text (CC BY-SA 4.0); `mendeleev` is MIT-licensed. Decide on reuse terms before publishing.

## Architecture

`src/domain` (identity rules, schemas, isotope logic) / `scripts` (data build) / `src/data` (generated JSON, loaders) / `src/lib` (pure logic) / `src/features/*` (UI by destination). The isotope file (~0.9 MB) loads on demand. Scientific facts are never hard-coded in components; lesson and glossary text is checked against the data in tests.
