import { createReducer, on } from '@ngrx/store';
import type { DataSnapshotPayload } from '../../core/ws/ws.types';
import { ChartActions } from './chart.actions';

export interface ChartState {
  snapshot: DataSnapshotPayload | null;
  hiddenSeriesKeys: string[];
}

const initialState: ChartState = {
  snapshot: null,
  hiddenSeriesKeys: [],
};

export const chartReducer = createReducer(
  initialState,
  on(ChartActions.snapshotReceived, (state, { payload }) => ({ ...state, snapshot: payload })),
  on(ChartActions.toggleSeriesVisibility, (state, { key }) => {
    const exists = state.hiddenSeriesKeys.includes(key);
    return {
      ...state,
      hiddenSeriesKeys: exists
        ? state.hiddenSeriesKeys.filter(k => k !== key)
        : [...state.hiddenSeriesKeys, key],
    };
  }),
  on(ChartActions.showAllSeries, state => ({ ...state, hiddenSeriesKeys: [] })),
  on(ChartActions.setHiddenSeriesKeys, (state, { keys }) => ({ ...state, hiddenSeriesKeys: keys })),
);
