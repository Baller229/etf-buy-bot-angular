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
  on(TableActions.initTable, (state, { payload }) => ({
    ...state,
    columns: payload.columns,
    rows: payload.rows,
  })),
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
