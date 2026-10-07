/** The "design a card" form and its live preview. */
import { t } from '../../i18n/index.js';
import { createCardElement } from '../cardElement.js';
import { CARD_FIELDS, DEFAULT_CARD_TYPE, coerceField, formIdOf, normalizeCard } from '../model.js';

const byId = (id) => document.getElementById(id);

/** Initial values of a fresh form (the texts follow the current language). */
function defaultCard() {
  return normalizeCard({
    cardType: DEFAULT_CARD_TYPE,
    width: 70,
    height: 70,
    borderThickness: 4,
    frontTopText: t('cards.design.sampleFrontTop'),
    frontBottomText: t('cards.design.sampleFrontBottom'),
    rearTopText: t('cards.design.sampleRearTop'),
    rearBottomText: t('cards.design.sampleRearBottom'),
    frontTopSize: 20,
    frontBottomSize: 20,
    rearTopSize: 20,
    rearBottomSize: 20,
  });
}

/** Reads the form into a card. */
export function readCard() {
  const card = { cardType: byId('cardType').value || DEFAULT_CARD_TYPE };
  for (const field of CARD_FIELDS) {
    const input = byId(formIdOf(field));
    card[field.key] = coerceField(field, field.kind === 'bool' ? input.checked : input.value);
  }
  return card;
}

/** Fills the form from a card. */
export function writeCard(card) {
  byId('cardType').value = card.cardType || DEFAULT_CARD_TYPE;
  for (const field of CARD_FIELDS) {
    const input = byId(formIdOf(field));
    if (field.kind === 'bool') input.checked = Boolean(card[field.key]);
    else input.value = card[field.key];
  }
  syncSvgControls();
  updatePreview();
}

function syncSvgControls() {
  byId('frontSVGControls').hidden = !byId('frontShowSVG').checked;
  byId('rearSVGControls').hidden = !byId('rearShowSVG').checked;
}

export function updatePreview() {
  const card = readCard();
  const preview = byId('preview');
  preview.replaceChildren();
  for (const side of ['front', 'rear']) {
    const figure = document.createElement('div');
    const caption = document.createElement('p');
    caption.className = 'preview-caption';
    caption.textContent = t(`cards.preview.${side}`);
    figure.append(caption, createCardElement(card, side));
    preview.append(figure);
  }
}

/** Switches the form between "new card" and "edit card" labels. */
export function renderMode(isEditing) {
  byId('panelTitle').textContent = t(isEditing ? 'cards.design.edit' : 'cards.design.new');
  byId('saveCardBtn').textContent = t(isEditing ? 'cards.design.saveEdit' : 'cards.design.saveNew');
  byId('cancelBtn').hidden = !isEditing;
}

/**
 * @param {object} hooks
 * @param {(card: object) => void} hooks.onSave
 * @param {() => void} hooks.onCancel
 */
export function initDesigner({ onSave, onCancel }) {
  writeCard(defaultCard());

  for (const id of ['cardType', ...CARD_FIELDS.map(formIdOf)]) {
    byId(id).addEventListener('input', updatePreview);
    byId(id).addEventListener('change', updatePreview);
  }
  for (const side of ['front', 'rear']) {
    byId(`${side}ShowSVG`).addEventListener('change', () => {
      syncSvgControls();
      updatePreview();
    });
  }

  byId('saveCardBtn').addEventListener('click', () => onSave(readCard()));
  byId('cancelBtn').addEventListener('click', onCancel);
}
