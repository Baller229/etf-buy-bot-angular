import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { ChartState } from './chart.reducer';

const selectChartState = createFeatureSelector<ChartState>('chart');

export const selectSnapshot = createSelector(selectChartState, s => s.snapshot);
export const selectHiddenSeriesKeys = createSelector(selectChartState, s => s.hiddenSeriesKeys);
export const selectRangeMeta = createSelector(selectSnapshot, s => s?.rangeMeta ?? null);
