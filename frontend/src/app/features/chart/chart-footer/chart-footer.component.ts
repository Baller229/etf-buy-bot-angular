import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { AxisLegendComponent, type LegendItem } from '../axis-legend/axis-legend.component';
import { RangeFilterBarComponent } from '../range-filter-bar/range-filter-bar.component';
import type { RangePreset } from '../../../core/ws/ws.types';

@Component({
  selector: 'app-chart-footer',
  imports: [AxisLegendComponent, RangeFilterBarComponent],
  template: `
    <div class="footer">
      <app-axis-legend [items]="legendItems" (toggle)="toggleLegend.emit($event)" />
      <div class="range-wrap">
        <app-range-filter-bar
          [preset]="preset"
          [anchorDateTimeLocal]="anchorDateTimeLocal"
          [leftSteps]="leftSteps"
          [rightSteps]="rightSteps"
          [minAnchorLocal]="minAnchorLocal"
          [maxAnchorLocal]="maxAnchorLocal"
          [leftPlusDisabled]="leftPlusDisabled"
          [rightPlusDisabled]="rightPlusDisabled"
          (presetChange)="presetChange.emit($event)"
          (anchorChange)="anchorChange.emit($event)"
          (incLeft)="incLeft.emit()"
          (decLeft)="decLeft.emit()"
          (setLeft)="setLeft.emit($event)"
          (incRight)="incRight.emit()"
          (decRight)="decRight.emit()"
          (setRight)="setRight.emit($event)" />
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; flex: 0 0 auto; }
    .footer { padding: 6px 0 10px; }
    .range-wrap { margin-top: 8px; display: flex; justify-content: center; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartFooterComponent {
  @Input() legendItems: LegendItem[] = [];
  @Input() preset: RangePreset = 'MAX';
  @Input() anchorDateTimeLocal = '';
  @Input() leftSteps = 0;
  @Input() rightSteps = 0;
  @Input() minAnchorLocal?: string;
  @Input() maxAnchorLocal?: string;
  @Input() leftPlusDisabled?: boolean;
  @Input() rightPlusDisabled?: boolean;

  @Output() toggleLegend = new EventEmitter<string>();
  @Output() presetChange = new EventEmitter<RangePreset>();
  @Output() anchorChange = new EventEmitter<string>();
  @Output() incLeft = new EventEmitter<void>();
  @Output() decLeft = new EventEmitter<void>();
  @Output() setLeft = new EventEmitter<number>();
  @Output() incRight = new EventEmitter<void>();
  @Output() decRight = new EventEmitter<void>();
  @Output() setRight = new EventEmitter<number>();
}
