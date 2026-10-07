/**
 * A4 print layout: how many cards fit per page and how they are split into pages.
 * Pure functions, so pagination can be tested without a browser.
 */

export const A4 = { width: 210, height: 297 }; // mm
export const PAGE_MARGIN = 10; // mm
export const CARD_GAP = 5; // mm

/** How many cards of a given size fit in the printable area (always at least one). */
export function gridFor(card, page = A4, margin = PAGE_MARGIN, gap = CARD_GAP) {
  const perRow = Math.max(1, Math.floor((page.width - 2 * margin + gap) / (card.width + gap)));
  const perCol = Math.max(1, Math.floor((page.height - 2 * margin + gap) / (card.height + gap)));
  return { perRow, perCol, perPage: perRow * perCol, gap };
}

/** Splits cards into runs of identical size, because each page has one grid size. */
export function groupBySize(cards) {
  const groups = new Map();
  for (const card of cards) {
    const key = `${card.width}x${card.height}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(card);
  }
  return [...groups.values()];
}

function pagesFor(group, side) {
  const grid = gridFor(group[0]);
  const pages = [];
  for (let start = 0; start < group.length; start += grid.perPage) {
    pages.push({
      side,
      grid,
      cards: group.slice(start, start + grid.perPage),
      // Rear sides are laid out right-to-left so each card lands behind its own front
      // once the sheet is flipped along its long edge.
      mirrored: side === 'rear',
    });
  }
  return pages;
}

/**
 * Pages to print for a list of cards.
 *
 * @param {object[]} cards
 * @param {{ duplex: boolean }} options
 *   `duplex: true` alternates front and rear pages (printer flips the sheet itself);
 *   `false` prints every front first and then every rear (manual double-sided printing).
 */
export function buildPages(cards, { duplex }) {
  if (cards.length === 0) return [];
  const groups = groupBySize(cards);

  if (duplex) {
    return groups.flatMap((group) => {
      const fronts = pagesFor(group, 'front');
      const rears = pagesFor(group, 'rear');
      return fronts.flatMap((front, i) => [front, rears[i]]);
    });
  }

  return [
    ...groups.flatMap((group) => pagesFor(group, 'front')),
    ...groups.flatMap((group) => pagesFor(group, 'rear')),
  ];
}

/** Numbers shown in the print dialog. */
export function summarize(cards, options) {
  const pages = buildPages(cards, options);
  const grid = cards.length ? gridFor(groupBySize(cards)[0][0]) : { perRow: 0, perCol: 0, perPage: 0 };
  return { ...grid, pages: pages.length, mixedSizes: groupBySize(cards).length > 1 };
}
