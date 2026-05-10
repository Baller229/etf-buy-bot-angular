import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  PortfolioActions,
  selectPortfolioY1Key,
  selectPortfolioY2Key,
  selectPortfolioSplitMode,
  selectPortfolioRangePreset,
  selectPortfolioAnchorDateTimeLocal,
  selectPortfolioLeftSteps,
  selectPortfolioRightSteps,
  selectPortfolioSnapshot,
} from '../../../store';
import type { PortfolioSnapshotPayload, RangePreset } from '../../../core/ws/ws.types';
import {
  buildColorMap,
  fmt,
  formatTickFromIso,
  isoToLocalInput,
  lastKnownValue,
} from '../../../core/utils/chart.utils';
import type { ChartData, ChartOptions } from 'chart.js';
import { ChartPlotComponent } from '../../chart/chart-plot/chart-plot.component';
import { AxisLegendComponent, type LegendItem } from '../../chart/axis-legend/axis-legend.component';
import { PortfolioHeaderBarComponent } from '../portfolio-header-bar/portfolio-header-bar.component';
import { RangeFilterBarComponent } from '../../chart/range-filter-bar/range-filter-bar.component';

const COLUMN_LABELS: Record<string, string> = {
  value: 'Value',
  profitP: 'Profit %',
  profit: 'Profit',
  purchase: 'Purchase',
};

interface PortfolioDataset {
  label: string;
  yAxisID: string;
  data: Array<{ x: number; y: number | null; t: string }>;
  parsing: boolean;
  borderColor: string;
  backgroundColor: string;
  borderWidth: number;
  borderDash: number[];
  pointRadius: number;
  spanGaps: boolean;
  hidden: boolean;
  _key: string;
}

@Component({
  selector: 'app-portfolio-tab',
  imports: [ChartPlotComponent, AxisLegendComponent, PortfolioHeaderBarComponent, RangeFilterBarComponent],
  templateUrl: './portfolio-tab.component.html',
  styleUrl: './portfolio-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioTabComponent implements OnInit, OnDestroy {
  readonly fullscreen = input(false);

  private readonly store = inject(Store);
  private readonly bp = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  readonly y1Key = toSignal(this.store.select(selectPortfolioY1Key), { initialValue: 'value' as string | null });
  readonly y2Key = toSignal(this.store.select(selectPortfolioY2Key), { initialValue: 'purchase' as string | null });
  readonly splitMode = toSignal(this.store.select(selectPortfolioSplitMode), { initialValue: true });
  readonly rangePreset = toSignal(this.store.select(selectPortfolioRangePreset), { initialValue: 'MAX' as RangePreset });
  readonly anchorDateTimeLocal = toSignal(this.store.select(selectPortfolioAnchorDateTimeLocal), { initialValue: '' });
  readonly leftSteps = toSignal(this.store.select(selectPortfolioLeftSteps), { initialValue: 0 });
  readonly rightSteps = toSignal(this.store.select(selectPortfolioRightSteps), { initialValue: 0 });
  readonly snapshot = toSignal(this.store.select(selectPortfolioSnapshot), { initialValue: null as PortfolioSnapshotPayload | null });

  readonly isMobile = signal(false);
  readonly isLandscapeCompact = signal(false);
  readonly darkMode = signal(document.documentElement.classList.contains('dark'));

  readonly showAxes = computed(() => !this.isMobile() || this.fullscreen() || this.isLandscapeCompact());
  readonly chartOnly = computed(() => this.fullscreen() || this.isLandscapeCompact());

  readonly hiddenKeys = signal<string[]>([]);
  readonly hiddenSet = computed(() => new Set(this.hiddenKeys()));

  readonly meta = computed(() => this.snapshot()?.rangeMeta ?? null);
  readonly minAnchorLocal = computed(() => { const m = this.meta()?.minIso; return m ? isoToLocalInput(m) : undefined; });
  readonly maxAnchorLocal = computed(() => { const m = this.meta()?.maxIso; return m ? isoToLocalInput(m) : undefined; });
  readonly leftPlusDisabled = computed(() => this.meta()?.leftCapped ?? false);
  readonly rightPlusDisabled = computed(() => this.meta()?.rightCapped ?? false);

  readonly slide = signal({ x: 0, opacity: 1 });
  private prevMetaRange = { startIso: '', endIso: '' };
  private slideRafId: number | null = null;

  readonly times = computed(() => {
    const snap = this.snapshot();
    if (!snap?.series?.length) return [] as string[];
    const set = new Set<string>();
    for (const s of snap.series) for (const p of s.points) set.add(p.x);
    return Array.from(set).sort();
  });

  readonly chartBuild = computed(() => {
    const snap = this.snapshot();
    const splitMode = this.splitMode();
    const times = this.times();
    const hidden = this.hiddenSet();
    if (!snap?.series?.length) return { datasets: [] as PortfolioDataset[] };

    const cmap = buildColorMap(snap.series.map(s => s.key));
    const datasets: PortfolioDataset[] = [];

    for (const s of snap.series) {
      const legendKey = `${s.key}::${s.axis}`;
      const color = cmap.get(s.key) ?? '#888';
      const isY2InSplit = splitMode && s.axis === 'y2';
      const yAxisID = splitMode ? 'y1' : (s.axis === 'y1' ? 'y1' : 'y2');
      const ptMap = new Map(s.points.map(p => [p.x, p.y] as const));
      const data = times.map((t, i) => ({ x: i, y: ptMap.get(t) ?? null, t }));
      datasets.push({
        label: COLUMN_LABELS[s.key] ?? s.key,
        yAxisID,
        data, parsing: false,
        borderColor: color, backgroundColor: color,
        borderWidth: 2, borderDash: isY2InSplit ? [6, 4] : [],
        pointRadius: 0, spanGaps: true,
        hidden: hidden.has(legendKey),
        _key: legendKey,
      });
    }
    return { datasets };
  });

  readonly legendItems = computed((): LegendItem[] => {
    const snap = this.snapshot();
    if (!snap?.series?.length) return [];
    const cmap = buildColorMap(snap.series.map(s => s.key));
    const hidden = this.hiddenSet();
    return snap.series.map(s => ({
      key: `${s.key}::${s.axis}`,
      label: COLUMN_LABELS[s.key] ?? s.key,
      color: cmap.get(s.key) ?? '#888',
      hidden: hidden.has(`${s.key}::${s.axis}`),
    }));
  });

  readonly chartData = computed((): ChartData<'line'> => ({ datasets: this.chartBuild().datasets as never }));

  readonly chartOptions = computed((): ChartOptions<'line'> => {
    const dark = this.darkMode();
    const snap = this.snapshot();
    const splitMode = this.splitMode();
    const times = this.times();
    const isMobile = this.isMobile();
    const showAxes = this.showAxes();
    const maxX = Math.max(0, times.length - 1);
    const gridColor = dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)';
    const tooltipBg = dark ? 'rgba(28,28,38,0.72)' : 'rgba(255,255,255,0.72)';
    const tooltipText = dark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)';
    const tooltipBorder = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
    const y1Label = COLUMN_LABELS[this.y1Key() ?? ''] ?? 'Y1';
    const y2Label = COLUMN_LABELS[this.y2Key() ?? ''] ?? 'Y2';

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      transitions: {
        active: { animation: { duration: 0 } },
        resize: { animation: { duration: 0 } },
        show: { animation: { duration: 0 } },
        hide: { animation: { duration: 0 } },
      },
      normalized: true,
      interaction: { mode: 'index', intersect: false },
      layout: { padding: isMobile ? { left: 2, right: 2, top: 0, bottom: 0 } : 0 },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          mode: 'index',
          intersect: false,
          external: ({ chart, tooltip }) => {
            const parent = chart.canvas.parentElement;
            if (!parent) return;

            let el = parent.querySelector<HTMLDivElement>('.chartjs-ext-tooltip');
            if (!el) {
              el = document.createElement('div');
              el.className = 'chartjs-ext-tooltip';
              el.style.cssText = `
                position:absolute; pointer-events:none; z-index:50;
                border-radius:12px; padding:10px 12px;
                border:1px solid ${tooltipBorder};
                background:${tooltipBg};
                backdrop-filter:blur(2px);
                color:${tooltipText};
                box-shadow:0 10px 30px rgba(21,21,21,0.22);
                max-width:300px;
                font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;
                font-size:12px;
              `;
              parent.appendChild(el);
            }

            if (tooltip.opacity === 0) { el.style.opacity = '0'; return; }
            const dp = tooltip.dataPoints?.[0];
            if (!dp) { el.style.opacity = '0'; return; }

            const xIndex = dp.dataIndex;
            const tIso = times[xIndex];
            const title = tIso ? new Date(tIso).toLocaleString() : '';

            const rows: Array<{ label: string; color: string; value: number | null }> = [];
            for (const ds of chart.data.datasets as PortfolioDataset[]) {
              if (ds.hidden) continue;
              const color = String((ds as any).borderColor ?? '#999');
              const points = ((ds as any).data ?? []) as Array<{ y: number | null }>;
              const v = lastKnownValue(points.map(p => p.y), xIndex);
              rows.push({ label: ds.label, color, value: v });
            }

            const lines = rows.map(r =>
              `<div style="display:flex;align-items:center;gap:8px;line-height:1.6">
                <span style="width:10px;height:10px;border-radius:999px;background:${r.color};display:inline-block;flex:0 0 auto"></span>
                <span style="font-weight:600">${r.label}</span>
                <span style="margin-left:auto;opacity:0.9">${fmt(r.value ?? null)}</span>
              </div>`
            ).join('');

            el.innerHTML = `
              <div style="font-weight:400;margin-bottom:6px">${title}</div>
              <div style="display:flex;flex-direction:column;gap:2px">${lines}</div>
            `;

            const cursor = (chart as any)._cursor as { x: number; y: number } | undefined;
            let left = (cursor?.x ?? tooltip.caretX) + 12;
            let top = (cursor?.y ?? tooltip.caretY) + 12;
            const pw = parent.clientWidth;
            const ph = parent.clientHeight;
            if (left + el.offsetWidth > pw) left = Math.max(8, pw - el.offsetWidth - 8);
            if (top + el.offsetHeight > ph) top = Math.max(8, ph - el.offsetHeight - 8);
            el.style.left = `${left}px`;
            el.style.top = `${top}px`;
            el.style.opacity = '1';
          },
        },
      },
      scales: {
        x: {
          type: 'linear', min: 0, max: maxX,
          display: showAxes, bounds: 'data',
          ticks: {
            autoSkip: true,
            maxTicksLimit: isMobile ? 5 : 8,
            callback: (v) => { const t = times[Number(v)]; return t ? formatTickFromIso(t) : ''; },
          },
          grid: { drawTicks: true, color: gridColor },
          border: { color: gridColor },
        },
        y1: {
          type: 'linear', position: 'left', grace: '6%',
          display: showAxes,
          title: { display: showAxes && !!snap?.y1Key, text: y1Label },
          ticks: { display: showAxes },
          grid: { drawOnChartArea: true, color: gridColor },
        },
        ...(snap?.y2Key && !splitMode ? {
          y2: {
            type: 'linear' as const, position: 'right' as const, grace: '6%',
            display: showAxes,
            title: { display: showAxes, text: y2Label },
            ticks: { display: showAxes },
            grid: { drawOnChartArea: false, color: gridColor },
          },
        } : {}),
      },
    };
  });

  constructor() {
    effect(() => {
      const startIso = this.meta()?.startIso ?? '';
      const endIso = this.meta()?.endIso ?? '';
      if (!startIso || !endIso) return;
      const prev = this.prevMetaRange;
      let dir = 0;
      if (prev.startIso) {
        if (startIso < prev.startIso) dir = 1;
        else if (startIso > prev.startIso) dir = -1;
        if (dir === 0) {
          if (endIso > prev.endIso) dir = -1;
          else if (endIso < prev.endIso) dir = 1;
        }
      }
      this.prevMetaRange = { startIso, endIso };
      if (dir === 0) return;
      if (this.slideRafId !== null) cancelAnimationFrame(this.slideRafId);
      this.slide.set({ x: dir * 18, opacity: 0.65 });
      this.slideRafId = requestAnimationFrame(() => {
        this.slide.set({ x: 0, opacity: 1 });
        this.slideRafId = null;
      });
    });

    const observer = new MutationObserver(() => {
      this.darkMode.set(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    this._darkModeObserver = observer;
  }

  private _darkModeObserver!: MutationObserver;

  private static readonly LANDSCAPE_COMPACT = '(orientation: landscape) and (max-height: 520px)';

  ngOnInit(): void {
    this.bp.observe([Breakpoints.XSmall, PortfolioTabComponent.LANDSCAPE_COMPACT])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(r => {
        this.isMobile.set(r.breakpoints[Breakpoints.XSmall] ?? false);
        this.isLandscapeCompact.set(r.breakpoints[PortfolioTabComponent.LANDSCAPE_COMPACT] ?? false);
      });
  }

  ngOnDestroy(): void {
    if (this.slideRafId !== null) cancelAnimationFrame(this.slideRafId);
    this._darkModeObserver?.disconnect();
  }

  onToggleLegend(key: string): void {
    const curr = this.hiddenKeys();
    this.hiddenKeys.set(curr.includes(key) ? curr.filter(k => k !== key) : [...curr, key]);
  }

  onSetY1(key: string | null): void { this.store.dispatch(PortfolioActions.setY1Key({ key })); }
  onSetY2(key: string | null): void { this.store.dispatch(PortfolioActions.setY2Key({ key })); }
  onSetSplit(split: boolean): void { this.store.dispatch(PortfolioActions.setSplitMode({ split })); }

  onPresetChange(preset: RangePreset): void { this.store.dispatch(PortfolioActions.setRangePreset({ preset })); }
  onAnchorChange(value: string): void { this.store.dispatch(PortfolioActions.setAnchor({ value })); }
  onIncLeft(): void { this.store.dispatch(PortfolioActions.incrementLeft()); }
  onDecLeft(): void { this.store.dispatch(PortfolioActions.decrementLeft()); }
  onSetLeft(steps: number): void { this.store.dispatch(PortfolioActions.setLeftSteps({ steps })); }
  onIncRight(): void { this.store.dispatch(PortfolioActions.incrementRight()); }
  onDecRight(): void { this.store.dispatch(PortfolioActions.decrementRight()); }
  onSetRight(steps: number): void { this.store.dispatch(PortfolioActions.setRightSteps({ steps })); }
}
