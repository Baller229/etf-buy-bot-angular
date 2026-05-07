import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import type { RangePreset } from '../../../core/ws/ws.types';

function clampNonNegInt(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function formatAnchorDisplay(anchorLocal: string): string {
  if (!anchorLocal) return '';
  const [date, time] = anchorLocal.split('T');
  if (!date || !time) return anchorLocal;
  const [y, m, d] = date.split('-');
  if (!y || !m || !d) return anchorLocal;
  return `${d}.${m}. ${y} at ${time}`;
}

@Component({
  selector: 'app-range-filter-bar',
  imports: [FormsModule, MatButtonModule, MatIconModule, MatInputModule],
  template: `
    <div class="bar-wrap">

      <!-- Row 1: presets -->
      <div class="preset-row">
        <div class="preset-group">
          @for (p of presets; track p) {
            <button class="preset-btn" [class.active]="preset === p"
                    (click)="presetChange.emit(p)">{{ p }}</button>
          }
        </div>
      </div>

      <!-- Row 2: left steps | anchor | right steps -->
      <div class="controls-row">

        <!-- Left -->
        <div class="step-group">
          <button mat-icon-button [disabled]="disableSides || leftSteps <= 0" (click)="decLeft.emit()">
            <mat-icon>remove</mat-icon>
          </button>
          <input class="step-input"
                 type="number" min="0"
                 [disabled]="disableSides"
                 [value]="leftSteps"
                 (change)="setLeft.emit(clamp($any($event.target).value))" />
          <button mat-icon-button [disabled]="disableSides || !!leftPlusDisabled" (click)="incLeft.emit()">
            <mat-icon>add</mat-icon>
          </button>
        </div>

        <!-- Anchor display -->
        <div class="anchor-wrap">
          <button class="anchor-btn" [disabled]="isMax" (click)="openPicker()">
            {{ displayValue || 'select date / time' }}
          </button>
          <input #nativePicker type="datetime-local"
                 class="native-picker"
                 [value]="anchorDateTimeLocal"
                 [min]="minAnchorLocal || ''"
                 [max]="maxAnchorLocal || ''"
                 step="60"
                 (change)="anchorChange.emit($any($event.target).value || '')" />
        </div>

        <!-- Right -->
        <div class="step-group">
          <button mat-icon-button [disabled]="disableSides || rightSteps <= 0" (click)="decRight.emit()">
            <mat-icon>remove</mat-icon>
          </button>
          <input class="step-input"
                 type="number" min="0"
                 [disabled]="disableSides"
                 [value]="rightSteps"
                 (change)="setRight.emit(clamp($any($event.target).value))" />
          <button mat-icon-button [disabled]="disableSides || !!rightPlusDisabled" (click)="incRight.emit()">
            <mat-icon>add</mat-icon>
          </button>
        </div>
      </div>

      @if (!anchorDateTimeLocal && !isMax) {
        <p class="hint">select exact date / time</p>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .bar-wrap {
      width: 100%;
      max-width: 560px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-sizing: border-box;
      padding: 0 16px;
    }
    .preset-row {
      width: 100%;
    }
    .preset-group {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 4px;
      width: 100%;
    }
    .preset-btn {
      all: unset;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 32px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      background: transparent;
      color: var(--mat-sys-on-surface);
      transition: background 120ms, border-color 120ms;
      box-sizing: border-box;
    }
    .preset-btn.active {
      background: color-mix(in srgb, var(--mat-sys-primary) 12%, var(--mat-sys-surface));
      border-color: color-mix(in srgb, var(--mat-sys-primary) 55%, transparent);
    }
    .preset-btn:hover:not(.active) {
      background: color-mix(in srgb, var(--mat-sys-on-surface) 8%, transparent);
    }
    .controls-row {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .step-group {
      display: flex;
      align-items: center;
      gap: 2px;
      flex: 0 0 auto;
    }
    .step-input {
      width: 52px;
      text-align: center;
      border: 1px solid var(--mat-divider-color, rgba(0,0,0,.12));
      border-radius: 4px;
      padding: 6px 4px;
      font-size: 13px;
      background: transparent;
      color: inherit;
      -moz-appearance: textfield;
    }
    .step-input::-webkit-inner-spin-button,
    .step-input::-webkit-outer-spin-button { -webkit-appearance: none; }
    .step-input:disabled { opacity: 0.38; }
    .anchor-wrap {
      flex: 1 1 auto;
      min-width: 0;
      position: relative;
    }
    .anchor-btn {
      width: 100%;
      padding: 7px 8px;
      border: 1px solid var(--mat-divider-color, rgba(0,0,0,.12));
      border-radius: 4px;
      font-size: 13px;
      text-align: center;
      cursor: pointer;
      background: transparent;
      color: inherit;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .anchor-btn:disabled { opacity: 0.38; cursor: default; }
    .native-picker {
      position: absolute;
      opacity: 0;
      pointer-events: none;
      width: 0;
      height: 0;
      top: 0;
      left: 0;
    }
    .hint {
      text-align: center;
      font-size: 11px;
      opacity: 0.7;
      margin: 0;
    }
    @media (max-width: 599px) {
      .anchor-btn { font-size: 11px; }
      .step-input { width: 36px; font-size: 11px; padding: 6px 2px; }
      :host ::ng-deep .mat-mdc-icon-button {
        --mdc-icon-button-state-layer-size: 28px;
        width: 28px !important;
        height: 28px !important;
        padding: 2px !important;
      }
      :host ::ng-deep .mat-mdc-icon-button .mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        line-height: 18px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RangeFilterBarComponent implements OnInit {
  @ViewChild('nativePicker') nativePickerRef!: ElementRef<HTMLInputElement>;

  @Input() preset: RangePreset = 'MAX';
  @Input() anchorDateTimeLocal = '';
  @Input() leftSteps = 0;
  @Input() rightSteps = 0;
  @Input() minAnchorLocal?: string;
  @Input() maxAnchorLocal?: string;
  @Input() leftPlusDisabled?: boolean;
  @Input() rightPlusDisabled?: boolean;

  @Output() presetChange = new EventEmitter<RangePreset>();
  @Output() anchorChange = new EventEmitter<string>();
  @Output() incLeft = new EventEmitter<void>();
  @Output() decLeft = new EventEmitter<void>();
  @Output() setLeft = new EventEmitter<number>();
  @Output() incRight = new EventEmitter<void>();
  @Output() decRight = new EventEmitter<void>();
  @Output() setRight = new EventEmitter<number>();

  private readonly bp = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  readonly isMobile = signal(false);

  readonly presets: RangePreset[] = ['1H', '1D', '1W', '1M', '1Y', 'MAX'];

  get isMax(): boolean { return this.preset === 'MAX'; }
  get disableSides(): boolean { return this.isMax || !this.anchorDateTimeLocal; }
  get displayValue(): string { return formatAnchorDisplay(this.anchorDateTimeLocal); }

  ngOnInit(): void {
    this.bp.observe([Breakpoints.XSmall])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(r => this.isMobile.set(r.matches));
  }

  openPicker(): void {
    if (this.isMax) return;
    const el = this.nativePickerRef?.nativeElement;
    if (!el) return;
    if ((el as any).showPicker) (el as any).showPicker();
    else el.click();
    el.focus();
  }

  clamp(v: string): number { return clampNonNegInt(v); }
}
