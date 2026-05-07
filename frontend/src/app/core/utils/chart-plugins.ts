import type { Plugin } from 'chart.js';

declare module 'chart.js' {
  interface Chart {
    _cursor?: { x: number; y: number };
  }
}

export const verticalLinePlugin: Plugin = {
  id: 'verticalLine',
  afterDraw(chart) {
    const active = chart.tooltip?.getActiveElements();
    if (!active?.length) return;
    const { x } = active[0].element;
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(128,128,128,0.5)';
    ctx.stroke();
    ctx.restore();
  },
};

export const cursorTrackerPlugin: Plugin = {
  id: 'cursorTracker',
  afterEvent(chart, args) {
    const e = args.event;
    if (e.type === 'mousemove' && e.x !== null && e.y !== null) {
      chart._cursor = { x: e.x, y: e.y };
    }
  },
};
