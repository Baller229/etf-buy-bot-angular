import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { RangeState } from './range.reducer';

const selectRangeState = createFeatureSelector<RangeState>('range');

export const selectRangePreset = createSelector(selectRangeState, s => s.rangePreset);
export const selectAnchorDateTimeLocal = createSelector(selectRangeState, s => s.anchorDateTimeLocal);
export const selectLeftSteps = createSelector(selectRangeState, s => s.leftSteps);
export const selectRightSteps = createSelector(selectRangeState, s => s.rightSteps);

export const selectCanApplyFilter = createSelector(
  selectRangeState,
  s => s.rangePreset === 'MAX' || s.anchorDateTimeLocal.length > 0,
);
