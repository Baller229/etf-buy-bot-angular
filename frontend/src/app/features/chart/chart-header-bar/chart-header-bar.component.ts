import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-chart-header-bar',
  imports: [MatChipsModule],
  template: `
    <div class="header-bar">
      <div class="chips-row">
        <mat-chip-set>
          <mat-chip>{{ rowsCount }}</mat-chip>

          <mat-chip
            [class.chip-off]="!y1On"
            (click)="toggleY1.emit()">
            Y1: {{ y1Label }}
          </mat-chip>

          <mat-chip
            [class.chip-off]="hasY2 ? !y2On : true"
            [class.chip-disabled]="!hasY2"
            (click)="hasY2 && toggleY2.emit()">
            Y2: {{ hasY2 ? y2Label : '—' }}
          </mat-chip>

          @if (actionVisible) {
            <mat-chip (click)="action.emit()">{{ actionLabel }}</mat-chip>
          }
        </mat-chip-set>
      </div>
    </div>
  `,
  styles: [`
    .header-bar { overflow-x: auto; overflow-y: hidden; text-align: center; padding: 6px 0; }
    .header-bar::-webkit-scrollbar { height: 6px; }
    .chips-row { display: inline-flex; width: fit-content; }
    mat-chip-set { flex-wrap: nowrap; white-space: nowrap; }
    mat-chip { cursor: pointer; }
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

  @Output() toggleY1 = new EventEmitter<void>();
  @Output() toggleY2 = new EventEmitter<void>();
  @Output() action = new EventEmitter<void>();
}
