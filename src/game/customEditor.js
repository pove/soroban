/**
 * Inline editor that lets players type their own operation (Operate mode) or number (Represent
 * mode). On touch devices it drives an on-screen keyboard instead of the native one.
 */
import { parseCustomNumber, parseCustomOperation } from './problems.js';

const OPERATORS = /[+\-×÷]/;

export const isTouchDevice = () =>
  globalThis.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in globalThis;

/**
 * @param {object} options
 * @param {(key: string, vars?: object) => string} options.t
 * @param {(problem: import('./problems.js').Problem) => void} options.onOperation
 * @param {(value: number) => void} options.onNumber
 */
export function createCustomEditor({ t, onOperation, onNumber }) {
  const keyboard = document.getElementById('customKeyboard');
  const keyboardDisplay = document.getElementById('keyboardDisplay');
  const containers = {
    operate: document.getElementById('operateEditor'),
    represent: document.getElementById('representEditor'),
  };

  let kind = null;
  let touch = false;
  let input = null;
  let errorBox = null;

  const placeholder = () =>
    t(kind === 'operate' ? 'game.custom.placeholderOperation' : 'game.custom.placeholderNumber');

  function syncKeyboardDisplay() {
    if (!touch || !input) return;
    keyboardDisplay.textContent =
      input.value || t(kind === 'operate' ? 'game.custom.keyboardOperation' : 'game.custom.keyboardNumber');
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }

  function submit() {
    const text = input.value;
    if (kind === 'operate') {
      const parsed = parseCustomOperation(text);
      if ('error' in parsed) return showError(t(`game.custom.error.${parsed.error}`));
      close();
      onOperation(parsed.problem);
    } else {
      const parsed = parseCustomNumber(text);
      if ('error' in parsed) return showError(t(`game.custom.error.${parsed.error}`));
      close();
      onNumber(parsed.value);
    }
  }

  function close() {
    if (!kind) return;
    containers[kind].hidden = true;
    containers[kind].replaceChildren();
    keyboard.hidden = true;
    document.body.classList.remove('keyboard-open');
    kind = null;
    input = null;
    errorBox = null;
  }

  function open(nextKind) {
    close();
    kind = nextKind;
    touch = isTouchDevice();

    const container = containers[kind];
    container.hidden = false;
    container.innerHTML = `
      <form class="custom-form" novalidate>
        <input id="manualInput" type="text" autocomplete="off" maxlength="${kind === 'operate' ? 20 : 7}" />
        <button type="submit" class="btn btn-primary btn-small">OK</button>
        <button type="button" class="btn btn-small" data-cancel></button>
      </form>
      <p class="form-error" role="alert" hidden></p>`;
    input = container.querySelector('#manualInput');
    errorBox = container.querySelector('.form-error');
    container.querySelector('[data-cancel]').textContent = t('game.custom.cancel');
    input.placeholder = placeholder();

    container.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      submit();
    });
    container.querySelector('[data-cancel]').addEventListener('click', close);
    input.addEventListener('input', () => {
      showError('');
      syncKeyboardDisplay();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });

    if (touch) {
      input.readOnly = true;
      input.inputMode = 'none';
      keyboard.hidden = false;
      document.body.classList.add('keyboard-open');
      keyboard
        .querySelectorAll('.key-operator')
        .forEach((key) => (key.disabled = kind === 'represent'));
      syncKeyboardDisplay();
    } else {
      input.focus();
    }
  }

  keyboard.addEventListener('click', (event) => {
    const key = event.target.closest('.key')?.dataset.key;
    if (!key || !input) return;

    if (key === 'done') return submit();
    if (key === 'backspace') {
      input.value = input.value.slice(0, -1);
    } else if (OPERATORS.test(key)) {
      // one operator, never first
      if (input.value === '' || OPERATORS.test(input.value)) return;
      input.value += key;
    } else {
      input.value += key;
    }
    input.dispatchEvent(new Event('input'));
  });

  return {
    open,
    close,
    isOpen: () => kind !== null,
    /** Re-applies translated texts after a language switch. */
    refreshLanguage() {
      if (!kind) return;
      input.placeholder = placeholder();
      containers[kind].querySelector('[data-cancel]').textContent = t('game.custom.cancel');
      syncKeyboardDisplay();
    },
  };
}
