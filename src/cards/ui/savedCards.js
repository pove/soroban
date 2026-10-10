/** The grid of saved cards with selection, edit and delete controls. */
import { t } from '../../i18n/index.js';
import { createCardElement } from '../cardElement.js';
import { typeOf } from '../model.js';

const byId = (id) => document.getElementById(id);

/** Width of a thumbnail in CSS px; the card is scaled down to fit it whatever its size. */
const THUMB_WIDTH = 116;
const PX_PER_MM = 96 / 25.4;

const ICONS = {
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />',
  delete:
    '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />',
};

/** Actions overlaying each thumbnail. */
function createActions(index, { onEdit, onDelete }) {
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const make = (className, icon, labelKey, handler) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `card-action ${className}`;
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[icon]}</svg>`;
    button.title = t(labelKey);
    button.setAttribute('aria-label', t(labelKey));
    button.addEventListener('click', (event) => {
      event.stopPropagation(); // do not toggle the card selection
      handler(index);
    });
    return button;
  };

  actions.append(
    make('card-action--edit', 'edit', 'cards.action.edit', onEdit),
    make('card-action--delete', 'delete', 'cards.action.delete', onDelete),
  );
  return actions;
}

function createItem(card, index, selected, hooks) {
  const item = document.createElement('div');
  item.className = 'card-item';
  item.classList.toggle('selected', selected);

  // The whole tile toggles the selection for pointer users; the checkbox serves the keyboard
  // and screen readers.
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'card-select';
  checkbox.checked = selected;
  checkbox.dataset.cardIndex = index;
  checkbox.setAttribute('aria-label', `${t('cards.action.select')}: ${typeOf(card)}`);
  checkbox.addEventListener('change', () => hooks.onToggle(index));

  item.addEventListener('click', (event) => {
    if (!event.target.closest('.card-actions, .card-select')) hooks.onToggle(index);
  });

  const label = document.createElement('p');
  label.className = 'card-type-label';
  label.textContent = typeOf(card);

  const thumbnail = createCardElement(card, 'front');
  thumbnail.classList.add('card-thumbnail');
  const scale = THUMB_WIDTH / (card.width * PX_PER_MM);
  thumbnail.style.transform = `scale(${scale})`;
  const wrapper = document.createElement('div');
  wrapper.className = 'card-wrapper';
  wrapper.style.width = `${THUMB_WIDTH}px`;
  wrapper.style.height = `${card.height * PX_PER_MM * scale}px`;
  wrapper.append(thumbnail);

  item.append(checkbox, wrapper, label, createActions(index, hooks));
  return item;
}

/**
 * @param {import('../state.js').CardsState} state
 * @param {{ onToggle: Function, onEdit: Function, onDelete: Function }} hooks
 */
export function renderSavedCards(state, hooks) {
  const container = byId('savedCards');
  // The list is rebuilt on every change, so keep keyboard focus on the same card.
  const focusedIndex = document.activeElement?.dataset?.cardIndex;
  container.replaceChildren(
    ...state.cards.map((card, index) => createItem(card, index, state.selected.has(index), hooks)),
  );

  if (focusedIndex !== undefined) {
    container.querySelector(`.card-select[data-card-index="${focusedIndex}"]`)?.focus();
  }

  const selected = state.selected.size;
  byId('cardCount').textContent = state.cards.length;
  byId('selectedCount').textContent = selected;
  byId('selectedCountToDelete').textContent = selected;
  byId('emptyNote').hidden = state.cards.length > 0;
  byId('deckTools').hidden = state.cards.length === 0;
  byId('selectionBar').hidden = selected === 0;
  document.body.classList.toggle('has-selection', selected > 0);

  const label = byId('editByTypeLabel');
  label.dataset.i18n = selected > 0 ? 'cards.action.editSelected' : 'cards.action.editByType';
  label.textContent = t(label.dataset.i18n) + (selected > 0 ? ` (${selected})` : '');
}
