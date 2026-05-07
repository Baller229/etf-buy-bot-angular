import { createActionGroup, emptyProps, props } from '@ngrx/store';

export type ActiveTab = 'chart' | 'table' | 'settings';

export const UiActions = createActionGroup({
  source: 'UI',
  events: {
    'Toggle Dark Mode': emptyProps(),
    'Set Dark Mode': props<{ enabled: boolean }>(),
    'Toggle Ws Inspector': emptyProps(),
    'Set Active Tab': props<{ tab: ActiveTab }>(),
  },
});
