/**
 * SVG picture of a soroban showing a number, used on the printed cards.
 * Returns markup (numbers only, no user text), ready for `innerHTML`.
 */
import { COLUMNS, LOWER_BEADS, numberToColumns } from '../core/abacus.js';

const FRAME = '#5d3a1a';
const BEAM = '#3d2812';
const ROD = '#c9b18a';
const BEAD = '#ffd700';
const BEAD_OUTLINE = '#daa520';
const ACCENT = '#ff0000';
const ACCENT_OUTLINE = '#cc0000';
const BEAD_SCALE = 1.35;

let gradientCount = 0;

function beadSvg(x, y, radius, fill, gradientId) {
  const rx = radius * BEAD_SCALE;
  const ry = rx * 0.45;
  const outline = fill === ACCENT ? ACCENT_OUTLINE : BEAD_OUTLINE;
  const ellipse = (attributes, cx = x, cy = y, w = rx, h = ry) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${h}" ${attributes}/>`;

  return (
    ellipse('fill="rgba(0,0,0,0.25)"', x + rx * 0.08, y + rx * 0.15, rx * 0.95, ry * 0.8) +
    ellipse(`fill="${fill}"`) +
    ellipse(`fill="url(#${gradientId})"`) +
    ellipse(`fill="none" stroke="${outline}" stroke-width="${rx * 0.1}"`)
  );
}

/**
 * @param {number} number integer shown on the abacus (0 - 9 999 999)
 * @param {number} width  px
 * @param {number} height px
 */
export function abacusSvg(number, width, height) {
  const columns = numberToColumns(
    Math.max(0, Math.min(10 ** COLUMNS - 1, Math.trunc(number) || 0)),
  );

  const padding = width * 0.05;
  const innerWidth = width - 2 * padding;
  const innerHeight = height - 2 * padding;
  const colWidth = innerWidth / COLUMNS;
  const dividerY = padding + innerHeight * 0.3;
  const radius = Math.min(colWidth * 0.32, innerHeight * 0.075);
  const spacing = radius * 1.6;
  const offset = radius * 1.5;
  const top = 2 + radius;
  const bottom = height - 2 - radius;
  const gradientId = `soroban-shine-${gradientCount++}`;

  const parts = [
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img">`,
    `<defs><radialGradient id="${gradientId}"><stop offset="0%" stop-color="#fff" stop-opacity="0.4"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`,
    `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="${FRAME}" stroke-width="2"/>`,
    `<line x1="${padding}" y1="${dividerY}" x2="${padding + innerWidth}" y2="${dividerY}" stroke="${BEAM}" stroke-width="3"/>`,
  ];

  columns.forEach((column, i) => {
    const x = padding + colWidth * (i + 0.5);
    parts.push(
      `<line x1="${x}" y1="2" x2="${x}" y2="${height - 2}" stroke="${ROD}" stroke-width="2"/>`,
    );
    parts.push(beadSvg(x, column.upperActive ? dividerY - offset : top, radius, BEAD, gradientId));

    // Hundreds and hundred-thousands rods get a red first bead as a reading aid.
    const fromRight = COLUMNS - 1 - i;
    const accented = fromRight === 2 || fromRight === 5;
    const inactive = LOWER_BEADS - column.lowerActive;
    for (let j = 0; j < LOWER_BEADS; j++) {
      const y =
        j < column.lowerActive
          ? dividerY + offset + j * spacing
          : bottom - (inactive - 1 - (j - column.lowerActive)) * spacing;
      parts.push(beadSvg(x, y, radius, j === 0 && accented ? ACCENT : BEAD, gradientId));
    }
  });

  parts.push('</svg>');
  return parts.join('');
}
