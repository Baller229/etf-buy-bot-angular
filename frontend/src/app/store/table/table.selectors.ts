import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { TableState } from './table.reducer';

const selectTableState = createFeatureSelector<TableState>('table');

export const selectActiveTableId = createSelector(selectTableState, s => s.activeTableId);

const selectActiveInstance = createSelector(selectTableState, s => s.tables[s.activeTableId]);

export const selectColumns = createSelector(selectActiveInstance, i => i.columns);
export const selectRows = createSelector(selectActiveInstance, i => i.rows);
export const selectSelectedRowIds = createSelector(selectActiveInstance, i => i.selectedRowIds);
export const selectY1Key = createSelector(selectActiveInstance, i => i.y1Key);
export const selectY2Key = createSelector(selectActiveInstance, i => i.y2Key);
export const selectSortKey = createSelector(selectActiveInstance, i => i.sortKey);
export const selectSortDir = createSelector(selectActiveInstance, i => i.sortDir);

export const selectSelectedRows = createSelector(
  selectRows,
  selectSelectedRowIds,
  (rows, ids) => rows.filter(r => ids.includes(r.id)),
);

export const selectSelectedSymbols = createSelector(
  selectSelectedRows,
  rows => rows.map(r => String(r['symbol'] ?? r['Symbol'] ?? '')).filter(Boolean),
);

/** "2026.05.15_17:35:57" (local wall clock) -> "2026-05-15T17:35" for a datetime-local input. */
function csvTimeToLocalInput(raw: unknown): string | null {
  const m = String(raw ?? '').trim().match(/^(\d{4})\.(\d{2})\.(\d{2})[_ ](\d{2}):(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}` : null;
}

export const selectLatestSelectedTimeLocal = createSelector(
  selectColumns,
  selectRows,
  selectSelectedRowIds,
  (columns, rows, selectedIds) => {
    const timeCol =
      columns.find(c => c.label.trim() === 'yyyy.MM.dd_HH:mm:ss') ??
      columns.find(c => c.key.toLowerCase().startsWith('yyyy'));
    if (!timeCol) return null;

    const ids = new Set(selectedIds);
    const pool = ids.size > 0 ? rows.filter(r => ids.has(r.id)) : rows;

    let max: string | null = null;
    for (const r of pool) {
      const v = csvTimeToLocalInput(r[timeCol.key]);
      // format sorts lexicographically the same way it sorts chronologically
      if (v && (max === null || v > max)) max = v;
    }
    return max;
  },
);
