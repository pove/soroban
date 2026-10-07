/** "Auto-generate batch" dialog. */
import { t } from '../../i18n/index.js';
import { CARD_TYPES, createDefaultSettings, normalizeSettings } from '../generator.js';
import { downloadText, pickTextFile } from './files.js';

const byId = (id) => document.getElementById(id);

const typeCheckboxes = () => [...document.querySelectorAll('#autoGenDialog input[data-type]')];

function renderStatus(customSettings) {
  const status = byId('settingsStatus');
  status.textContent = t(customSettings ? 'cards.auto.customSettings' : 'cards.auto.defaultSettings');
  status.classList.toggle('status-ok', Boolean(customSettings));
}

/**
 * @param {object} hooks
 * @param {() => import('../state.js').CardsState} hooks.getState
 * @param {(settings: object) => void} hooks.onSettingsLoaded
 * @param {(options: { perLevel: number, types: string[] }) => void} hooks.onGenerate
 * @param {(message: string, kind?: string) => void} hooks.notify
 */
export function initAutoGenerate({ getState, onSettingsLoaded, onGenerate, notify }) {
  const dialog = byId('autoGenDialog');

  byId('btnLoadSettings').addEventListener('click', async () => {
    const text = await pickTextFile(byId('loadSettingsFile'));
    if (text === null) return;
    try {
      onSettingsLoaded(normalizeSettings(JSON.parse(text)));
      notify(t('cards.msg.settingsLoaded'));
    } catch (error) {
      const invalid = error.message === 'Invalid settings file';
      notify(t(invalid ? 'cards.msg.invalidSettings' : 'cards.msg.settingsError', { message: error.message }), 'error');
    }
  });

  byId('btnDownloadSettings').addEventListener('click', () => {
    downloadText('card_settings.json', JSON.stringify(createDefaultSettings(t), null, 2));
  });

  byId('btnGenerate').addEventListener('click', () => {
    const types = typeCheckboxes()
      .filter((box) => box.checked)
      .map((box) => box.dataset.type)
      .filter((type) => CARD_TYPES.includes(type));
    if (types.length === 0) return notify(t('cards.msg.selectGenType'), 'error');
    onGenerate({ perLevel: Number.parseInt(byId('autoGenCount').value, 10) || 10, types });
  });

  return {
    open() {
      renderStatus(getState().customSettings);
      dialog.showModal();
    },
    close: () => dialog.close(),
    renderStatus,
  };
}
