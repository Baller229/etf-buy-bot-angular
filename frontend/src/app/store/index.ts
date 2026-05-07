import { ActionReducer, ActionReducerMap } from '@ngrx/store';
import { localStorageSync } from 'ngrx-store-localstorage';
import type { AppState } from './app.state';

import { wsReducer } from './ws/ws.reducer';
import { tableReducer } from './table/table.reducer';
import { rangeReducer } from './range/range.reducer';
import { chartReducer } from './chart/chart.reducer';
import { uiReducer } from './ui/ui.reducer';

export type { AppState } from './app.state';

export * from './ws/ws.actions';
export * from './ws/ws.selectors';
export * from './table/table.actions';
export * from './table/table.selectors';
export * from './range/range.actions';
export * from './range/range.selectors';
export * from './chart/chart.actions';
export * from './chart/chart.selectors';
export * from './ui/ui.actions';
export * from './ui/ui.selectors';

export const appReducers: ActionReducerMap<AppState> = {
  ws: wsReducer,
  table: tableReducer,
  range: rangeReducer,
  chart: chartReducer,
  ui: uiReducer,
};

export function localStorageSyncReducer(
  reducer: ActionReducer<AppState>,
): ActionReducer<AppState> {
  return localStorageSync({
    keys: [
      { ui: ['darkMode', 'showWsInspector'] },
      { table: ['selectedRowIds', 'y1Key', 'y2Key'] },
      { range: ['rangePreset', 'anchorDateTimeLocal', 'leftSteps', 'rightSteps'] },
    ],
    rehydrate: true,
  })(reducer);
}
