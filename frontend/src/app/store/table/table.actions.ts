import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { InitTablePayload } from '../../core/ws/ws.types';

export const TableActions = createActionGroup({
  source: 'Table',
  events: {
    'Init Table': props<{ payload: InitTablePayload }>(),
    'Toggle Row Selection': props<{ id: string }>(),
    'Set All Selected': props<{ ids: string[] }>(),
    'Clear Selection': emptyProps(),
    'Set Y1 Key': props<{ key: string | null }>(),
    'Set Y2 Key': props<{ key: string | null }>(),
    'Set Sort Key': props<{ key: string | null }>(),
    'Set Sort Dir': props<{ dir: 'asc' | 'desc' | null }>(),
  },
});
