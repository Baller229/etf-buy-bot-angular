import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export const PORTFOLIO_COLUMNS = [
  { key: 'value',    label: 'Value' },
  { key: 'profitP',  label: 'Profit %' },
  { key: 'profit',   label: 'Profit' },
  { key: 'purchase', label: 'Purchase' },
] as const;

export type PortfolioColumnKey = typeof PORTFOLIO_COLUMNS[number]['key'];

const LABEL_MAP: Record<string, string> = Object.fromEntries(PORTFOLIO_COLUMNS.map(c => [c.key, c.label]));

@Component({
  selector: 'app-portfolio-header-bar',
  imports: [MatMenuModule, MatButtonModule, MatIconModule],
  template: `
    <div class="header-bar">
      <div class="axis-chips">

        <span class="axis-label">Y1</span>
        <button class="chip axis-chip" [matMenuTriggerFor]="y1Menu">
          {{ label(y1Key) || '—' }}
          <mat-icon class="drop-icon">arrow_drop_down</mat-icon>
        </button>
        <mat-menu #y1Menu="matMenu">
          <button mat-menu-item (click)="setY1.emit(null)">
            <mat-icon>close</mat-icon>
            <span>None</span>
          </button>
          @for (col of columns; track col.key) {
            <button mat-menu-item [disabled]="col.key === y2Key" (click)="setY1.emit(col.key)">
              {{ col.label }}
            </button>
          }
        </mat-menu>

        <span class="axis-label">Y2</span>
        <button class="chip axis-chip" [matMenuTriggerFor]="y2Menu">
          {{ label(y2Key) || '—' }}
          <mat-icon class="drop-icon">arrow_drop_down</mat-icon>
        </button>
        <mat-menu #y2Menu="matMenu">
          <button mat-menu-item (click)="setY2.emit(null)">
            <mat-icon>close</mat-icon>
            <span>None</span>
          </button>
          @for (col of columns; track col.key) {
            <button mat-menu-item [disabled]="col.key === y1Key" (click)="setY2.emit(col.key)">
              {{ col.label }}
            </button>
          }
        </mat-menu>

      </div>

      <button class="split-btn"
              [class.active]="splitMode"
              [disabled]="!y2Key"
              (click)="setSplit.emit(!splitMode)">
        Split
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; flex: 0 0 auto; }
    .header-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 8px 16px;
      flex-wrap: wrap;
    }
    .axis-chips {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .axis-label {
      font-size: 11px;
      font-weight: 600;
      opacity: 0.6;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      user-select: none;
    }
    .axis-chip {
      all: unset;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      height: 28px;
      padding: 0 6px 0 10px;
      border-radius: 999px;
      font-size: 12px;
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface);
      border: 1px solid var(--mat-sys-outline-variant);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      box-sizing: border-box;
      transition: background 120ms;
    }
    .axis-chip:hover { background: var(--mat-sys-surface-container-highest); }
    .drop-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      line-height: 16px;
      opacity: 0.7;
    }
    .split-btn {
      all: unset;
      display: inline-flex;
      align-items: center;
      height: 28px;
      padding: 0 12px;
      border-radius: 999px;
      font-size: 12px;
      border: 1px solid var(--mat-sys-outline-variant);
      background: transparent;
      color: var(--mat-sys-on-surface);
      cursor: pointer;
      user-select: none;
      box-sizing: border-box;
      transition: background 120ms, border-color 120ms;
    }
    .split-btn.active {
      background: color-mix(in srgb, var(--mat-sys-primary) 12%, var(--mat-sys-surface));
      border-color: color-mix(in srgb, var(--mat-sys-primary) 55%, transparent);
      color: var(--mat-sys-primary);
    }
    .split-btn:hover:not(.active):not(:disabled) {
      background: color-mix(in srgb, var(--mat-sys-on-surface) 8%, transparent);
    }
    .split-btn:disabled { opacity: 0.38; cursor: default; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioHeaderBarComponent {
  @Input() y1Key: string | null = null;
  @Input() y2Key: string | null = null;
  @Input() splitMode = false;

  @Output() setY1 = new EventEmitter<string | null>();
  @Output() setY2 = new EventEmitter<string | null>();
  @Output() setSplit = new EventEmitter<boolean>();

  readonly columns = PORTFOLIO_COLUMNS;

  label(key: string | null): string {
    return key ? (LABEL_MAP[key] ?? key) : '';
  }
}
