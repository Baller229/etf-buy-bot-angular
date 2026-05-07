import { createReducer, on } from '@ngrx/store';
import type { TableColumn, TableRow } from '../../core/ws/ws.types';
import { TableActions } from './table.actions';

export interface TableState {
  columns: TableColumn[];
  rows: TableRow[];
  selectedRowIds: string[];
  y1Key: string | null;
  y2Key: string | null;
  sortKey: string | null;
  sortDir: 'asc' | 'desc' | null;
}

const initialState: TableState = {
  columns: [],
  rows: [],
  selectedRowIds: [],
  y1Key: null,
  y2Key: null,
  sortKey: null,
  sortDir: null,
};

export const tableReducer = createReducer(
  initialState,
  on(TableActions.initTable, (state, { payload }) => {
    const colKeys = new Set(payload.columns.map(c => c.key));
    const rowIds = new Set(payload.rows.map(r => r.id));
    const nextY1 = state.y1Key && colKeys.has(state.y1Key) ? state.y1Key : null;
    const nextY2 = state.y2Key && colKeys.has(state.y2Key) && state.y2Key !== nextY1 ? state.y2Key : null;
    return {
      ...state,
      columns: payload.columns,
      rows: payload.rows,
      y1Key: nextY1,
      y2Key: nextY2,
      selectedRowIds: state.selectedRowIds.filter(id => rowIds.has(id)),
    };
  }),
  on(TableActions.toggleRowSelection, (state, { id }) => {
    const exists = state.selectedRowIds.includes(id);
    return {
      ...state,
      selectedRowIds: exists
        ? state.selectedRowIds.filter(r => r !== id)
        : [...state.selectedRowIds, id],
    };
  }),
  on(TableActions.setAllSelected, (state, { ids }) => ({ ...state, selectedRowIds: ids })),
  on(TableActions.clearSelection, state => ({ ...state, selectedRowIds: [] })),
  on(TableActions.setY1Key, (state, { key }) => ({ ...state, y1Key: key })),
  on(TableActions.setY2Key, (state, { key }) => ({ ...state, y2Key: key })),
  on(TableActions.setSortKey, (state, { key }) => ({ ...state, sortKey: key })),
  on(TableActions.setSortDir, (state, { dir }) => ({ ...state, sortDir: dir })),
);
