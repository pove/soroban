/** Game entry point: wires state, abacus, view and DOM events together. */
import '../styles/base.css';
import '../styles/game.css';

import { MAX_VALUE } from '../core/abacus.js';
import { createStore } from '../core/store.js';
import {
  applyTranslations,
  formatNumber,
  getLanguage,
  initLanguage,
  onLanguageChange,
  t,
} from '../i18n/index.js';
import { registerServiceWorker } from '../shared/registerServiceWorker.js';
import { mountSiteHeader, syncLanguageSelect } from '../shared/siteHeader.js';
import * as actions from './actions.js';
import { AbacusRenderer } from './abacus/renderer.js';
import { attachAbacusInput } from './abacus/interaction.js';
import { celebrate } from './confetti.js';
import { createCustomEditor } from './customEditor.js';
import { loadState, saveState } from './state.js';
import { getDom, isAbacusLocked, render } from './view.js';

initLanguage();
mountSiteHeader(document.getElementById('siteHeader'), {
  active: 'game',
  links: { game: './', cards: './cards/' },
  titleKey: 'game.title',
});
applyTranslations();

const dom = getDom();
const store = createStore(loadState());
const renderer = new AbacusRenderer(dom.canvas);
const helpers = { t, formatNumber };

/** Beads follow the pointer instantly while dragging and ease into place otherwise. */
let animateNextRender = true;

const apply = (transition, ...args) => store.set(transition(store.get(), ...args));

/** Runs a validation and celebrates when the answer just became correct. */
function validate(transition, ...args) {
  const before = store.get();
  const after = transition(before, ...args);
  store.set(after);
  if (after.feedback?.kind === 'correct' && before.feedback?.kind !== 'correct') {
    celebrate(after.confettiMode);
  }
}

// --- Custom input ----------------------------------------------------------------------------

const editor = createCustomEditor({
  t,
  onOperation: (problem) => apply(actions.useCustomProblem, problem),
  onNumber: (value) => apply(actions.useCustomTarget, value),
});

// --- Store subscriptions ---------------------------------------------------------------------

store.subscribe((state, previous) => {
  saveState(state);

  if (state.abacusStyle !== previous.abacusStyle) renderer.setTheme(state.abacusStyle);
  if (state.columns !== previous.columns) {
    renderer.render(state.columns, { animate: animateNextRender });
    animateNextRender = true;
  }
  if (state.round !== previous.round || state.mode !== previous.mode) {
    editor.close();
    dom.numberInput.value = '';
  }
  render(dom, state, helpers);
});

/** Re-applies every text that is not static markup after a language switch. */
function refreshLanguage(language) {
  syncLanguageSelect(language);
  editor.refreshLanguage();
  document.title = t('game.title');
  document.getElementById('appVersion').textContent = t('footer.version', {
    version: __APP_VERSION__,
  });
  render(dom, store.get(), helpers);
}
onLanguageChange(refreshLanguage);

// --- Abacus input ----------------------------------------------------------------------------

attachAbacusInput(dom.canvas, {
  getLayout: () => renderer.layout,
  getColumns: () => store.get().columns,
  isLocked: () => isAbacusLocked(store.get()),
  onChange: (columns, { animate }) => {
    const current = store.get().columns;
    if (JSON.stringify(columns) === JSON.stringify(current)) return;
    animateNextRender = animate;
    apply(actions.setColumns, columns);
  },
});

// --- Buttons ---------------------------------------------------------------------------------

dom.modeButtons.forEach(([mode, button]) =>
  button.addEventListener('click', () => apply(actions.setMode, mode)),
);

document.getElementById('btnReset').addEventListener('click', () => {
  if (!isAbacusLocked(store.get())) apply(actions.resetAbacus);
});

dom.representModeButtons.forEach((button) =>
  button.addEventListener('click', () => apply(actions.setRepresentMode, button.dataset.mode)),
);
dom.opButtons.forEach((button) =>
  button.addEventListener('click', () => apply(actions.setOperation, button.dataset.op)),
);
dom.difficultyButtons.forEach((button) =>
  button.addEventListener('click', () => apply(actions.setDifficulty, button.dataset.diff)),
);

dom.validate.addEventListener('click', () => validate(actions.validateOperation));
dom.newQuestion.addEventListener('click', () => apply(actions.newProblem));

function validateRepresent() {
  if (isAbacusLocked(store.get())) validate(actions.validateWrittenNumber, dom.numberInput.value);
  else validate(actions.validateRepresentation);
}
dom.validateRepresent.addEventListener('click', validateRepresent);
dom.newRepresent.addEventListener('click', () => {
  apply(actions.newTarget);
  if (isAbacusLocked(store.get())) setTimeout(() => dom.numberInput.focus(), 100);
});

// Number typed after reading the abacus: at most 7 digits, never negative.
dom.numberInput.addEventListener('input', () => {
  const input = dom.numberInput;
  if (input.value.length > String(MAX_VALUE).length) input.value = input.value.slice(0, 7);
  if (Number(input.value) < 0) input.value = '0';
});
dom.numberInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  dom.numberInput.blur(); // hides the on-screen keyboard
  validateRepresent();
});

// Settings
dom.confettiMode.addEventListener('change', () =>
  store.set({ ...store.get(), confettiMode: dom.confettiMode.value }),
);
dom.abacusStyle.addEventListener('change', () =>
  store.set({ ...store.get(), abacusStyle: dom.abacusStyle.value }),
);

// Custom questions: the pencil buttons, or double-click on the question like before.
const openOperationEditor = () => store.get().mode === 'operate' && editor.open('operate');
const openNumberEditor = () => store.get().mode === 'represent' && editor.open('represent');
document.getElementById('btnCustomOperation').addEventListener('click', openOperationEditor);
document.getElementById('btnCustomNumber').addEventListener('click', openNumberEditor);
dom.question.addEventListener('dblclick', openOperationEditor);
dom.representQuestion.addEventListener('dblclick', openNumberEditor);

// --- Start -----------------------------------------------------------------------------------

new ResizeObserver(() => renderer.resize()).observe(dom.canvas);
renderer.setTheme(store.get().abacusStyle);
renderer.render(store.get().columns);
refreshLanguage(getLanguage());
registerServiceWorker('./sw.js');
