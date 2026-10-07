/**
 * "Edit by type" dialog: change chosen properties on every card of the selected types
 * (or only on the selected cards). Its form is generated from CARD_FIELDS.
 */
import { t } from '../../i18n/index.js';
import { CARD_FIELDS, FIELD_GROUPS, coerceField, countByType, typeOf } from '../model.js';

const byId = (id) => document.getElementById(id);

const GROUP_TITLES = {
  appearance: 'cards.editor.appearance',
  front: 'cards.editor.frontSide',
  rear: 'cards.editor.rearSide',
  frontSvg: 'cards.editor.frontSvg',
  rearSvg: 'cards.editor.rearSvg',
};

const INPUT_TYPES = { int: 'number', text: 'text', color: 'color', bool: 'checkbox' };

/** One row: a checkbox ("change this property") and the value input it enables. */
function createRow(field) {
  const row = document.createElement('div');
  row.className = 'form-group editor-row';

  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.id = `edit-${field.key}`;

  const text = document.createElement('span');
  text.dataset.i18n = `cards.field.${field.key}`;
  text.textContent = t(text.dataset.i18n);

  const label = document.createElement('label');
  label.className = 'check';
  label.htmlFor = toggle.id;
  label.append(toggle, ' ', text);

  const input = document.createElement('input');
  input.type = INPUT_TYPES[field.kind];
  input.id = `type-${field.key}`;
  input.disabled = true;
  if (field.min !== undefined) input.min = field.min;
  if (field.max !== undefined) input.max = field.max;
  if (field.kind === 'bool') input.className = 'inline-check';

  toggle.addEventListener('change', () => (input.disabled = !toggle.checked));
  row.append(label, input);
  return row;
}

function buildForm() {
  const container = byId('typeEditFields');
  container.replaceChildren();
  for (const group of FIELD_GROUPS) {
    const title = document.createElement('h3');
    title.dataset.i18n = GROUP_TITLES[group];
    title.textContent = t(GROUP_TITLES[group]);
    container.append(title, ...CARD_FIELDS.filter((f) => f.group === group).map(createRow));
  }
}

const selectedTypes = () => [...byId('typeSelector').selectedOptions].map((option) => option.value);

/** Cards the dialog will act on: selected cards of the chosen types, or all cards of them. */
function scopedCards(state) {
  const types = selectedTypes();
  const base = state.selected.size ? [...state.selected].map((i) => state.cards[i]) : state.cards;
  return base.filter((card) => types.includes(typeOf(card)));
}

function loadSample(state) {
  const cards = scopedCards(state);
  byId('typeEditForm').hidden = cards.length === 0 && selectedTypes().length === 0;
  byId('typeCardCount').textContent = cards.length;
  const sample = cards[0];
  if (!sample) return;
  for (const field of CARD_FIELDS) {
    const input = byId(`type-${field.key}`);
    if (field.kind === 'bool') input.checked = Boolean(sample[field.key]);
    else input.value = sample[field.key];
  }
}

/** Property changes ticked in the form. */
function readUpdates() {
  const updates = {};
  for (const field of CARD_FIELDS) {
    if (!byId(`edit-${field.key}`).checked) continue;
    const input = byId(`type-${field.key}`);
    updates[field.key] = coerceField(field, field.kind === 'bool' ? input.checked : input.value);
  }
  return updates;
}

/**
 * @param {object} hooks
 * @param {() => import('../state.js').CardsState} hooks.getState
 * @param {(types: string[], updates: object) => void} hooks.onApply
 */
export function initTypeEditor({ getState, onApply }) {
  const dialog = byId('typeEditorDialog');
  buildForm();

  byId('typeSelector').addEventListener('change', () => loadSample(getState()));
  byId('btnApplyTypeEdit').addEventListener('click', () => {
    const types = selectedTypes();
    if (types.length) onApply(types, readUpdates());
  });

  return {
    open() {
      const state = getState();
      const selector = byId('typeSelector');
      selector.replaceChildren();

      const fromSelection = state.selected.size > 0;
      const counts = countByType(state.cards, fromSelection ? state.selected : null);
      for (const type of Object.keys(counts).sort()) {
        const option = document.createElement('option');
        option.value = type;
        option.selected = fromSelection; // selection-based editing starts with every type chosen
        option.textContent = t(fromSelection ? 'cards.editor.typeOptionSelected' : 'cards.editor.typeOption', {
          type,
          count: counts[type],
        });
        selector.append(option);
      }

      byId('typeEditForm').hidden = true;
      if (fromSelection) loadSample(state);
      dialog.showModal();
    },
    close: () => dialog.close(),
  };
}
