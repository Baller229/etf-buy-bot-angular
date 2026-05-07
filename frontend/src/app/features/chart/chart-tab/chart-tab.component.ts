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
  TableActions,
  ChartActions,
  RangeActions,
  selectColumns,
  selectRows,
  selectSelectedRowIds,
  selectY1Key,
  selectY2Key,
  selectSnapshot,
  selectHiddenSeriesKeys,
  selectRangePreset,
  selectAnchorDateTimeLocal,
  selectLeftSteps,
  selectRightSteps,
} from '../../../store';
import type { TableColumn, TableRow, DataSnapshotPayload, RangePreset } from '../../../core/ws/ws.types';
import {
  buildColorMap,
  fmt,
  formatTickFromIso,
  isoToLocalInput,
  lastKnownValue,
  seriesKey,
} from '../../../core/utils/chart.utils';
import type { ChartData, ChartOptions } from 'chart.js';
import type { LegendItem } from '../axis-legend/axis-legend.component';
import { ChartPlotComponent } from '../chart-plot/chart-plot.component';
import { ChartHeaderBarComponent } from '../chart-header-bar/chart-header-bar.component';
import { ChartFooterComponent } from '../chart-footer/chart-footer.component';

function norm(s: string) { return s.trim().toLowerCase(); }

@Component({
  selector: 'app-chart-tab',
  imports: [ChartPlotComponent, ChartHeaderBarComponent, ChartFooterComponent],
  templateUrl: './chart-tab.component.html',
  styleUrl: './chart-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartTabComponent implements OnInit, OnDestroy {
  readonly fullscreen = input(false);

  private readonly store = inject(Store);
  private readonly bp = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  // Store selectors
  readonly columns = toSignal(this.store.select(selectColumns), { initialValue: [] as TableColumn[] });
  readonly rows = toSignal(this.store.select(selectRows), { initialValue: [] as TableRow[] });
  readonly selectedRowIds = toSignal(this.store.select(selectSelectedRowIds), { initialValue: [] as string[] });
  readonly y1Key = toSignal(this.store.select(selectY1Key), { initialValue: null as string | null });
  readonly y2Key = toSignal(this.store.select(selectY2Key), { initialValue: null as string | null });
  readonly snapshot = toSignal(this.store.select(selectSnapshot), { initialValue: null as DataSnapshotPayload | null });
  readonly hiddenSeriesKeys = toSignal(this.store.select(selectHiddenSeriesKeys), { initialValue: [] as string[] });
  readonly rangePreset = toSignal(this.store.select(selectRangePreset), { initialValue: 'MAX' as RangePreset });
  readonly anchorDateTimeLocal = toSignal(this.store.select(selectAnchorDateTimeLocal), { initialValue: '' });
  readonly leftSteps = toSignal(this.store.select(selectLeftSteps), { initialValue: 0 });
  readonly rightSteps = toSignal(this.store.select(selectRightSteps), { initialValue: 0 });

  // Responsive
  readonly isMobile = signal(false);
  readonly showAxes = computed(() => !this.isMobile() || this.fullscreen());

  // Dark mode — read from documentElement class (effects set it in AppComponent)
  readonly darkMode = signal(document.documentElement.classList.contains('dark'));

  // Derived
  readonly y1Label = computed(() => this.columns().find(c => c.key === this.y1Key())?.label ?? 'Y1');
  readonly y2Label = computed(() => this.columns().find(c => c.key === this.y2Key())?.label ?? 'Y2');
  readonly hasRows = computed(() => this.selectedRowIds().length > 0);
  readonly hasY1 = computed(() => !!this.y1Key());
  readonly hasSnapshot = computed(() => !!this.snapshot());

  readonly meta = computed(() => this.snapshot()?.rangeMeta ?? null);
  readonly minAnchorLocal = computed(() => {
    const m = this.meta()?.minIso;
    return m ? isoToLocalInput(m) : undefined;
  });
  readonly maxAnchorLocal = computed(() => {
    const m = this.meta()?.maxIso;
    return m ? isoToLocalInput(m) : undefined;
  });
  readonly leftPlusDisabled = computed(() => this.meta()?.leftCapped ?? false);
  readonly rightPlusDisabled = computed(() => this.meta()?.rightCapped ?? false);

  // Slide animation
  readonly slide = signal({ x: 0, opacity: 1 });
  private prevMetaRange = { startIso: '', endIso: '' };
  private slideRafId: number | null = null;

  // Symbol → display name map
  readonly nameBySymbol = computed(() => {
    const cols = this.columns();
    const rows = this.rows();
    const map = new Map<string, string>();
    if (!cols.length) return map;

    const symbolCol = cols.find(c => norm(c.label) === 'symbol')
      ?? cols.find(c => norm(c.key).includes('symbol'));
    const nameCol = cols.find(c => ['name', 'nazov', 'názov'].includes(norm(c.label)))
      ?? cols.find(c => norm(c.key).includes('name'));

    if (!symbolCol || !nameCol) return map;
    for (const r of rows) {
      const sym = String(r[symbolCol.key] ?? '').trim();
      if (!sym) continue;
      const nm = String(r[nameCol.key] ?? '').trim();
      map.set(sym, nm || sym);
    }
    return map;
  });

  // Unique sorted timestamps across all series
  readonly times = computed(() => {
    const snap = this.snapshot();
    if (!snap?.series?.length) return [] as string[];
    const set = new Set<string>();
    for (const s of snap.series) {
      if (snap.y1Key) for (const p of s.y1) set.add(p.x);
      if (snap.y2Key && s.y2) for (const p of s.y2) set.add(p.x);
    }
    return Array.from(set).sort();
  });

  // Chart.js data + legend items
  readonly chartBuild = computed(() => {
    const snap = this.snapshot();
    const hidden = new Set(this.hiddenSeriesKeys());
    const times = this.times();
    const y1Label = this.y1Label();
    const y2Label = this.y2Label();
    const nameMap = this.nameBySymbol();

    if (!snap?.series?.length) {
      return { datasets: [] as ChartDataset[], legendItems: [] as LegendItem[] };
    }

    const keys: string[] = [];
    for (const s of snap.series) {
      if (snap.y1Key) keys.push(seriesKey(s.symbol, 'y1'));
      if (snap.y2Key) keys.push(seriesKey(s.symbol, 'y2'));
    }
    const cmap = buildColorMap(keys);

    const datasets: ChartDataset[] = [];
    const legendItems: LegendItem[] = [];

    for (const s of snap.series) {
      const displayName = nameMap.get(s.symbol) ?? s.symbol;

      if (snap.y1Key) {
        const k = seriesKey(s.symbol, 'y1');
        const color = cmap.get(k)!;
        const ptMap = new Map(s.y1.map(p => [p.x, p.y] as const));
        const data = times.map((t, i) => ({ x: i, y: ptMap.get(t) ?? null, t }));
        datasets.push({
          label: `${displayName} • ${y1Label}`,
          yAxisID: 'y1', data, parsing: false,
          borderColor: color, backgroundColor: color,
          borderWidth: 2, pointRadius: 0, spanGaps: true,
          hidden: hidden.has(k),
          _symbol: s.symbol, _displayName: displayName, _axis: 'y1',
        } as ChartDataset);
        legendItems.push({ key: k, label: `(${displayName} y1)`, color, hidden: hidden.has(k) });
      }

      if (snap.y2Key && s.y2) {
        const k = seriesKey(s.symbol, 'y2');
        const color = cmap.get(k)!;
        const ptMap = new Map(s.y2.map(p => [p.x, p.y] as const));
        const data = times.map((t, i) => ({ x: i, y: ptMap.get(t) ?? null, t }));
        datasets.push({
          label: `${displayName} • ${y2Label}`,
          yAxisID: 'y2', data, parsing: false,
          borderColor: color, backgroundColor: color,
          borderWidth: 2, pointRadius: 0, spanGaps: true,
          hidden: hidden.has(k),
          _symbol: s.symbol, _displayName: displayName, _axis: 'y2',
        } as ChartDataset);
        legendItems.push({ key: k, label: `(${displayName} y2)`, color, hidden: hidden.has(k) });
      }
    }

    legendItems.sort((a, b) => a.label.localeCompare(b.label));
    return { datasets, legendItems };
  });

  readonly chartData = computed((): ChartData<'line'> => ({ datasets: this.chartBuild().datasets as never }));
  readonly legendItems = computed(() => this.chartBuild().legendItems);

  readonly allSeriesKeys = computed(() => this.legendItems().map(i => i.key));
  readonly y1SeriesKeys = computed(() => this.allSeriesKeys().filter(k => k.endsWith('::y1')));
  readonly y2SeriesKeys = computed(() => this.allSeriesKeys().filter(k => k.endsWith('::y2')));
  readonly hiddenSet = computed(() => new Set(this.hiddenSeriesKeys()));
  readonly allHidden = computed(() =>
    this.legendItems().length > 0 && this.hiddenSeriesKeys().length === this.legendItems().length
  );
  readonly actionLabel = computed((): 'Show all' | 'Clear all' => this.allHidden() ? 'Show all' : 'Clear all');
  readonly actionVisible = computed(() => this.legendItems().length > 0);

  readonly y1AllHidden = computed(() => {
    const keys = this.y1SeriesKeys();
    return keys.length > 0 && keys.every(k => this.hiddenSet().has(k));
  });
  readonly y2AllHidden = computed(() => {
    const keys = this.y2SeriesKeys();
    return keys.length > 0 && keys.every(k => this.hiddenSet().has(k));
  });
  readonly y1On = computed(() => !this.y1AllHidden());
  readonly y2On = computed(() => !!this.y2Key() && !this.y2AllHidden());

  // Chart.js options
  readonly chartOptions = computed((): ChartOptions<'line'> => {
    const dark = this.darkMode();
    const showAxes = this.showAxes();
    const times = this.times();
    const y1Label = this.y1Label();
    const y2Label = this.y2Label();
    const snap = this.snapshot();
    const isMobile = this.isMobile();
    const maxX = Math.max(0, times.length - 1);
    const gridColor = dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)';
    const tooltipBg = dark ? 'rgba(28,28,38,0.72)' : 'rgba(255,255,255,0.72)';
    const tooltipText = dark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)';
    const tooltipBorder = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';

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
                max-width:360px;
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
            for (const ds of chart.data.datasets as ChartDataset[]) {
              if (ds.hidden) continue;
              const color = String((ds as any).borderColor ?? '#999');
              const displayName = String((ds as any)._displayName ?? (ds as any)._symbol ?? '');
              const axis = (ds as any)._axis as string | undefined;
              const label = `(${displayName} ${axis ?? 'y1'})`;
              const points = ((ds as any).data ?? []) as Array<{ y: number | null }>;
              const v = lastKnownValue(points.map((p: { y: number | null }) => p.y), xIndex);
              rows.push({ label, color, value: v });
            }
            rows.sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));

            const lines = rows.map(r =>
              `<div style="display:flex;align-items:center;gap:8px;line-height:1.5">
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
        ...(snap?.y2Key ? {
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
    // Slide animation effect
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

    // Dark mode observer
    const observer = new MutationObserver(() => {
      this.darkMode.set(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    this._darkModeObserver = observer;
  }

  private _darkModeObserver!: MutationObserver;

  ngOnInit(): void {
    this.bp.observe([Breakpoints.XSmall])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(r => this.isMobile.set(r.matches));
  }

  ngOnDestroy(): void {
    if (this.slideRafId !== null) cancelAnimationFrame(this.slideRafId);
    this._darkModeObserver?.disconnect();
  }

  // --- Actions ---
  toggleAxisAll(axis: 'y1' | 'y2'): void {
    const axisKeys = axis === 'y1' ? this.y1SeriesKeys() : this.y2SeriesKeys();
    if (!axisKeys.length) return;
    const next = new Set(this.hiddenSeriesKeys());
    const allHiddenAxis = axisKeys.every(k => next.has(k));
    if (allHiddenAxis) axisKeys.forEach(k => next.delete(k));
    else axisKeys.forEach(k => next.add(k));
    this.store.dispatch(ChartActions.setHiddenSeriesKeys({ keys: Array.from(next) }));
  }

  onLegendAction(): void {
    if (this.allHidden()) {
      this.store.dispatch(ChartActions.showAllSeries());
    } else {
      this.store.dispatch(ChartActions.setHiddenSeriesKeys({ keys: this.allSeriesKeys() }));
    }
  }

  onToggleLegend(key: string): void {
    this.store.dispatch(ChartActions.toggleSeriesVisibility({ key }));
  }

  onPresetChange(preset: RangePreset): void {
    this.store.dispatch(RangeActions.setPreset({ preset }));
  }

  onAnchorChange(value: string): void {
    this.store.dispatch(RangeActions.setAnchor({ value }));
  }

  onIncLeft(): void { this.store.dispatch(RangeActions.incrementLeft()); }
  onDecLeft(): void { this.store.dispatch(RangeActions.decrementLeft()); }
  onSetLeft(steps: number): void { this.store.dispatch(RangeActions.setLeftSteps({ steps })); }
  onIncRight(): void { this.store.dispatch(RangeActions.incrementRight()); }
  onDecRight(): void { this.store.dispatch(RangeActions.decrementRight()); }
  onSetRight(steps: number): void { this.store.dispatch(RangeActions.setRightSteps({ steps })); }
}

// Internal type for Chart.js dataset with our custom fields
interface ChartDataset {
  label: string;
  yAxisID: string;
  data: Array<{ x: number; y: number | null; t: string }>;
  parsing: boolean;
  borderColor: string;
  backgroundColor: string;
  borderWidth: number;
  pointRadius: number;
  spanGaps: boolean;
  hidden: boolean;
  _symbol: string;
  _displayName: string;
  _axis: string;
}
