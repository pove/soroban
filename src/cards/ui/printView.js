/** Full-screen print preview with A4 pages (and the matching @media print rules in cards.css). */
import { t } from '../../i18n/index.js';
import { createCardElement } from '../cardElement.js';
import { CARD_GAP, buildPages, summarize } from '../layout.js';

const byId = (id) => document.getElementById(id);

let current = [];

function createPage({ side, grid, cards, mirrored }) {
  const page = document.createElement('div');
  page.className = 'print-page';
  page.dataset.side = side;

  const sheet = document.createElement('div');
  sheet.className = 'print-grid';
  sheet.style.gridTemplateColumns = `repeat(${grid.perRow}, ${cards[0].width}mm)`;
  sheet.style.gap = `${CARD_GAP}mm`;
  if (mirrored) sheet.style.direction = 'rtl';
  sheet.append(...cards.map((card) => createCardElement(card, side)));

  page.append(sheet);
  return page;
}

function renderPages() {
  const duplex = byId('autoDuplexMode').checked;
  byId('printContent').replaceChildren(...buildPages(current, { duplex }).map(createPage));

  const summary = summarize(current, { duplex });
  byId('printInfo').textContent =
    t('cards.print.info', {
      perRow: summary.perRow,
      perCol: summary.perCol,
      perPage: summary.perPage,
      count: current.length,
      pages: summary.pages,
    }) + (summary.mixedSizes ? ` ${t('cards.print.mixedSizes')}` : '');
}

export function openPrintView(cards) {
  current = cards;
  renderPages();
  byId('printView').classList.add('active');
}

export function closePrintView() {
  byId('printView').classList.remove('active');
}

export const refreshPrintView = () => {
  if (byId('printView').classList.contains('active')) renderPages();
};

export function initPrintView() {
  byId('btnClosePrint').addEventListener('click', closePrintView);
  byId('btnPrint').addEventListener('click', () => window.print());
  byId('autoDuplexMode').addEventListener('change', renderPages);
}
