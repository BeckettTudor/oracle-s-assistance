// Animated signed-amplitude bar chart (64 bars around a horizontal axis).
// `order` maps display slot -> state index, so bars can be shown in a hidden,
// shuffled order that does not reveal which pot each bar belongs to.

const BAR_COLOR = 0xe6dcc4; // marble
const HIGHLIGHT = 0xe8b923;
const MEAN_COLOR = 0xff8a65;

export class BarChart {
  constructor(scene, { centerX, axisY, barWidth = 11, gap = 2, scale = 92, count = 64 }) {
    this.scene = scene;
    this.count = count;
    this.barWidth = barWidth;
    this.gap = gap;
    this.scale = scale;
    this.axisY = axisY;
    this.left = centerX - (count * (barWidth + gap)) / 2;
    this.gfx = scene.add.graphics();
    this.order = [...Array(count).keys()];
    this.highlight = null;   // state index drawn in gold, or null
    this.showMean = false;
    this.display = new Array(count).fill(0);
    this.tween = null;
  }

  setOrder(order) {
    this.order = order;
    this.draw();
  }

  // Animate (or jump) to new amplitudes. Resolves when the animation ends or
  // is interrupted by another call.
  setAmps(amps, animate = true, duration = 420) {
    const from = this.display.slice();
    const to = Array.from(amps);
    if (this.tween) this.tween.stop();
    if (!animate) {
      this.display = to;
      this.draw();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const counter = { t: 0 };
      this.tween = this.scene.tweens.add({
        targets: counter,
        t: 1,
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          this.display = from.map((a, i) => a + (to[i] - a) * counter.t);
          this.draw();
        },
        onComplete: () => {
          this.display = to;
          this.draw();
          resolve();
        },
        onStop: () => resolve(),
      });
    });
  }

  stop() {
    if (this.tween) this.tween.stop();
  }

  mean() {
    return this.display.reduce((s, a) => s + a, 0) / this.count;
  }

  draw() {
    const g = this.gfx;
    const right = this.left + this.count * (this.barWidth + this.gap);
    g.clear();
    g.lineStyle(1, 0xa89878, 1);
    g.lineBetween(this.left - 6, this.axisY, right + 4, this.axisY);
    for (let slot = 0; slot < this.count; slot++) {
      const state = this.order[slot];
      const h = this.display[state] * this.scale;
      const x = this.left + slot * (this.barWidth + this.gap);
      g.fillStyle(state === this.highlight ? HIGHLIGHT : BAR_COLOR, 1);
      if (h >= 0) g.fillRect(x, this.axisY - h, this.barWidth, Math.max(1, h));
      else g.fillRect(x, this.axisY, this.barWidth, -h);
    }
    if (this.showMean) {
      const y = this.axisY - this.mean() * this.scale;
      g.lineStyle(1, MEAN_COLOR, 1);
      for (let x = this.left; x < right; x += 10) g.lineBetween(x, y, Math.min(x + 5, right), y);
    }
  }
}
