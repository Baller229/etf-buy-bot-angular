import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { ApplyFilterPayload, WsLogEntry, WsStatus } from '../../core/ws/ws.types';

export const WsActions = createActionGroup({
  source: 'WS',
  events: {
    'Status Changed': props<{ status: WsStatus }>(),
    'Log Added': props<{ entry: WsLogEntry }>(),
    'Send Apply Filter': props<{ payload: ApplyFilterPayload }>(),
    'Connect': emptyProps(),
    'Disconnect': emptyProps(),
  },
});
