import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { RangePreset } from '../../core/ws/ws.types';

export const RangeActions = createActionGroup({
  source: 'Range',
  events: {
    'Set Preset': props<{ preset: RangePreset }>(),
    'Set Anchor': props<{ value: string }>(),
    'Set Left Steps': props<{ steps: number }>(),
    'Set Right Steps': props<{ steps: number }>(),
    'Increment Left': emptyProps(),
    'Decrement Left': emptyProps(),
    'Increment Right': emptyProps(),
    'Decrement Right': emptyProps(),
  },
});
