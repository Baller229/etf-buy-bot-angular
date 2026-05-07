import { createReducer, on } from '@ngrx/store';
import type { ActiveTab } from './ui.actions';
import { UiActions } from './ui.actions';

export interface UiState {
  darkMode: boolean;
  showWsInspector: boolean;
  activeTab: ActiveTab;
}

const initialState: UiState = {
  darkMode: false,
  showWsInspector: false,
  activeTab: 'chart',
};

export const uiReducer = createReducer(
  initialState,
  on(UiActions.toggleDarkMode, state => ({ ...state, darkMode: !state.darkMode })),
  on(UiActions.setDarkMode, (state, { enabled }) => ({ ...state, darkMode: enabled })),
  on(UiActions.toggleWsInspector, state => ({ ...state, showWsInspector: !state.showWsInspector })),
  on(UiActions.setActiveTab, (state, { tab }) => ({ ...state, activeTab: tab })),
);
