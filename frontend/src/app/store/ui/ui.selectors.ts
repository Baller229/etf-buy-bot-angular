import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { UiState } from './ui.reducer';

const selectUiState = createFeatureSelector<UiState>('ui');

export const selectDarkMode = createSelector(selectUiState, s => s.darkMode);
export const selectShowWsInspector = createSelector(selectUiState, s => s.showWsInspector);
export const selectActiveTab = createSelector(selectUiState, s => s.activeTab);
