# Architecture

The app is two static pages (the game and the card generator) built with [Vite](https://vite.dev) from plain ES
modules. There is no UI framework: each page has a small state store, pure functions that compute the next state,
and view functions that copy the state into the DOM. Dependencies at runtime: only
[`canvas-confetti`](https://github.com/catdad/canvas-confetti).

## Principles

1. **Logic is pure and separate from the DOM.** Anything that can be a function of its inputs is one — problem
   generation, abacus encoding, state transitions, card generation, print pagination. These are unit tested without a
   browser.
2. **Randomness is injected.** Generators take an `rng` argument (default `Math.random`), so tests and the card
   sample are reproducible.
3. **State flows one way.** `event → transition(state) → store.set → subscribers (render, persist)`.
4. **Untrusted input is validated at the edge.** Saved state, project files and settings files are normalized
   (`migrateState`, `normalizeCard`, `normalizeSettings`) so corrupted or old data never reaches the rest of the code.
5. **Both languages everywhere.** UI text lives in the dictionaries, never in logic; logic returns codes
   (e.g. `{ error: 'divideByZero' }`) and the view translates them.

## Game (`src/game`)

```
                     ┌────────────┐   pointer events    ┌──────────────────┐
  user ─ taps/drags ▶│ interaction│────────────────────▶│                  │
                     └────────────┘                     │                  │
  user ─ buttons ───────────────────────────────────────▶│  main.js         │
                                                        │  (wiring)        │
         ┌──────────────┐  next state                   │                  │
         │ actions.js   │◀──────────────────────────────│                  │
         │ (pure)       │──────────────────────────────▶│                  │
         └──────────────┘                               └───────┬──────────┘
                                                                │ store.set
                      ┌─────────────────────────┬───────────────┴──────┐
                      ▼                         ▼                      ▼
                 view.js (DOM)          renderer.js (canvas)     state.js (localStorage)
```

| File                              | Responsibility                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| `state.js`                        | State shape, defaults, `migrateState` (also reads the pre-3.0 format), persistence |
| `actions.js`                      | Pure transitions: change mode, new question, validate, score                       |
| `problems.js`                     | Question generators per difficulty, soroban carry rules, parsing typed input       |
| `abacus/layout.js`                | Geometry: bead positions, hit testing — pure functions of the canvas size          |
| `abacus/renderer.js`, `themes.js` | Canvas drawing, bead animation, high-DPI handling, the two visual themes           |
| `abacus/interaction.js`           | Pointer Events: tap = move a bead, drag = beads follow the pointer                 |
| `customEditor.js`                 | Inline editor (and touch keyboard) for player-typed questions                      |
| `view.js`                         | `render(dom, state)`: idempotent state → DOM                                       |
| `confetti.js`                     | Celebration effects as data (lists of timed bursts)                                |
| `main.js`                         | Creates the store, subscribes render/persist, attaches DOM events                  |

`core/abacus.js` is the heart: a rod is `{ upperActive: 0|1, lowerActive: 0..4 }`, the abacus is an array of seven
rods, and `columnsToNumber` / `numberToColumns` / `tapBead` are the only functions that know soroban arithmetic.
The card generator reuses it to draw SVGs.

### Persisted state

Stored in `localStorage` under the historical key `sorobanAppState`:

```jsonc
{
  "version": 2,
  "mode": "operate", // free | represent | operate
  "operation": "+", // + - × ÷
  "difficulty": "easy", // veryEasy | easy | medium | hard
  "representMode": "numberToAbacus", // | abacusToNumber
  "problem": { "a": 47, "b": 38, "op": "+", "answer": 85, "manual": false },
  "target": { "value": 345, "manual": false },
  "abacusColumns": [{ "upperActive": 0, "lowerActive": 3 } /* ×7 */],
  "confettiMode": "2", // "0"-"10" | "surprise"
  "abacusStyle": "classic", // | simple
  "stats": { "solved": 3, "streak": 2, "best": 5 },
  "round": 7,
  "scoredRound": 6,
}
```

The verdict shown to the player (`feedback`) is transient. A solved question is recognised again after a reload by
comparing the abacus with the answer. `round`/`scoredRound` make sure a question is counted in the score only once.

## Card generator (`src/cards`)

| File             | Responsibility                                                                         |
| ---------------- | -------------------------------------------------------------------------------------- |
| `model.js`       | `CARD_FIELDS` table (every card property), `normalizeCard`, sort/dedupe helpers        |
| `generator.js`   | Default settings, `generateCards(settings, {rng})`, `normalizeSettings` (legacy files) |
| `layout.js`      | A4 grid maths and pagination: front/rear pages, duplex vs manual, mixed card sizes     |
| `abacusSvg.js`   | SVG picture of an abacus showing a number                                              |
| `cardElement.js` | DOM for one card side                                                                  |
| `project.js`     | Project file (de)serialization, the localized sample deck                              |
| `state.js`       | Pure transitions over `{ cards, selected, editingIndex, customSettings }`              |
| `ui/*.js`        | One module per screen area: designer, saved cards, print view, three dialogs           |

The `CARD_FIELDS` table drives the design form, the "Edit by type" dialog, input coercion and validation: adding a
card property is one new row, not 30 lines of `getElementById`.

Generation settings are plain data and are **self-contained**: they include the labels and the texts printed on the
cards, taken from the active language when the defaults are created. That keeps `generateCards` free of any i18n
dependency, and lets users download the settings, edit them and load them back.

## Internationalization (`src/i18n`)

- `locales/<lang>/{common,game,cards}.js` are flat `key → text` dictionaries with `{placeholder}` interpolation.
- Static markup uses `data-i18n`, `data-i18n-placeholder`, `data-i18n-title` and `data-i18n-aria-label`; dynamic text
  uses `t('key', vars)`. Changing the language re-translates the markup and runs a `render` over the dynamic parts.
- The language is chosen from, in order: `?lang=xx`, the saved choice, `navigator.languages`, English.
  The choice is shared by both pages.
- Numbers are formatted with the language's locale (`1.234.567` / `1,234,567`).
- English is the fallback for a missing key; a unit test fails if the dictionaries differ, if a placeholder differs
  between languages or if the code uses a key that is not defined.

## Offline and hosting

- `public/sw.js` precaches both pages and the scripts/styles they reference when it installs, serves pages
  network-first (always the newest version when online) and fingerprinted assets stale-while-revalidate.
- The build uses `base: './'`, so asset URLs are relative and the same output works under `/repo/` on GitHub Pages,
  on a custom domain, or from a plain folder.
- `public/manifest.json` makes the app installable.

## Testing strategy

| Level           | Tool                | What it protects                                                              |
| --------------- | ------------------- | ----------------------------------------------------------------------------- |
| Unit            | Vitest (jsdom)      | Rules and data transformations; i18n completeness                             |
| End to end      | Playwright (Chrome) | What a player sees and does, including drag/tap, language, files and printing |
| Static analysis | ESLint, Prettier    | Style and common mistakes                                                     |

### How the refactoring was verified

The original code was a ~2,300-line `index.html` and a ~2,000-line card generator page, each with all its JavaScript
inline and no tests. Before touching anything:

1. The original files were committed unchanged (first commit of the repository).
2. A Playwright suite describing the behavior of both pages was written **against the original code** — Spanish
   messages, number formatting, deterministic questions through a stubbed `Math.random`, saved-state restoration,
   print pagination, file download names — and passed there (21 tests).
3. The code was then rebuilt as modules. The same specs, with only the element ids mapped to the new English ids,
   passed against the new code. Features that did not exist before got their own specs and unit tests.
4. The old code was removed once both suites were green; it remains available in the git history
   (`git show 54885ab:index.html`).

Behavior that was intentionally changed during the refactor:

- A wrong verdict disappears as soon as the beads move (it used to stay on screen).
- Dragging makes beads follow the pointer; taps are new.
- Input errors are shown inline instead of with `alert()`; `x`, `*`, `/` and `:` are accepted as operators.
- Fixed a bug where a subtraction fallback could produce a negative answer, and where a custom question left the
  "manual" flag set for later generated questions.
- Card pages with different card sizes are printed on separate pages instead of using the first card's size for all.
