import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { PortfolioState } from './portfolio.reducer';
import { fromZonedTime } from 'date-fns-tz';
import { DATA_TIME_ZONE } from '../../core/utils/chart.utils';
import type { RangePreset } from '../../core/ws/ws.types';

const selectPortfolioState = createFeatureSelector<PortfolioState>('portfolio');

export const selectPortfolioY1Key = createSelector(selectPortfolioState, s => s.y1Key);
export const selectPortfolioY2Key = createSelector(selectPortfolioState, s => s.y2Key);
export const selectPortfolioSplitMode = createSelector(selectPortfolioState, s => s.splitMode);
export const selectPortfolioRangePreset = createSelector(selectPortfolioState, s => s.rangePreset);
export const selectPortfolioAnchorDateTimeLocal = createSelector(selectPortfolioState, s => s.anchorDateTimeLocal);
export const selectPortfolioLeftSteps = createSelector(selectPortfolioState, s => s.leftSteps);
export const selectPortfolioRightSteps = createSelector(selectPortfolioState, s => s.rightSteps);
export const selectPortfolioSnapshot = createSelector(selectPortfolioState, s => s.snapshot);
export const selectPortfolioFollowLatest = createSelector(selectPortfolioState, s => s.followLatest);
export const selectPortfolioAnchorExactIso = createSelector(selectPortfolioState, s => s.anchorExactIso);
export const selectPortfolioRangeMeta = createSelector(selectPortfolioSnapshot, s => s?.rangeMeta ?? null);

export const selectPortfolioFilterPayload = createSelector(
  selectPortfolioY1Key,
  selectPortfolioY2Key,
  selectPortfolioRangePreset,
  selectPortfolioAnchorDateTimeLocal,
  selectPortfolioLeftSteps,
  selectPortfolioRightSteps,
  selectPortfolioFollowLatest,
  selectPortfolioAnchorExactIso,
  (y1Key, y2Key, preset, anchorLocal, leftSteps, rightSteps, followLatest, anchorExactIso) => {
    if (preset !== 'MAX' && !anchorLocal && followLatest) {
      return { y1Key, y2Key, range: { preset: 'MAX' as const } };
    }
    if (preset !== 'MAX' && !anchorLocal) return null;
    if (preset === 'MAX') {
      return { y1Key, y2Key, range: { preset: 'MAX' as const } };
    }
    // The picked wall clock belongs to the data's zone, not to the viewer's machine.
    const d = fromZonedTime(anchorLocal, DATA_TIME_ZONE);
    if (isNaN(d.getTime())) return null;
    return {
      y1Key,
      y2Key,
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
