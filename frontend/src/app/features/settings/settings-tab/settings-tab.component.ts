import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { Store } from '@ngrx/store';
import { UiActions, selectDarkMode, selectShowWsInspector } from '../../../store';

@Component({
  selector: 'app-settings-tab',
  imports: [MatSlideToggleModule, MatDividerModule],
  template: `
    <div class="settings">
      <h2 class="title">Settings</h2>

      <mat-slide-toggle
        [checked]="darkMode()"
        (change)="onDarkMode($event.checked)">
        Dark mode
      </mat-slide-toggle>

      <mat-divider />

      <mat-slide-toggle
        [checked]="showWsInspector()"
        (change)="onWsInspector($event.checked)">
        Show WS Inspector
      </mat-slide-toggle>
    </div>
  `,
  styles: [`
    .settings { display: flex; flex-direction: column; gap: 16px; }
    .title { font-size: 1.125rem; font-weight: 800; margin: 0 0 4px; }
    mat-divider { margin: 0; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsTabComponent {
  private readonly store = inject(Store);

  readonly darkMode = toSignal(this.store.select(selectDarkMode), { initialValue: false });
  readonly showWsInspector = toSignal(this.store.select(selectShowWsInspector), { initialValue: false });

  onDarkMode(enabled: boolean): void {
    this.store.dispatch(UiActions.setDarkMode({ enabled }));
  }

  onWsInspector(enabled: boolean): void {
    if (enabled !== this.showWsInspector()) {
      this.store.dispatch(UiActions.toggleWsInspector());
    }
  }
}
