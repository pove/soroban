/** Visual themes of the abacus canvas. */

export const THEMES = {
  classic: {
    background: '#d4a574',
    frame: '#5d3a1a',
    beam: '#3d2812',
    rod: '#8b7355',
    beamDot: '#f5deb3',
    upper: { fill: '#c41e3a', stroke: '#8b1a1a' },
    lower: { fill: '#1a1a1a', stroke: '#000000' },
    accent: null,
    flatBeads: false,
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
    flatBeads: true,
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
