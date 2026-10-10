/**
 * Canvas renderer for the abacus: draws the frame, rods and beads, keeps the canvas crisp on
 * high-DPI screens and eases beads toward their resting positions when they move.
 */
import { beadTargets, getLayout, rodX } from './layout.js';
import { THEMES, beadColors } from './themes.js';

const EASING = 0.32;
const SETTLE_DISTANCE = 0.25;

const keyOf = (bead) => `${bead.col}:${bead.type}:${bead.index}`;

export class AbacusRenderer {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = THEMES.classic;
    this.columns = null;
    this.layout = getLayout(1, 1);
    this.current = new Map(); // bead key -> currently drawn y
    this.frame = 0;
    this.reducedMotion =
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  setTheme(name) {
    this.theme = THEMES[name] ?? THEMES.classic;
    this.draw();
  }

  /** Matches the canvas backing store to its CSS size. Call when the layout changes. */
  resize() {
    const { canvas, ctx } = this;
    if (!ctx) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    const ratio = globalThis.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.layout = getLayout(width, height);
    this.snap();
    this.draw();
  }

  /**
   * Shows a new abacus state.
   * @param {boolean} animate ease beads to their new positions instead of jumping
   */
  render(columns, { animate = false } = {}) {
    this.columns = columns;
    if (!animate || this.reducedMotion || this.current.size === 0) {
      this.snap();
      this.draw();
      return;
    }
    this.startAnimation();
  }

  snap() {
    cancelAnimationFrame(this.frame);
    this.current.clear();
    if (!this.columns) return;
    for (const bead of beadTargets(this.columns, this.layout))
      this.current.set(keyOf(bead), bead.y);
  }

  startAnimation() {
    cancelAnimationFrame(this.frame);
    const step = () => {
      let moving = false;
      for (const bead of beadTargets(this.columns, this.layout)) {
        const key = keyOf(bead);
        const y = this.current.get(key) ?? bead.y;
        const distance = bead.y - y;
        if (Math.abs(distance) < SETTLE_DISTANCE) {
          this.current.set(key, bead.y);
        } else {
          this.current.set(key, y + distance * EASING);
          moving = true;
        }
      }
      this.draw();
      if (moving) this.frame = requestAnimationFrame(step);
    };
    step();
  }

  draw() {
    const { ctx, layout, theme, columns } = this;
    if (!ctx || !columns) return;
    const { width, height, padding, frameThickness, innerWidth, dividerY } = layout;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, width, height);
    // Soft light from above
    const light = ctx.createLinearGradient(0, 0, 0, height);
    light.addColorStop(0, 'rgba(255,255,255,0.18)');
    light.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = theme.frame;
    ctx.lineWidth = frameThickness;
    ctx.strokeRect(
      frameThickness / 2,
      frameThickness / 2,
      width - frameThickness,
      height - frameThickness,
    );

    // Rods
    ctx.strokeStyle = theme.rod;
    ctx.lineWidth = Math.max(2, width * 0.004);
    for (let col = 0; col < layout.columnCount; col++) {
      const x = rodX(layout, col);
      ctx.beginPath();
      ctx.moveTo(x, frameThickness);
      ctx.lineTo(x, height - frameThickness);
      ctx.stroke();
    }

    // Beam
    ctx.strokeStyle = theme.beam;
    ctx.lineWidth = Math.max(3, width * 0.008);
    ctx.beginPath();
    ctx.moveTo(padding, dividerY);
    ctx.lineTo(padding + innerWidth, dividerY);
    ctx.stroke();

    // Marks on the beam at the 3rd and 6th rods from the right (hundreds, hundred-thousands), as on
    // the physical soroban, to help read big numbers
    ctx.fillStyle = theme.beamDot;
    for (let fromRight = 2; fromRight < layout.columnCount; fromRight += 3) {
      const x = rodX(layout, layout.columnCount - 1 - fromRight);
      ctx.beginPath();
      ctx.arc(x, dividerY, Math.max(2, layout.beadRadius * 0.18), 0, Math.PI * 2);
      ctx.fill();
    }

    for (const bead of beadTargets(columns, layout)) {
      const y = this.current.get(keyOf(bead)) ?? bead.y;
      this.drawBead(bead.x, y, beadColors(theme, bead));
    }
  }

  drawBead(x, y, colors) {
    if (this.theme.beadShape === 'bicone') this.drawBicone(x, y, colors);
    else this.drawRound(x, y, colors);
  }

  /** Seen from the front, a double-cone bead is a hexagon with softened corners. */
  traceBicone(x, y, radius, vertical) {
    const { ctx } = this;
    const flat = radius * 0.34;
    const bend = radius * 0.72;
    ctx.beginPath();
    ctx.moveTo(x - radius, y);
    ctx.quadraticCurveTo(x - bend, y - vertical, x - flat, y - vertical);
    ctx.lineTo(x + flat, y - vertical);
    ctx.quadraticCurveTo(x + bend, y - vertical, x + radius, y);
    ctx.quadraticCurveTo(x + bend, y + vertical, x + flat, y + vertical);
    ctx.lineTo(x - flat, y + vertical);
    ctx.quadraticCurveTo(x - bend, y + vertical, x - radius, y);
    ctx.closePath();
  }

  drawBicone(x, y, { fill, stroke }) {
    const { ctx } = this;
    const radius = this.layout.beadRadius * this.theme.beadScale * 1.08;
    const vertical = this.layout.beadRadius * 0.78;

    // Shadow
    ctx.fillStyle = 'rgba(40,20,5,0.22)';
    this.traceBicone(x, y + vertical * 0.18, radius * 0.98, vertical);
    ctx.fill();

    // Body: lit from above, with a bright ridge where both cones meet
    const body = ctx.createLinearGradient(0, y - vertical, 0, y + vertical);
    body.addColorStop(0, shadeColor(fill, 0.35));
    body.addColorStop(0.44, fill);
    body.addColorStop(0.5, shadeColor(fill, 0.22));
    body.addColorStop(0.56, shadeColor(fill, -0.18));
    body.addColorStop(1, shadeColor(fill, -0.45));
    ctx.fillStyle = body;
    this.traceBicone(x, y, radius, vertical);
    ctx.fill();

    // Specular highlight on the upper cone
    const gloss = ctx.createRadialGradient(
      x - radius * 0.25,
      y - vertical * 0.5,
      0,
      x - radius * 0.25,
      y - vertical * 0.5,
      radius * 0.6,
    );
    gloss.addColorStop(0, 'rgba(255,255,255,0.45)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    this.traceBicone(x, y, radius, vertical);
    ctx.fill();

    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, radius * 0.05);
    this.traceBicone(x, y, radius, vertical);
    ctx.stroke();
  }

  drawRound(x, y, { fill, stroke }) {
    const { ctx, theme } = this;
    const radius = this.layout.beadRadius * theme.beadScale;
    const flat = theme.beadShape === 'flat';
    const vertical = radius * (flat ? 0.45 : 0.8);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(
      x + radius * 0.08,
      y + radius * 0.15,
      radius * 0.95,
      vertical * 0.8,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Body
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, vertical, 0, 0, Math.PI * 2);
    ctx.fill();

    if (flat) {
      this.shade(
        x,
        y,
        radius,
        vertical,
        [x - radius * 0.25, y - vertical * 0.4, 0, radius * 1.2],
        [
          [0, 'rgba(255,255,255,0.6)'],
          [0.4, 'rgba(255,255,255,0.2)'],
          [1, 'rgba(255,255,255,0)'],
        ],
      );
      this.shade(
        x,
        y,
        radius,
        vertical,
        [x, y + vertical * 0.3, 0, radius * 0.8],
        [
          [0, 'rgba(0,0,0,0)'],
          [0.7, 'rgba(0,0,0,0.15)'],
          [1, 'rgba(0,0,0,0.25)'],
        ],
      );
    } else {
      this.shade(
        x,
        y,
        radius,
        vertical,
        [x - radius * 0.3, y - radius * 0.3, 0, radius],
        [
          [0, 'rgba(255,255,255,0.4)'],
          [1, 'rgba(255,255,255,0)'],
        ],
      );
    }

    // Outline
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(flat ? 1.5 : 1, radius * (flat ? 0.08 : 0.1));
    ctx.beginPath();
    ctx.ellipse(x, y, radius, vertical, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  /** Paints a radial gradient clipped to the bead ellipse. [x0, y0, r0, r1] is centred on x/y. */
  shade(x, y, radius, vertical, [gx, gy, r0, r1], stops) {
    const { ctx } = this;
    const gradient = ctx.createRadialGradient(gx, gy, r0, x, y, r1);
    stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, vertical, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Lightens (amount > 0) or darkens (amount < 0) a #rrggbb color. */
function shadeColor(hex, amount) {
  const target = amount > 0 ? 255 : 0;
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const mixed = channels.map((c) => Math.round(c + (target - c) * Math.abs(amount)));
  return `rgb(${mixed.join(',')})`;
}
