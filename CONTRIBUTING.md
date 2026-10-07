# Contributing

Thanks for helping! The code is written and documented in **English**; the game and card generator interface is
available in English and Spanish.

## Setup

```bash
npm install
npm run dev          # http://localhost:5173
```

Before sending a change:

```bash
npm run lint
npm test
npm run test:e2e
```

(`npm run format` applies Prettier.) The first time on a machine without Chrome:
`npx playwright install chromium` and run the e2e tests with `CI=1`.

## Guidelines

- Keep logic **pure** and testable (no DOM, injectable `rng`); keep the DOM code thin. Add a unit test for new logic
  and an e2e spec for new visible behavior.
- Never hard-code user-facing text: add it to **both** dictionaries. The unit tests fail if keys or placeholders
  differ, or if the code uses an undefined key.
- Data that comes from outside (`localStorage`, project files, settings files) must be validated before use.
- Match the surrounding style; Prettier and ESLint enforce most of it.

## Recipes

### Add a language

1. Copy `src/i18n/locales/en` to `src/i18n/locales/<code>` and translate the texts (keep the `{placeholders}`).
2. Register it in `src/i18n/index.js` (`DICTIONARIES` and `NUMBER_LOCALES`).
3. Add an `<option>` to the selector in `src/shared/siteHeader.js`.
4. Run `npm test`: the dictionary tests tell you what is missing. The game's e2e specs assert Spanish texts, so add
   language-specific specs next to the existing ones in `tests/e2e/app.spec.js`.

### Add a card type to the generator

1. Add the type to `CARD_TYPES`, `RANGES` and `TEMPLATE_STYLES` in `src/cards/generator.js`, and a content function in
   `CONTENT` returning the card-specific fields for each card.
2. Add `cards.type.<type>` and `cards.template.<type>.{frontTop,rearTop}` to both dictionaries.
3. Add a checkbox to the auto-generate dialog in `cards/index.html` (`data-type="<type>"`).
4. Add tests in `tests/unit/cardsGenerator.test.js`.

### Add a card property

Add one row to `CARD_FIELDS` in `src/cards/model.js` and a `cards.field.<key>` text to both dictionaries; add the
input to the designer form in `cards/index.html` with the id from `formId` (or the key). The "Edit by type" dialog,
validation and file import pick it up automatically.

### Add a celebration effect

Add an entry to `BURSTS` (a list of timed canvas-confetti bursts) or `LOOPS` in `src/game/confetti.js`, a
`game.confetti.<n>` text in both dictionaries and an `<option>` in `index.html`. Add the number to `CONFETTI_MODES` in
`src/game/state.js`.

### Add a difficulty or operation rule

Edit the tables at the top of `src/game/problems.js` and extend `tests/unit/problems.test.js` with the invariant the
new level must satisfy.

## Commits

Small, focused commits with a message that says _why_. CI must be green before merging to `main`; merging publishes
the site.
