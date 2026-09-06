import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import type { PortfolioLatest } from '../../../core/ws/ws.types';

const money = new Intl.NumberFormat('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtMoney(v: number | null | undefined): string {
  return v === null || v === undefined || !Number.isFinite(v) ? '—' : money.format(v);
}

function fmtSigned(v: number | null | undefined, suffix = ''): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${(suffix === ' %' ? percent : money).format(v)}${suffix}`;
}

/** Latest wallet values, so they are readable without hovering the chart. */
@Component({
  selector: 'app-portfolio-summary-bar',
  template: `
    <div class="summary">
      <div class="tile primary">
        <span class="label">Value</span>
        <span class="value">{{ valueText() }}</span>
      </div>

      <div class="tile">
        <span class="label">Purchase</span>
        <span class="value">{{ purchaseText() }}</span>
      </div>

      <div class="tile">
        <span class="label">Profit</span>
        <span class="value" [class.up]="isUp()" [class.down]="isDown()">{{ profitText() }}</span>
      </div>

      <div class="tile">
        <span class="label">Profit %</span>
        <span class="value" [class.up]="isUp()" [class.down]="isDown()">{{ profitPText() }}</span>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; flex: 0 0 auto; }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      padding: 8px 12px 10px;
    }
    .tile {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      padding: 8px 10px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 10px;
      background: color-mix(in srgb, var(--mat-sys-on-surface) 3%, transparent);
    }
    .label {
      font-size: 11px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      opacity: 0.65;
      white-space: nowrap;
    }
    .value {
      font-size: 17px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tile.primary .value { font-size: 19px; }
    .value.up { color: #22a06b; }
    .value.down { color: #d94f4f; }
    :host-context(.dark) .value.up { color: #4ecf95; }
    :host-context(.dark) .value.down { color: #ff7a7a; }
    @media (max-width: 599px) {
      .summary { grid-template-columns: repeat(2, 1fr); gap: 5px; padding: 5px 8px; }
      .tile { padding: 5px 8px; border-radius: 8px; }
      .label { font-size: 10px; }
      .value { font-size: 14px; }
      .tile.primary .value { font-size: 15px; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioSummaryBarComponent {
  private readonly latestSignal = signal<PortfolioLatest | null>(null);

  @Input() set latest(v: PortfolioLatest | null) { this.latestSignal.set(v); }

  readonly valueText = computed(() => fmtMoney(this.latestSignal()?.value));
  readonly purchaseText = computed(() => fmtMoney(this.latestSignal()?.purchase));
  readonly profitText = computed(() => fmtSigned(this.latestSignal()?.profit));
  readonly profitPText = computed(() => fmtSigned(this.latestSignal()?.profitP, ' %'));

  private readonly profit = computed(() => {
    const p = this.latestSignal()?.profit;
    return p !== null && p !== undefined && Number.isFinite(p) ? p : null;
  });

  readonly isUp = computed(() => (this.profit() ?? 0) > 0);
  readonly isDown = computed(() => (this.profit() ?? 0) < 0);
}
