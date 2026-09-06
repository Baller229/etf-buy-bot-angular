import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { verticalLinePlugin, cursorTrackerPlugin } from '../../../core/utils/chart-plugins';

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Legend, verticalLinePlugin, cursorTrackerPlugin);

const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP_PX = 30;

@Component({
  selector: 'app-chart-plot',
  template: `
    <div class="plot-outer">
      <div class="plot-inner"
           [style.transform]="'translateX(' + slide.x + 'px)'"
           [style.opacity]="slide.opacity">
        <canvas #chartCanvas></canvas>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .plot-outer { position: relative; height: 100%; overflow: hidden; }
    .plot-inner {
      position: relative;
      width: 100%; height: 100%;
      transition: transform 160ms ease-out, opacity 160ms ease-out;
      will-change: transform, opacity;
    }
    canvas { display: block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartPlotComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() data: ChartData<'line'> = { datasets: [] };
  @Input() options: ChartOptions<'line'> = {};
  @Input() slide: { x: number; opacity: number } = { x: 0, opacity: 1 };

  private chart: Chart<'line'> | null = null;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    this.chart = new Chart<'line'>(ctx, {
      type: 'line',
      data: this.data,
      options: this.options,
    });

    // Touch devices have no mouseleave, so the tooltip would stay on screen
    // forever — a double tap dismisses it.
    canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.chart) return;
    if (changes['data']) {
      this.chart.data = this.data;
    }
    if (changes['options']) {
      this.chart.options = this.options as never;
    }
    if (changes['data'] || changes['options']) {
      this.chart.update('none');
    }
  }

  ngOnDestroy(): void {
    this.canvasRef?.nativeElement.removeEventListener('touchend', this.onTouchEnd);
    this.chart?.destroy();
    this.chart = null;
  }

  private lastTap = { time: 0, x: 0, y: 0 };

  private readonly onTouchEnd = (e: TouchEvent): void => {
    const touch = e.changedTouches[0];
    if (!touch) return;

    const now = Date.now();
    const isDoubleTap =
      now - this.lastTap.time < DOUBLE_TAP_MS &&
      Math.hypot(touch.clientX - this.lastTap.x, touch.clientY - this.lastTap.y) < DOUBLE_TAP_SLOP_PX;

    if (isDoubleTap) {
      e.preventDefault(); // also suppresses the browser's double-tap zoom
      this.dismissTooltip();
      this.lastTap = { time: 0, x: 0, y: 0 };
      return;
    }

    this.lastTap = { time: now, x: touch.clientX, y: touch.clientY };
  };

  private dismissTooltip(): void {
    const chart = this.chart;
    if (!chart) return;

    chart.setActiveElements([]);
    chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
    chart.update('none');

    // The external tooltip lives outside the canvas — hide it directly too, so it
    // goes away even if no redraw reaches the tooltip callback.
    chart.canvas.parentElement
      ?.querySelector<HTMLDivElement>('.chartjs-ext-tooltip')
      ?.style.setProperty('opacity', '0');
  }
}
