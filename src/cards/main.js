/** Card generator entry point. */
import '../styles/base.css';
import '../styles/cards.css';

import { createStore } from '../core/store.js';
import {
  applyTranslations,
  getLanguage,
  initLanguage,
  onLanguageChange,
  t,
} from '../i18n/index.js';
import { registerServiceWorker } from '../shared/registerServiceWorker.js';
import { mountSiteHeader, syncLanguageSelect } from '../shared/siteHeader.js';
import { showToast } from '../shared/toast.js';
import { versionText } from '../shared/version.js';
import { createDefaultSettings, generateCards } from './generator.js';
import { parseProject, buildSample, projectFilename, serializeProject } from './project.js';
import * as actions from './state.js';
import { initAutoGenerate } from './ui/autoGenerate.js';
import { initDesigner, renderMode, showTab, updatePreview, writeCard } from './ui/designer.js';
import { downloadText, pickTextFile } from './ui/files.js';
import { initPrintView, openPrintView, refreshPrintView } from './ui/printView.js';
import { renderSavedCards } from './ui/savedCards.js';
import { initSelectByType } from './ui/selectByType.js';
import { initTypeEditor } from './ui/typeEditor.js';

initLanguage();
mountSiteHeader(document.getElementById('siteHeader'), {
  active: 'cards',
  links: { game: '../', cards: './' },
  titleKey: 'cards.title',
});
applyTranslations();

const byId = (id) => document.getElementById(id);
const store = createStore(actions.createInitialState());
const apply = (transition, ...args) => store.set(transition(store.get(), ...args));
const notify = (message, kind) => showToast(message, { kind });

/** Replaces the whole collection after asking when it would overwrite existing cards. */
function confirmReplace() {
  return store.get().cards.length === 0 || confirm(t('cards.msg.confirmReplace'));
}

// --- Designer --------------------------------------------------------------------------------

initDesigner({
  onSave: (card) => {
    apply(actions.saveCard, card);
    notify(t('cards.msg.saved'));
  },
  onCancel: () => apply(actions.cancelEditing),
});

const designer = byId('designer');

function editCard(index) {
  apply(actions.startEditing, index);
  writeCard(store.get().cards[index]);
  showTab('tabFormat');
  designer.open = true;
  designer.scrollIntoView({ behavior: 'smooth' });
}

byId('linkDesigner').addEventListener('click', () => {
  designer.open = true;
});

/** A freshly loaded or generated deck is what people want to see: fold the form and show the deck. */
const collapseDesigner = () => {
  designer.open = false;
  document.querySelector('.deck').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// --- Dialogs ---------------------------------------------------------------------------------

const typeEditor = initTypeEditor({
  getState: store.get,
  onApply: (types, updates) => {
    const { state, updated } = actions.applyTypeEdit(store.get(), types, updates);
    store.set(state);
    notify(t('cards.msg.updated', { count: updated, types: types.length }));
    typeEditor.close();
  },
});

const selectByType = initSelectByType({
  getState: store.get,
  onSelect: (types, keep) => apply(actions.selectTypes, types, { keep }),
  notify,
});

const autoGenerate = initAutoGenerate({
  getState: store.get,
  onSettingsLoaded: (settings) => {
    apply(actions.setCustomSettings, settings);
    autoGenerate.renderStatus(settings);
  },
  notify,
  onGenerate: ({ perLevel, types }) => {
    const state = store.get();
    const base = state.customSettings ?? createDefaultSettings(t);
    const settings = { ...base, numPerCombination: perLevel, cardTypes: types };

    const planned = perLevel * settings.difficulties.length * types.length;
    const question = state.cards.length
      ? t('cards.msg.confirmAdd', { count: state.cards.length })
      : t('cards.msg.confirmGenerate', { count: planned });
    if (!confirm(question)) return;

    try {
      const { cards } = generateCards(settings);
      const { state: next, duplicatesRemoved } = actions.appendCards(state, cards);
      store.set(next);
      collapseDesigner();
      const message = t('cards.msg.generated', { count: cards.length, total: next.cards.length });
      notify(
        duplicatesRemoved
          ? `${message} ${t('cards.msg.generatedDuplicates', { count: duplicatesRemoved })}`
          : message,
      );
      autoGenerate.close();
    } catch (error) {
      notify(t('cards.msg.generateError', { message: error.message }), 'error');
    }
  },
});

document
  .querySelectorAll('[data-close-dialog]')
  .forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));

// --- Project actions -------------------------------------------------------------------------

byId('btnSaveProject').addEventListener('click', () => {
  const { cards } = store.get();
  if (cards.length === 0) return notify(t('cards.msg.noCardsToSave'), 'error');
  downloadText(projectFilename(), serializeProject(cards));
  notify(t('cards.msg.projectSaved'));
});

byId('btnLoadProject').addEventListener('click', async () => {
  const text = await pickTextFile(byId('loadFile'));
  if (text === null) return;
  try {
    const { cards } = parseProject(text);
    if (!confirmReplace()) return;
    apply(actions.replaceCards, cards);
    collapseDesigner();
    notify(t('cards.msg.projectLoaded', { count: cards.length }));
  } catch (error) {
    const invalid = error.message === 'Invalid project file';
    notify(
      t(invalid ? 'cards.msg.invalidProject' : 'cards.msg.loadError', { message: error.message }),
      'error',
    );
  }
});

byId('btnLoadSample').addEventListener('click', () => {
  if (!confirmReplace()) return;
  const cards = buildSample(t);
  apply(actions.replaceCards, cards);
  collapseDesigner();
  notify(t('cards.msg.sampleLoaded', { count: cards.length }));
});

byId('btnAutoGen').addEventListener('click', autoGenerate.open);

// --- Saved cards actions ---------------------------------------------------------------------

const requireCards = (messageKey) => {
  if (store.get().cards.length > 0) return true;
  notify(t(messageKey), 'error');
  return false;
};

function print(selectedOnly) {
  const state = store.get();
  if (selectedOnly && state.selected.size === 0)
    return notify(t('cards.msg.noneSelected'), 'error');
  if (!selectedOnly && !requireCards('cards.msg.noCardsToPrint')) return;
  openPrintView(actions.cardsToPrint(state, { selectedOnly }));
}
byId('btnPrintAll').addEventListener('click', () => print(false));
byId('btnPrintSelected').addEventListener('click', () => print(true));

byId('btnSelectByType').addEventListener(
  'click',
  () => requireCards('cards.msg.noCardsAvailable') && selectByType.open(),
);
byId('btnEditByType').addEventListener(
  'click',
  () => requireCards('cards.msg.noCardsToEdit') && typeEditor.open(),
);

byId('btnCleanDuplicates').addEventListener('click', () => {
  if (!requireCards('cards.msg.noCardsToProcess')) return;
  const { state, removed } = actions.removeDuplicates(store.get());
  if (removed === 0) return notify(t('cards.msg.noDuplicates'));
  if (!confirm(t('cards.msg.duplicatesFound', { count: removed }))) return;
  store.set(state);
  notify(t('cards.msg.duplicatesRemoved', { count: removed }));
});

byId('btnDeleteSelected').addEventListener('click', () => {
  if (store.get().selected.size > 0) apply(actions.deleteSelected);
});
byId('btnDeselectAll').addEventListener('click', () => apply(actions.clearSelection));

// --- Rendering -------------------------------------------------------------------------------

const cardHooks = {
  onToggle: (index) => apply(actions.toggleSelected, index),
  onEdit: editCard,
  onDelete: (index) => {
    if (confirm(t('cards.msg.confirmDelete'))) apply(actions.deleteCard, index);
  },
};

function render(state) {
  renderSavedCards(state, cardHooks);
  renderMode(state.editingIndex !== null);
}

store.subscribe(render);
initPrintView();

onLanguageChange((language) => {
  syncLanguageSelect(language);
  document.title = t('cards.title');
  byId('appVersion').textContent = versionText(t);
  render(store.get());
  updatePreview();
  refreshPrintView();
});

document.title = t('cards.title');
byId('appVersion').textContent = versionText(t);
syncLanguageSelect(getLanguage());
render(store.get());
registerServiceWorker('../sw.js');
