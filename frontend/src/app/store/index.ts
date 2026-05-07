import { ActionReducer, ActionReducerMap } from '@ngrx/store';
import { createSelector } from '@ngrx/store';
import { localStorageSync } from 'ngrx-store-localstorage';
import type { AppState } from './app.state';
import type { ApplyFilterPayload, RangePreset } from '../core/ws/ws.types';

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

export { WsEffects } from './ws/ws.effects';

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

// Cross-slice selector — builds the APPLY_FILTER payload
import {
  selectSelectedRowIds,
  selectY1Key,
  selectY2Key,
} from './table/table.selectors';
import {
  selectRangePreset,
  selectAnchorDateTimeLocal,
  selectLeftSteps,
  selectRightSteps,
} from './range/range.selectors';

export const selectApplyFilterPayload = createSelector(
  selectSelectedRowIds,
  selectY1Key,
  selectY2Key,
  selectRangePreset,
  selectAnchorDateTimeLocal,
  selectLeftSteps,
  selectRightSteps,
  (rowIds, y1, y2, preset, anchorLocal, leftSteps, rightSteps): ApplyFilterPayload | null => {
    if (preset !== 'MAX' && !anchorLocal) return null;

    if (preset === 'MAX') {
      return { rowIds, y1, y2, range: { preset: 'MAX' } };
    }

    const d = new Date(anchorLocal);
    if (isNaN(d.getTime())) return null;

    return {
      rowIds,
      y1,
      y2,
      range: {
        preset: preset as Exclude<RangePreset, 'MAX'>,
        anchorDateTime: d.toISOString(),
        leftSteps,
        rightSteps,
      },
    };
  },
);
