import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { TableState } from './table.reducer';

const selectTableState = createFeatureSelector<TableState>('table');

export const selectColumns = createSelector(selectTableState, s => s.columns);
export const selectRows = createSelector(selectTableState, s => s.rows);
export const selectSelectedRowIds = createSelector(selectTableState, s => s.selectedRowIds);
export const selectY1Key = createSelector(selectTableState, s => s.y1Key);
export const selectY2Key = createSelector(selectTableState, s => s.y2Key);
export const selectSortKey = createSelector(selectTableState, s => s.sortKey);
export const selectSortDir = createSelector(selectTableState, s => s.sortDir);

export const selectSelectedRows = createSelector(
  selectRows,
  selectSelectedRowIds,
  (rows, ids) => rows.filter(r => ids.includes(r.id)),
);

export const selectSelectedSymbols = createSelector(
  selectSelectedRows,
  rows => rows.map(r => String(r['symbol'] ?? r['Symbol'] ?? '')).filter(Boolean),
);
