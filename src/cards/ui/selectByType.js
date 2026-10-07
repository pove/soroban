/** "Select by type" dialog. */
import { t } from '../../i18n/index.js';
import { countByType } from '../model.js';

const byId = (id) => document.getElementById(id);

/**
 * @param {object} hooks
 * @param {() => import('../state.js').CardsState} hooks.getState
 * @param {(types: string[], keep: boolean) => void} hooks.onSelect
 * @param {(message: string, kind?: string) => void} hooks.notify
 */
export function initSelectByType({ getState, onSelect, notify }) {
  const dialog = byId('selectByTypeDialog');

  byId('btnSelectByType2').addEventListener('click', () => {
    const types = [...byId('selectTypeSelector').selectedOptions].map((option) => option.value);
    if (types.length === 0) return notify(t('cards.msg.selectType'), 'error');
    onSelect(types, byId('addToSelection').checked);
    dialog.close();
  });

  return {
    open() {
      const counts = countByType(getState().cards);
      byId('selectTypeSelector').replaceChildren(
        ...Object.keys(counts)
          .sort()
          .map((type) =>
            Object.assign(document.createElement('option'), {
              value: type,
              textContent: t('cards.editor.typeOption', { type, count: counts[type] }),
            }),
          ),
      );
      byId('addToSelection').checked = false;
      dialog.showModal();
    },
  };
}
