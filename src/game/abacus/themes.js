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
    upper: { fill: '#ff0000', stroke: '#cc0000' },
    lower: { fill: '#ffd700', stroke: '#daa520' },
    beadShape: 'flat',
    beadScale: 1.35,
  },
};

/** Fill/stroke for a bead under a theme: upper beads (worth 5) and lower beads (worth 1). */
export function beadColors(theme, bead) {
  return bead.type === 'upper' ? theme.upper : theme.lower;
}
