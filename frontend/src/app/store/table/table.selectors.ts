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
