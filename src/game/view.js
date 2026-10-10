/**
 * Renders the game state into the page. `render` is idempotent: it only reads the state and
 * sets DOM properties, so it can run after every state change or language switch.
 */
import { columnDigit, columnsToNumber } from '../core/abacus.js';

const byId = (id) => document.getElementById(id);

export function getDom() {
  return {
    modeButtons: [
      ['free', byId('btnFree')],
      ['represent', byId('btnRepresent')],
      ['operate', byId('btnOperate')],
    ],
    canvas: byId('abacusCanvas'),
    container: document.querySelector('.abacus-container'),
    hint: byId('abacusHint'),
    promo: byId('promoCards'),
    intro: byId('intro'),
    digits: [...document.querySelectorAll('#digitStrip span')],
    display: byId('display'),
    numberDisplay: byId('numberDisplay'),
    reset: byId('btnReset'),
    customNumber: byId('btnCustomNumber'),
    customOperation: byId('btnCustomOperation'),
    numberInput: byId('numberInput'),
    representPanel: byId('representPanel'),
    operatePanel: byId('operatePanel'),
    representQuestion: byId('representQuestion'),
    question: byId('question'),
    representModeButtons: document.querySelectorAll('.mode-repres'),
    opButtons: document.querySelectorAll('.op-btn'),
    difficultyButtons: document.querySelectorAll('.diff-btn'),
    validateRepresent: byId('btnValidateRepresent'),
    validate: byId('btnValidate'),
    newRepresent: byId('btnNewRepresent'),
    newQuestion: byId('btnNewQuestion'),
    representResult: byId('representResult'),
    result: byId('result'),
    stats: byId('stats'),
    statSolved: byId('statSolved'),
    statStreak: byId('statStreak'),
    statBest: byId('statBest'),
    confettiMode: byId('confettiMode'),
    abacusStyle: byId('abacusStyle'),
  };
}

/** True when the abacus shows a number the player must read, so the beads must not be moved. */
export const isAbacusLocked = (state) =>
  state.mode === 'represent' && state.representMode === 'abacusToNumber';

/** Localized text of a verdict. */
export function feedbackText(feedback, { t, formatNumber }) {
  if (feedback.kind === 'correct') return t('game.result.correct');
  if ('answer' in feedback)
    return t('game.result.wrongOperate', { answer: formatNumber(feedback.answer) });
  const key = feedback.written ? 'game.result.wrongWritten' : 'game.result.wrongRepresent';
  return t(key, { value: formatNumber(feedback.value), target: formatNumber(feedback.target) });
}

function renderFeedback({ result, validate, next }, feedback, helpers) {
  const solved = feedback?.kind === 'correct';
  validate.style.display = solved ? 'none' : '';
  next.style.display = solved ? '' : 'none';

  result.hidden = !feedback;
  result.className = feedback ? `result ${solved ? 'correct' : 'incorrect'}` : 'result';
  result.textContent = feedback ? feedbackText(feedback, helpers) : '';
}

function setPressed(button, active) {
  button.classList.toggle('active', active);
  button.setAttribute('aria-pressed', String(active));
}

function renderToggleGroup(buttons, isActive) {
  buttons.forEach((button) => setPressed(button, isActive(button)));
}

/**
 * @param {ReturnType<typeof getDom>} dom
 * @param {import('./state.js').GameState} state
 * @param {{ t: Function, formatNumber: Function }} helpers
 */
export function render(dom, state, helpers) {
  const { t, formatNumber } = helpers;
  const value = columnsToNumber(state.columns);
  const isRepresent = state.mode === 'represent';
  const isOperate = state.mode === 'operate';
  const reading = isAbacusLocked(state);

  dom.modeButtons.forEach(([mode, button]) => setPressed(button, mode === state.mode));

  dom.representPanel.classList.toggle('active', isRepresent);
  dom.operatePanel.classList.toggle('active', isOperate);

  // Number display: hidden while the player has to type the number they read on the abacus.
  // In Represent/Operate the "?" or "0" placeholder adds a line and no information, so it is hidden.
  const placeholder = (isRepresent && !state.feedback) || (isOperate && value === 0);
  dom.numberDisplay.hidden = reading || placeholder;
  dom.numberInput.hidden = !reading;
  dom.numberDisplay.textContent = formatNumber(value);

  // Represent panel
  dom.representQuestion.textContent = reading
    ? t('game.question.read')
    : t('game.question.represent', {
        number: state.target ? formatNumber(state.target.value) : '?',
      });
  renderToggleGroup(
    dom.representModeButtons,
    (button) => button.dataset.mode === state.representMode,
  );
  renderFeedback(
    {
      result: dom.representResult,
      validate: dom.validateRepresent,
      next: dom.newRepresent,
    },
    isRepresent ? state.feedback : null,
    helpers,
  );

  // Operate panel
  dom.question.textContent = state.problem
    ? `${formatNumber(state.problem.a)} ${state.problem.op} ${formatNumber(state.problem.b)} = ?`
    : t('game.question.operationPlaceholder');
  renderToggleGroup(dom.opButtons, (button) => button.dataset.op === state.operation);
  renderFeedback(
    { result: dom.result, validate: dom.validate, next: dom.newQuestion },
    isOperate ? state.feedback : null,
    helpers,
  );

  // Only the question of the current mode is shown in the question card.
  dom.display.dataset.mode = state.mode;
  dom.representQuestion.hidden = !isRepresent;
  dom.question.hidden = !isOperate;
  dom.customNumber.hidden = !isRepresent;
  dom.customOperation.hidden = !isOperate;

  // Difficulty chips live in both panels; none is highlighted for a player-typed question.
  const customQuestion = isRepresent ? state.target?.manual : state.problem?.manual;
  renderToggleGroup(
    dom.difficultyButtons,
    (button) => !customQuestion && button.dataset.diff === state.difficulty,
  );

  // Score
  dom.stats.hidden = state.mode === 'free';
  dom.promo.hidden = state.mode !== 'free';
  dom.intro.hidden = state.mode !== 'free';
  dom.statSolved.textContent = formatNumber(state.stats.solved);
  dom.statStreak.textContent = formatNumber(state.stats.streak);
  dom.statBest.textContent = formatNumber(state.stats.best);

  // Digit under each rod: a reading aid, hidden in Represent mode where it would give the answer.
  const firstUsed = state.columns.findIndex((column) => columnDigit(column) > 0);
  dom.digits.forEach((cell, i) => {
    cell.textContent = columnDigit(state.columns[i]);
    cell.classList.toggle('zero', firstUsed === -1 || i < firstUsed);
  });
  dom.digits[0].parentElement.hidden = isRepresent || isOperate;

  // Abacus chrome and settings
  dom.container.classList.toggle('simple-style', state.abacusStyle === 'simple');
  dom.container.classList.toggle('locked', reading);
  dom.reset.hidden = reading;
  dom.hint.hidden = !reading && state.mode !== 'free';
  dom.hint.textContent = t(reading ? 'game.abacus.locked' : 'game.abacus.hint');
  dom.confettiMode.value = state.confettiMode;
  dom.abacusStyle.value = state.abacusStyle;
}
