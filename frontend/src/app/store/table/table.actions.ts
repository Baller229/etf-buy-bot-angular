import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { TableColumn, TableId, TableRow } from '../../core/ws/ws.types';

export const TableActions = createActionGroup({
  source: 'Table',
  events: {
    'Set Active Table': props<{ tableId: TableId }>(),
    'Init Table': props<{ tableId: TableId; columns: TableColumn[]; rows: TableRow[] }>(),
    // The actions below operate on the currently active table:
    'Toggle Row Selection': props<{ id: string }>(),
    'Set All Selected': props<{ ids: string[] }>(),
    'Clear Selection': emptyProps(),
    'Set Y1 Key': props<{ key: string | null }>(),
    'Set Y2 Key': props<{ key: string | null }>(),
    'Set Sort Key': props<{ key: string | null }>(),
    'Set Sort Dir': props<{ dir: 'asc' | 'desc' | null }>(),
  },
});
