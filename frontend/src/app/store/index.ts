import { ActionReducer, ActionReducerMap } from '@ngrx/store';
import { createSelector } from '@ngrx/store';
import { localStorageSync } from 'ngrx-store-localstorage';
import type { AppState } from './app.state';
import { fromZonedTime } from 'date-fns-tz';
import { DATA_TIME_ZONE } from '../core/utils/chart.utils';
import type { ApplyFilterPayload, RangePreset } from '../core/ws/ws.types';

import { wsReducer } from './ws/ws.reducer';
import { tableReducer } from './table/table.reducer';
import { rangeReducer } from './range/range.reducer';
import { chartReducer } from './chart/chart.reducer';
import { uiReducer } from './ui/ui.reducer';
import { portfolioReducer } from './portfolio/portfolio.reducer';

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
export * from './portfolio/portfolio.actions';
export * from './portfolio/portfolio.selectors';

export { WsEffects } from './ws/ws.effects';
export { RangeEffects } from './range/range.effects';
export { PortfolioEffects } from './portfolio/portfolio.effects';

export const appReducers: ActionReducerMap<AppState> = {
  ws: wsReducer,
  table: tableReducer,
  range: rangeReducer,
  chart: chartReducer,
  ui: uiReducer,
  portfolio: portfolioReducer,
};

export function localStorageSyncReducer(
  reducer: ActionReducer<AppState>,
): ActionReducer<AppState> {
  return localStorageSync({
    keys: [
      { ui: ['darkMode', 'showWsInspector'] },
      { table: ['activeTableId', 'tables'] },
      { range: ['rangePreset', 'anchorDateTimeLocal', 'leftSteps', 'rightSteps', 'followLatest', 'anchorExactIso'] },
      { portfolio: ['y1Key', 'y2Key', 'splitMode', 'rangePreset', 'anchorDateTimeLocal', 'leftSteps', 'rightSteps', 'followLatest', 'anchorExactIso'] },
    ],
    rehydrate: true,
  })(reducer);
}

// Cross-slice selector — builds the APPLY_FILTER payload
import {
  selectActiveTableId,
  selectSelectedRowIds,
  selectY1Key,
  selectY2Key,
} from './table/table.selectors';
import {
  selectRangePreset,
  selectAnchorDateTimeLocal,
  selectAnchorExactIso,
  selectLeftSteps,
  selectRightSteps,
} from './range/range.selectors';

export const selectApplyFilterPayload = createSelector(
  selectActiveTableId,
  selectSelectedRowIds,
  selectY1Key,
  selectY2Key,
  selectRangePreset,
  selectAnchorDateTimeLocal,
  selectAnchorExactIso,
  selectLeftSteps,
  selectRightSteps,
  (tableId, rowIds, y1, y2, preset, anchorLocal, anchorExactIso, leftSteps, rightSteps): ApplyFilterPayload | null => {
    if (preset !== 'MAX' && !anchorLocal) return null;

    if (preset === 'MAX') {
      return { tableId, rowIds, y1, y2, range: { preset: 'MAX' } };
    }

    // The picked wall clock belongs to the data's zone, not to the viewer's machine.
    const d = fromZonedTime(anchorLocal, DATA_TIME_ZONE);
    if (isNaN(d.getTime())) return null;

    return {
      tableId,
      rowIds,
      y1,
      y2,
      range: {
        preset: preset as Exclude<RangePreset, 'MAX'>,
        // Exact instant while following the latest point, otherwise the picked minute.
        anchorDateTime: anchorExactIso ?? d.toISOString(),
        leftSteps,
        rightSteps,
      },
    };
  },
);
