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
    const ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.chart = new Chart<'line'>(ctx, {
      type: 'line',
      data: this.data,
      options: this.options,
    });
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
    this.chart?.destroy();
    this.chart = null;
  }
}
