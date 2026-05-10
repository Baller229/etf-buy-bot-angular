import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';

@Component({
  selector: 'app-chart-header-bar',
  imports: [],
  template: `
    <div class="header-bar">
      <div class="chips-row">
        <span class="chip">{{ rowsCount }}</span>

        <span class="chip chip-btn" [class.chip-off]="!y1On"
              (click)="toggleY1.emit()">
          Y1: {{ y1Label }}
        </span>

        <span class="chip chip-btn"
              [class.chip-off]="hasY2 ? !y2On : true"
              [class.chip-disabled]="!hasY2"
              (click)="hasY2 && toggleY2.emit()">
          Y2: {{ hasY2 ? y2Label : '—' }}
        </span>

        <span class="chip chip-btn" [class.chip-off]="!splitMode"
              (click)="toggleSplit.emit()">Split</span>

        @if (actionVisible) {
          <span class="chip chip-btn" (click)="action.emit()">{{ actionLabel }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; flex: 0 0 auto; }
    .header-bar { overflow-x: auto; overflow-y: hidden; padding: 6px 8px; }
    .header-bar::-webkit-scrollbar { height: 6px; }
    .chips-row { display: flex; justify-content: center; gap: 6px; flex-wrap: nowrap; white-space: nowrap; }
    .chip-btn { cursor: pointer; user-select: none; }
    .chip-off { opacity: 0.55; }
    .chip-disabled { opacity: 0.35; cursor: default; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartHeaderBarComponent {
  @Input() rowsCount = 0;
  @Input() y1Label = 'Y1';
  @Input() y2Label = 'Y2';
  @Input() hasY2 = false;
  @Input() y1On = true;
  @Input() y2On = false;
  @Input() actionLabel: 'Show all' | 'Clear all' = 'Clear all';
  @Input() actionVisible = false;
  @Input() splitMode = false;

  @Output() toggleY1 = new EventEmitter<void>();
  @Output() toggleY2 = new EventEmitter<void>();
  @Output() toggleSplit = new EventEmitter<void>();
  @Output() action = new EventEmitter<void>();
}
