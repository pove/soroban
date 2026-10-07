/**
 * Pointer input for the abacus canvas (mouse, touch and pen through Pointer Events).
 *
 * - Tap: flips the upper bead, or pushes/pulls the nearest lower bead (and those beyond it).
 * - Drag: beads follow the pointer one position per bead spacing.
 */
import { setLower, setUpper, tapBead } from '../../core/abacus.js';
import { hitTest, nearestLowerBead } from './layout.js';

/** Movement (px) under which a press still counts as a tap. */
const TAP_SLOP = 8;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} hooks
 * @param {() => ReturnType<typeof import('./layout.js').getLayout>} hooks.getLayout
 * @param {() => import('../../core/abacus.js').Column[]} hooks.getColumns
 * @param {(columns: import('../../core/abacus.js').Column[], options: { animate: boolean }) => void} hooks.onChange
 * @param {() => boolean} hooks.isLocked when true the abacus ignores input
 * @returns {() => void} detach function
 */
export function attachAbacusInput(canvas, { getLayout, getColumns, onChange, isLocked }) {
  let press = null;

  const pointFrom = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  function onPointerDown(event) {
    if (isLocked() || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const point = pointFrom(event);
    const hit = hitTest(getLayout(), point.x, point.y);
    if (!hit) return;

    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    const column = getColumns()[hit.col];
    press = {
      pointerId: event.pointerId,
      ...hit,
      start: point,
      dragging: false,
      startLower: column.lowerActive,
      startUpper: column.upperActive,
    };
  }

  function onPointerMove(event) {
    if (!press || event.pointerId !== press.pointerId) return;
    const point = pointFrom(event);
    const dx = point.x - press.start.x;
    const dy = point.y - press.start.y;
    if (!press.dragging && Math.hypot(dx, dy) < TAP_SLOP) return;
    press.dragging = true;
    event.preventDefault();

    const { beadSpacing } = getLayout();
    const columns = getColumns();
    const next =
      press.zone === 'upper'
        ? setUpper(columns, press.col, dragUpper(press.startUpper, dy, beadSpacing))
        : setLower(columns, press.col, press.startLower - dy / beadSpacing);

    if (JSON.stringify(next[press.col]) !== JSON.stringify(columns[press.col])) {
      onChange(next, { animate: false });
    }
  }

  function onPointerUp(event) {
    if (!press || event.pointerId !== press.pointerId) return;
    const finished = press;
    press = null;
    if (finished.dragging) {
      onChange(getColumns(), { animate: true }); // settle beads on their final positions
      return;
    }

    const columns = getColumns();
    const point = pointFrom(event);
    const bead =
      finished.zone === 'upper'
        ? { type: 'upper' }
        : { type: 'lower', index: nearestLowerBead(columns, getLayout(), finished.col, point.y) };
    onChange(tapBead(columns, finished.col, bead), { animate: true });
  }

  const onPointerCancel = () => {
    press = null;
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerCancel);
  };
}

/** Upper bead while dragging: pulled toward the beam past half a spacing, away past minus half. */
function dragUpper(startActive, dy, spacing) {
  if (dy > spacing * 0.5) return true;
  if (dy < -spacing * 0.5) return false;
  return Boolean(startActive);
}
