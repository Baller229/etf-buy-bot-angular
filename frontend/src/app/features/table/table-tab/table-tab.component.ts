import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Store } from '@ngrx/store';
import { map } from 'rxjs/operators';
import {
  TableActions,
  selectColumns,
  selectRows,
  selectSelectedRowIds,
  selectY1Key,
  selectY2Key,
  selectSortKey,
  selectSortDir,
} from '../../../store';
import type { TableColumn, TableRow } from '../../../core/ws/ws.types';

type SortDir = 'asc' | 'desc';

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim().replace(',', '.');
  return s ? Number(s) : NaN;
}

function compareUnknown(a: unknown, b: unknown): number {
  const ax = a ?? '';
  const bx = b ?? '';
  const an = toNum(ax);
  const bn = toNum(bx);
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return String(ax).localeCompare(String(bx));
}

function sortRows(rows: TableRow[], key: string, dir: SortDir): TableRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * compareUnknown(a[key], b[key]));
}

function normalizeColumns(cols: TableColumn[]): TableColumn[] {
  const norm = (s: string) => s.trim().toLowerCase();
  const filtered = cols.filter(c => {
    const l = norm(c.label);
    return l !== 'idx' && l !== 'yymmdd';
  });
  const ts = filtered.find(c => c.label.trim() === 'yyyy.MM.dd_HH:mm:ss');
  const symbol = filtered.find(c => norm(c.label) === 'symbol');
  const rest = filtered.filter(c => c !== ts && c !== symbol);
  return [...rest, ...(ts ? [ts] : []), ...(symbol ? [symbol] : [])];
}

@Component({
  selector: 'app-table-tab',
  imports: [MatTableModule, MatCheckboxModule],
  templateUrl: './table-tab.component.html',
  styleUrl: './table-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableTabComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  readonly columns = toSignal(
    this.store.select(selectColumns).pipe(map(normalizeColumns)),
    { initialValue: [] as TableColumn[] },
  );
  readonly rows = toSignal(this.store.select(selectRows), { initialValue: [] as TableRow[] });
  readonly selectedRowIds = toSignal(this.store.select(selectSelectedRowIds), { initialValue: [] as string[] });
  readonly y1Key = toSignal(this.store.select(selectY1Key), { initialValue: null as string | null });
  readonly y2Key = toSignal(this.store.select(selectY2Key), { initialValue: null as string | null });
  readonly sortKey = toSignal(this.store.select(selectSortKey), { initialValue: null as string | null });
  readonly sortDir = toSignal(this.store.select(selectSortDir), { initialValue: null as 'asc' | 'desc' | null });

  readonly isMobile = signal(false);

  readonly hasData = computed(() => this.columns().length > 0);
  readonly firstColKey = computed(() => this.columns()[0]?.key ?? null);
  readonly selColW = computed(() => this.isMobile() ? 38 : 44);
  readonly firstColW = computed(() => this.isMobile() ? 140 : 180);
  readonly allRowIds = computed(() => this.rows().map(r => r.id));

  readonly allSelected = computed(() => {
    const ids = this.allRowIds();
    const sel = this.selectedRowIds();
    return ids.length > 0 && ids.every(id => sel.includes(id));
  });

  readonly someSelected = computed(() => !this.allSelected() && this.selectedRowIds().length > 0);

  readonly y1Label = computed(() => this.columns().find(c => c.key === this.y1Key())?.label ?? '-');
  readonly y2Label = computed(() => this.columns().find(c => c.key === this.y2Key())?.label ?? '-');

  readonly numericKeys = computed(() => {
    const keys = new Set<string>();
    for (const col of this.columns()) {
      if (col.type === 'number') { keys.add(col.key); continue; }
      for (const row of this.rows()) {
        const v = row[col.key];
        if (v === null || v === undefined || v === '') continue;
        if (Number.isFinite(toNum(v))) keys.add(col.key);
        break;
      }
    }
    return keys;
  });

  readonly sortedRows = computed(() => {
    const rows = this.rows();
    const key = this.sortKey();
    const dir = this.sortDir();
    if (!key || !dir) return rows;
    return sortRows(rows, key, dir);
  });

  readonly displayedColumns = computed(() => ['__select', ...this.columns().map(c => c.key)]);

  ngOnInit(): void {
    this.breakpointObserver
      .observe([Breakpoints.XSmall])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(r => this.isMobile.set(r.matches));
  }

  isSelected(id: string): boolean { return this.selectedRowIds().includes(id); }
  isNumeric(key: string): boolean { return this.numericKeys().has(key); }
  isFirstCol(key: string): boolean { return key === this.firstColKey(); }
  isAxisCol(key: string): boolean { return this.y1Key() === key || this.y2Key() === key; }

  handleSort(key: string): void {
    const curKey = this.sortKey();
    const curDir = this.sortDir();
    if (curKey !== key) {
      this.store.dispatch(TableActions.setSortKey({ key }));
      this.store.dispatch(TableActions.setSortDir({ dir: 'asc' }));
    } else if (curDir === 'asc') {
      this.store.dispatch(TableActions.setSortDir({ dir: 'desc' }));
    } else {
      this.store.dispatch(TableActions.setSortKey({ key: null }));
      this.store.dispatch(TableActions.setSortDir({ dir: null }));
    }
  }

  onToggleRow(id: string): void {
    this.store.dispatch(TableActions.toggleRowSelection({ id }));
  }

  onToggleAll(): void {
    if (this.allSelected()) {
      this.store.dispatch(TableActions.clearSelection());
    } else {
      this.store.dispatch(TableActions.setAllSelected({ ids: this.allRowIds() }));
    }
  }

  onToggleAxis(key: string): void {
    const y1 = this.y1Key();
    const y2 = this.y2Key();
    if (y1 === key) {
      this.store.dispatch(TableActions.setY1Key({ key: y2 }));
      this.store.dispatch(TableActions.setY2Key({ key: null }));
    } else if (y2 === key) {
      this.store.dispatch(TableActions.setY2Key({ key: null }));
    } else if (!y1) {
      this.store.dispatch(TableActions.setY1Key({ key }));
    } else {
      this.store.dispatch(TableActions.setY2Key({ key }));
    }
  }

  rowTrackBy(_: number, row: TableRow): string { return row.id; }
}
