import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';

export type LegendItem = {
  key: string;
  label: string;
  color: string;
  hidden: boolean;
};

function stripAxisSuffix(label: string): string {
  const s = label.trim();
  const core = s.startsWith('(') && s.endsWith(')') ? s.slice(1, -1).trim() : s;
  if (core.toLowerCase().endsWith(' y1')) return core.slice(0, -3).trim();
  if (core.toLowerCase().endsWith(' y2')) return core.slice(0, -3).trim();
  return core;
}

@Component({
  selector: 'app-axis-legend',
  template: `
    @if (items.length > 0) {
      <div class="legend-wrap" [class.single]="singleRow">
        <div class="legend-inner" [class.single]="singleRow">
          @if (singleRow) {
            <div class="legend-row single">
              @for (it of items; track it.key) {
                <button class="legend-item" [class.hidden]="it.hidden"
                        (click)="toggle.emit(it.key)">
                  <span class="dot" [style.background]="it.color"></span>
                  <span class="label">{{ displayLabel(it.label) }}</span>
                </button>
              }
            </div>
          } @else {
            @if (y1Items.length > 0) {
              <div class="legend-row">
                @for (it of y1Items; track it.key) {
                  <button class="legend-item" [class.hidden]="it.hidden"
                          (click)="toggle.emit(it.key)">
                    <span class="dot" [style.background]="it.color"></span>
                    <span class="label">{{ displayLabel(it.label) }}</span>
                  </button>
                }
              </div>
            }
            @if (y2Items.length > 0) {
              <div class="legend-row">
                @for (it of y2Items; track it.key) {
                  <button class="legend-item" [class.hidden]="it.hidden"
                          (click)="toggle.emit(it.key)">
                    <span class="dot" [style.background]="it.color"></span>
                    <span class="label">{{ displayLabel(it.label) }}</span>
                  </button>
                }
              </div>
            }
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .legend-wrap {
      overflow-x: auto;
      overflow-y: hidden;
      padding-bottom: 4px;
      text-align: center;
    }
    .legend-wrap::-webkit-scrollbar { height: 6px; }
    .legend-inner {
      display: inline-flex;
      flex-direction: column;
      gap: 6px;
      width: fit-content;
      max-width: 100%;
    }
    .legend-row {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px 4px 8px;
      border-radius: 6px;
      border: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container);
      cursor: pointer;
      user-select: none;
      transition: background 120ms, opacity 120ms;
      font-size: 12px;
      color: var(--mat-sys-on-surface);
    }
    .legend-item:hover { background: var(--mat-sys-surface-container-high); }
    .legend-item.hidden { opacity: 0.35; }
    .dot { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }

    /* Single-row variant: equal-width toggles, centred, not stretched across the screen. */
    .legend-wrap.single { overflow-x: hidden; padding: 0 12px 4px; }
    .legend-inner.single { display: block; width: 100%; }
    .legend-row.single {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 1fr;
      gap: 8px;
      width: 100%;
      max-width: 300px;
      margin: 0 auto;
    }
    .legend-row.single .legend-item {
      min-width: 0;
      justify-content: center;
    }
    .legend-row.single .label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AxisLegendComponent {
  @Input() items: LegendItem[] = [];
  /** Wallet: lay every toggle out in one row, all the same width. */
  @Input() singleRow = false;
  @Output() toggle = new EventEmitter<string>();

  get y1Items(): LegendItem[] { return this.items.filter(i => i.key.endsWith('::y1')); }
  get y2Items(): LegendItem[] { return this.items.filter(i => i.key.endsWith('::y2')); }

  displayLabel(label: string): string { return stripAxisSuffix(label); }
}
