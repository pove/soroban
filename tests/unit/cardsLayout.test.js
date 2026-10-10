import { describe, expect, it } from 'vitest';
import { abacusSvg } from '../../src/cards/abacusSvg.js';
import { A4, buildPages, groupBySize, gridFor, summarize } from '../../src/cards/layout.js';
import * as actions from '../../src/cards/state.js';
import { normalizeCard } from '../../src/cards/model.js';

const cardsOf = (count, size = {}) =>
  Array.from({ length: count }, (_, i) =>
    normalizeCard({ cardType: 'T', frontBottomText: String(i), width: 90, height: 65, ...size }),
  );

describe('print grid', () => {
  it('fits 2 x 4 cards of 90 x 65 mm on A4', () => {
    expect(gridFor({ width: 90, height: 65 })).toMatchObject({ perRow: 2, perCol: 4, perPage: 8 });
  });

  it('fits more small cards per page', () => {
    expect(gridFor({ width: 45, height: 45 }).perPage).toBeGreaterThan(
      gridFor({ width: 90, height: 65 }).perPage,
    );
  });

  it('always fits at least one card, even a huge one', () => {
    expect(gridFor({ width: 500, height: 600 }).perPage).toBe(1);
  });

  it('never exceeds the printable area', () => {
    for (const [width, height] of [
      [30, 30],
      [70, 70],
      [90, 65],
      [100, 140],
      [150, 150],
    ]) {
      const { perRow, perCol, gap } = gridFor({ width, height });
      if (perRow > 1)
        expect(perRow * width + (perRow - 1) * gap).toBeLessThanOrEqual(A4.width - 20);
      if (perCol > 1)
        expect(perCol * height + (perCol - 1) * gap).toBeLessThanOrEqual(A4.height - 20);
    }
  });
});

describe('buildPages', () => {
  it('returns nothing for no cards', () => {
    expect(buildPages([], { duplex: false })).toEqual([]);
  });

  it('manual duplex: all fronts first, then all rears', () => {
    const pages = buildPages(cardsOf(20), { duplex: false }); // 8 per page => 3 pages per side
    expect(pages.map((p) => p.side)).toEqual(['front', 'front', 'front', 'rear', 'rear', 'rear']);
    expect(pages.map((p) => p.cards.length)).toEqual([8, 8, 4, 8, 8, 4]);
  });

  it('automatic duplex: each front is followed by its own rear', () => {
    const cards = cardsOf(20);
    const pages = buildPages(cards, { duplex: true });
    expect(pages.map((p) => p.side)).toEqual(['front', 'rear', 'front', 'rear', 'front', 'rear']);
    expect(pages[0].cards).toEqual(pages[1].cards);
  });

  it('puts every card on exactly one front and one rear page', () => {
    const cards = cardsOf(23);
    for (const duplex of [true, false]) {
      const pages = buildPages(cards, { duplex });
      for (const side of ['front', 'rear']) {
        const printed = pages.filter((p) => p.side === side).flatMap((p) => p.cards);
        expect(printed).toEqual(cards);
      }
    }
  });

  it('mirrors rear pages only', () => {
    const pages = buildPages(cardsOf(3), { duplex: true });
    expect(pages.find((p) => p.side === 'front').mirrored).toBe(false);
    expect(pages.find((p) => p.side === 'rear').mirrored).toBe(true);
  });

  it('prints cards of different sizes on separate pages', () => {
    const cards = [...cardsOf(2), ...cardsOf(2, { width: 50, height: 50 })];
    expect(groupBySize(cards)).toHaveLength(2);
    const pages = buildPages(cards, { duplex: false });
    expect(pages.filter((p) => p.side === 'front')).toHaveLength(2);
    pages.forEach((page) => {
      expect(new Set(page.cards.map((c) => `${c.width}x${c.height}`)).size).toBe(1);
    });
  });
});

describe('summarize', () => {
  it('matches the numbers shown to the player', () => {
    expect(summarize(cardsOf(32), { duplex: false })).toMatchObject({
      perRow: 2,
      perCol: 4,
      perPage: 8,
      pages: 8,
      mixedSizes: false,
    });
  });

  it('flags mixed sizes', () => {
    expect(
      summarize([...cardsOf(1), ...cardsOf(1, { width: 40 })], { duplex: true }).mixedSizes,
    ).toBe(true);
  });
});

describe('abacus SVG', () => {
  it('draws seven rods and thirty-five beads', () => {
    const svg = abacusSvg(1234567, 300, 150);
    expect((svg.match(/<line /g) ?? []).length).toBe(7 + 1); // rods + beam
    expect((svg.match(/fill="none" stroke="#(?:daa520|cc0000)"/g) ?? []).length).toBe(35);
  });

  it('paints only the upper beads red', () => {
    for (const n of [0, 1234567, 9999999]) {
      const svg = abacusSvg(n, 300, 150);
      expect((svg.match(/fill="#ff0000"/g) ?? []).length).toBe(7);
      expect((svg.match(/fill="#ffd700"/g) ?? []).length).toBe(28);
    }
  });

  it('clamps and sanitizes the number', () => {
    expect(() => abacusSvg(-5, 100, 50)).not.toThrow();
    expect(() => abacusSvg(99_999_999, 100, 50)).not.toThrow();
    expect(() => abacusSvg(NaN, 100, 50)).not.toThrow();
  });

  it('gives every picture its own gradient id', () => {
    const id = (svg) => svg.match(/id="(soroban-shine-\d+)"/)[1];
    expect(id(abacusSvg(1, 100, 50))).not.toBe(id(abacusSvg(1, 100, 50)));
  });

  it('places beads differently for different numbers', () => {
    expect(abacusSvg(0, 300, 150)).not.toBe(abacusSvg(5, 300, 150));
  });
});

describe('cards state', () => {
  const base = () => actions.replaceCards(actions.createInitialState(), cardsOf(5));

  it('adds a new card in sorted position and clears the selection', () => {
    const selected = actions.toggleSelected(base(), 2);
    const next = actions.saveCard(selected, normalizeCard({ cardType: 'A' }));
    expect(next.cards).toHaveLength(6);
    expect(next.cards[0].cardType).toBe('A');
    expect(next.selected.size).toBe(0);
  });

  it('replaces the card being edited', () => {
    const editing = actions.startEditing(base(), 1);
    const next = actions.saveCard(
      editing,
      normalizeCard({ cardType: 'T', frontBottomText: 'edited' }),
    );
    expect(next.cards).toHaveLength(5);
    expect(next.cards.some((c) => c.frontBottomText === 'edited')).toBe(true);
    expect(next.editingIndex).toBeNull();
  });

  it('toggles and clears the selection without mutating the old one', () => {
    const state = base();
    const one = actions.toggleSelected(state, 1);
    expect([...one.selected]).toEqual([1]);
    expect(state.selected.size).toBe(0);
    expect(actions.toggleSelected(one, 1).selected.size).toBe(0);
    expect(actions.clearSelection(one).selected.size).toBe(0);
  });

  it('deletes one card or the selection', () => {
    const state = actions.toggleSelected(actions.toggleSelected(base(), 0), 3);
    expect(actions.deleteCard(base(), 0).cards).toHaveLength(4);
    expect(actions.deleteSelected(state).cards).toHaveLength(3);
  });

  it('selects by type, optionally keeping the current selection', () => {
    const cards = [...cardsOf(2), ...cardsOf(2).map((c) => ({ ...c, cardType: 'U' }))];
    const state = actions.replaceCards(actions.createInitialState(), cards);
    const first = actions.selectTypes(state, ['T']);
    expect(first.selected.size).toBe(2);
    expect(actions.selectTypes(first, ['U'], { keep: true }).selected.size).toBe(4);
    expect(actions.selectTypes(first, ['U']).selected.size).toBe(2);
  });

  it('appends generated cards without duplicates and reports how many were dropped', () => {
    const state = base();
    const { state: next, duplicatesRemoved } = actions.appendCards(state, [
      ...cardsOf(5),
      ...cardsOf(1, { width: 40 }),
    ]);
    expect(duplicatesRemoved).toBe(5);
    expect(next.cards).toHaveLength(6);
  });

  it('removes duplicates', () => {
    const state = actions.replaceCards(actions.createInitialState(), [
      ...cardsOf(2),
      ...cardsOf(2),
    ]);
    const { state: next, removed } = actions.removeDuplicates(state);
    expect(removed).toBe(2);
    expect(next.cards).toHaveLength(2);
  });

  describe('type edit', () => {
    const mixed = () =>
      actions.replaceCards(actions.createInitialState(), [
        ...cardsOf(2),
        ...cardsOf(2).map((c) => ({ ...c, cardType: 'U' })),
      ]);

    it('updates every card of the chosen types', () => {
      const { state, updated } = actions.applyTypeEdit(mixed(), ['T'], { borderColor: '#123456' });
      expect(updated).toBe(2);
      expect(
        state.cards.filter((c) => c.borderColor === '#123456').every((c) => c.cardType === 'T'),
      ).toBe(true);
    });

    it('with a selection, only touches selected cards', () => {
      const selected = actions.toggleSelected(mixed(), 0);
      const { state, updated } = actions.applyTypeEdit(selected, ['T', 'U'], { width: 55 });
      expect(updated).toBe(1);
      expect(state.cards.filter((c) => c.width === 55)).toHaveLength(1);
    });
  });

  it('prints the selection or everything', () => {
    const state = actions.toggleSelected(base(), 3);
    expect(actions.cardsToPrint(state, { selectedOnly: true })).toEqual([state.cards[3]]);
    expect(actions.cardsToPrint(state, { selectedOnly: false })).toHaveLength(5);
  });
});
