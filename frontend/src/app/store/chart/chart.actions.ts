import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { DataSnapshotPayload } from '../../core/ws/ws.types';

export const ChartActions = createActionGroup({
  source: 'Chart',
  events: {
    'Snapshot Received': props<{ payload: DataSnapshotPayload }>(),
    'Toggle Series Visibility': props<{ key: string }>(),
    'Show All Series': emptyProps(),
  },
});
