import { createReducer, on } from '@ngrx/store';
import type { TableColumn, TableId, TableRow } from '../../core/ws/ws.types';
import { TableActions } from './table.actions';

export interface TableInstanceState {
  columns: TableColumn[];
  rows: TableRow[];
  selectedRowIds: string[];
  y1Key: string | null;
  y2Key: string | null;
  sortKey: string | null;
  sortDir: 'asc' | 'desc' | null;
}

export interface TableState {
  activeTableId: TableId;
  tables: Record<TableId, TableInstanceState>;
}

const emptyInstance: TableInstanceState = {
  columns: [],
  rows: [],
  selectedRowIds: [],
  y1Key: null,
  y2Key: null,
  sortKey: null,
  sortDir: null,
};

const initialState: TableState = {
  activeTableId: 'etf',
  tables: {
    etf: { ...emptyInstance },
    portfolioTickers: { ...emptyInstance },
  },
};

function updateActive(state: TableState, updates: Partial<TableInstanceState>): TableState {
  return {
    ...state,
    tables: {
      ...state.tables,
      [state.activeTableId]: { ...state.tables[state.activeTableId], ...updates },
    },
  };
}

export const tableReducer = createReducer(
  initialState,

  on(TableActions.setActiveTable, (state, { tableId }) => ({ ...state, activeTableId: tableId })),

  on(TableActions.initTable, (state, { tableId, columns, rows }) => {
    const inst = state.tables[tableId];
    const colKeys = new Set(columns.map(c => c.key));
    const rowIds = new Set(rows.map(r => r.id));
    const nextY1 = inst.y1Key && colKeys.has(inst.y1Key) ? inst.y1Key : null;
    const nextY2 = inst.y2Key && colKeys.has(inst.y2Key) && inst.y2Key !== nextY1 ? inst.y2Key : null;
    return {
      ...state,
      tables: {
        ...state.tables,
        [tableId]: {
          ...inst,
          columns,
          rows,
          y1Key: nextY1,
          y2Key: nextY2,
          selectedRowIds: inst.selectedRowIds.filter(id => rowIds.has(id)),
        },
      },
    };
  }),

  on(TableActions.toggleRowSelection, (state, { id }) => {
    const ids = state.tables[state.activeTableId].selectedRowIds;
    return updateActive(state, {
      selectedRowIds: ids.includes(id) ? ids.filter(r => r !== id) : [...ids, id],
    });
  }),

  on(TableActions.setAllSelected, (state, { ids }) => updateActive(state, { selectedRowIds: ids })),
  on(TableActions.clearSelection, state => updateActive(state, { selectedRowIds: [] })),
  on(TableActions.setY1Key, (state, { key }) => updateActive(state, { y1Key: key })),
  on(TableActions.setY2Key, (state, { key }) => updateActive(state, { y2Key: key })),
  on(TableActions.setSortKey, (state, { key }) => updateActive(state, { sortKey: key })),
  on(TableActions.setSortDir, (state, { dir }) => updateActive(state, { sortDir: dir })),
);
