import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DOCUMENT } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Store } from '@ngrx/store';
import {
  WsActions,
  TableActions,
  ChartActions,
  PortfolioActions,
  UiActions,
  selectActiveTab,
  selectDarkMode,
  selectShowWsInspector,
  selectWsLogs,
} from './store';
import type { ActiveTab } from './store';
import { WsService } from './core/ws/ws.service';
import { TableTabComponent } from './features/table';
import { ChartTabComponent } from './features/chart';
import { SettingsTabComponent } from './features/settings';
import { PortfolioTabComponent } from './features/portfolio';
import type { WsLogEntry } from './core/ws/ws.types';

const LANDSCAPE_LOW_H = '(orientation: landscape) and (max-height: 520px)';
const COARSE = '(pointer: coarse)';

@Component({
  selector: 'app-root',
  imports: [MatTabsModule, MatDividerModule, MatIconModule, PortfolioTabComponent, TableTabComponent, ChartTabComponent, SettingsTabComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly wsService = inject(WsService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly doc = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeTab = toSignal(this.store.select(selectActiveTab), { initialValue: 'wallet' as ActiveTab });
  readonly darkMode = toSignal(this.store.select(selectDarkMode), { initialValue: false });
  readonly showWsInspector = toSignal(this.store.select(selectShowWsInspector), { initialValue: false });
  readonly wsLogs = toSignal(this.store.select(selectWsLogs), { initialValue: [] as WsLogEntry[] });

  readonly isPhoneLike = signal(false);
  readonly isSmall = signal(false);

  readonly chartFullscreen = computed(() => this.isPhoneLike() && this.activeTab() === 'chart');
  readonly portfolioFullscreen = computed(() => this.isPhoneLike() && this.activeTab() === 'wallet');
  readonly tabFullscreen = computed(() => this.chartFullscreen() || this.portfolioFullscreen());
  readonly showInspector = computed(() => this.showWsInspector() && !this.isPhoneLike());

  private readonly darkModeEffect = effect(() => {
    if (this.darkMode()) {
      this.doc.documentElement.classList.add('dark');
    } else {
      this.doc.documentElement.classList.remove('dark');
    }
  });

  ngOnInit(): void {
    this.updateAppVh();
    this.setupBreakpoints();
    this.connectWsToStore();
    this.wsService.connect();
  }

  ngOnDestroy(): void {
    this.wsService.disconnect();
  }

  setTab(tab: ActiveTab): void {
    this.store.dispatch(UiActions.setActiveTab({ tab }));
  }

  formatLogTime(ts: number): string {
    return new Date(ts).toLocaleTimeString();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  onResize(): void {
    this.updateAppVh();
  }

  private updateAppVh(): void {
    const vh = window.innerHeight * 0.01;
    this.doc.documentElement.style.setProperty('--app-vh', `${vh}px`);
  }

  private setupBreakpoints(): void {
    this.breakpointObserver
      .observe([LANDSCAPE_LOW_H, COARSE, Breakpoints.XSmall])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        this.isPhoneLike.set(
          result.breakpoints[LANDSCAPE_LOW_H] && result.breakpoints[COARSE],
        );
        this.isSmall.set(result.breakpoints[Breakpoints.XSmall]);
      });
  }

  private connectWsToStore(): void {
    this.wsService.status$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(status => this.store.dispatch(WsActions.statusChanged({ status })));

    this.wsService.logs$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(entry => this.store.dispatch(WsActions.logAdded({ entry })));

    this.wsService.messages$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(msg => {
        if (msg.wsMsgType === 'INIT_TABLE' && msg.table) {
          this.store.dispatch(TableActions.initTable({
            tableId: msg.table.tableId,
            columns: msg.table.columns,
            rows: msg.table.rows,
          }));
        } else if (msg.wsMsgType === 'DATA_SNAPSHOT' && msg.snapshot) {
          this.store.dispatch(ChartActions.snapshotReceived({ payload: msg.snapshot }));
        } else if (msg.wsMsgType === 'PORTFOLIO_SNAPSHOT' && msg.portfolioSnapshot) {
          this.store.dispatch(PortfolioActions.snapshotReceived({ payload: msg.portfolioSnapshot }));
        }
      });
  }
}
