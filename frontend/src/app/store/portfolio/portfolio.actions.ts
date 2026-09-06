import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { RangePreset, PortfolioSnapshotPayload } from '../../core/ws/ws.types';

export const PortfolioActions = createActionGroup({
  source: 'Portfolio',
  events: {
    'Set Y1 Key': props<{ key: string | null }>(),
    'Set Y2 Key': props<{ key: string | null }>(),
    'Set Split Mode': props<{ split: boolean }>(),
    'Set Range Preset': props<{ preset: RangePreset }>(),
    'Set Anchor': props<{ value: string }>(),
    'Set Follow Latest': props<{ follow: boolean }>(),
    'Anchor Followed Latest': props<{ value: string; exactIso: string | null }>(),
    'Set Left Steps': props<{ steps: number }>(),
    'Set Right Steps': props<{ steps: number }>(),
    'Increment Left': emptyProps(),
    'Decrement Left': emptyProps(),
    'Increment Right': emptyProps(),
    'Decrement Right': emptyProps(),
    'Snapshot Received': props<{ payload: PortfolioSnapshotPayload }>(),
  },
});
