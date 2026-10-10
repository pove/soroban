/** Visual themes of the abacus canvas. */

export const THEMES = {
  classic: {
    background: '#dcb483',
    frame: '#4a2a12',
    beam: '#2e1b0c',
    rod: '#8a6a45',
    beamDot: '#f5deb3',
    upper: { fill: '#c8283a', stroke: '#7d1020' },
    lower: { fill: '#2a2c33', stroke: '#0b0c0f' },
    accent: null,
    // Double-cone beads, like the ones on a real soroban
    beadShape: 'bicone',
    beadScale: 1,
  },
  simple: {
    background: '#e6e0dc',
    frame: '#d4a76a',
    beam: '#b8956a',
    rod: '#c9b18a',
    beamDot: '#7a5a2e',
    upper: { fill: '#ffd700', stroke: '#daa520' },
    lower: { fill: '#ffd700', stroke: '#daa520' },
    // The first lower bead of the hundreds and hundred-thousands rods is red, as a reading aid.
    accent: { fill: '#ff0000', stroke: '#cc0000', rodsFromRight: [2, 5] },
    beadShape: 'flat',
    beadScale: 1.35,
  },
};

/** Fill/stroke for a bead under a theme. */
export function beadColors(theme, bead, columnCount) {
  if (bead.type === 'upper') return theme.upper;
  const rodFromRight = columnCount - 1 - bead.col;
  if (theme.accent && bead.index === 0 && theme.accent.rodsFromRight.includes(rodFromRight)) {
    return theme.accent;
  }
  return theme.lower;
}
