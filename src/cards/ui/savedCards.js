/** The grid of saved cards with selection, edit and delete controls. */
import { t } from '../../i18n/index.js';
import { createCardElement } from '../cardElement.js';
import { typeOf } from '../model.js';

const byId = (id) => document.getElementById(id);

/** Actions overlaying each thumbnail. */
function createActions(index, { onEdit, onDelete }) {
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const make = (className, icon, labelKey, handler) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn btn-small ${className}`;
    button.textContent = icon;
    button.title = t(labelKey);
    button.setAttribute('aria-label', t(labelKey));
    button.addEventListener('click', (event) => {
      event.stopPropagation(); // do not toggle the card selection
      handler(index);
    });
    return button;
  };

  actions.append(
    make('btn-primary', '✏️', 'cards.action.edit', onEdit),
    make('btn-danger', '🗑️', 'cards.action.delete', onDelete),
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
  const wrapper = document.createElement('div');
  wrapper.className = 'card-wrapper';
  wrapper.append(thumbnail);

  item.append(checkbox, label, wrapper, createActions(index, hooks));
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

  const label = byId('editByTypeLabel');
  label.dataset.i18n = selected > 0 ? 'cards.action.editSelected' : 'cards.action.editByType';
  label.textContent = t(label.dataset.i18n) + (selected > 0 ? ` (${selected})` : '');
}
