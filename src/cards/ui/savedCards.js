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
  item.setAttribute('role', 'button');
  item.setAttribute('aria-pressed', String(selected));
  item.tabIndex = 0;

  const toggle = () => hooks.onToggle(index);
  item.addEventListener('click', toggle);
  item.addEventListener('keydown', (event) => {
    if (event.target !== item || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    toggle();
  });

  const label = document.createElement('p');
  label.className = 'card-type-label';
  label.textContent = typeOf(card);

  const thumbnail = createCardElement(card, 'front');
  thumbnail.classList.add('card-thumbnail');
  const wrapper = document.createElement('div');
  wrapper.className = 'card-wrapper';
  wrapper.append(thumbnail);

  item.append(label, wrapper, createActions(index, hooks));
  return item;
}

/**
 * @param {import('../state.js').CardsState} state
 * @param {{ onToggle: Function, onEdit: Function, onDelete: Function }} hooks
 */
export function renderSavedCards(state, hooks) {
  const container = byId('savedCards');
  container.replaceChildren(
    ...state.cards.map((card, index) => createItem(card, index, state.selected.has(index), hooks)),
  );

  const selected = state.selected.size;
  byId('cardCount').textContent = state.cards.length;
  byId('selectedCount').textContent = selected;
  byId('selectedCountToDelete').textContent = selected;
  byId('emptyNote').hidden = state.cards.length > 0;

  const label = byId('editByTypeLabel');
  label.dataset.i18n = selected > 0 ? 'cards.action.editSelected' : 'cards.action.editByType';
  label.textContent = t(label.dataset.i18n) + (selected > 0 ? ` (${selected})` : '');
}
