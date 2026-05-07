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
      <div class="legend-wrap">
        <div class="legend-inner">
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
      padding: 5px 10px;
      border-radius: 999px;
      border: 1px solid var(--mat-divider-color, rgba(0,0,0,.12));
      background: var(--mat-app-surface, transparent);
      cursor: pointer;
      user-select: none;
      transition: opacity 120ms;
      font-size: 12px;
      color: inherit;
    }
    .legend-item.hidden { opacity: 0.35; }
    .dot { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AxisLegendComponent {
  @Input() items: LegendItem[] = [];
  @Output() toggle = new EventEmitter<string>();

  get y1Items(): LegendItem[] { return this.items.filter(i => i.key.endsWith('::y1')); }
  get y2Items(): LegendItem[] { return this.items.filter(i => i.key.endsWith('::y2')); }

  displayLabel(label: string): string { return stripAxisSuffix(label); }
}
