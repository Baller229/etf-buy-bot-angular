import { createReducer, on } from '@ngrx/store';
import type { RangePreset } from '../../core/ws/ws.types';
import { RangeActions } from './range.actions';

export interface RangeState {
  rangePreset: RangePreset;
  anchorDateTimeLocal: string;
  leftSteps: number;
  rightSteps: number;
  followLatest: boolean;
  anchorExactIso: string | null;
}

const initialState: RangeState = {
  rangePreset: 'MAX',
  anchorDateTimeLocal: '',
  leftSteps: 0,
  rightSteps: 0,
  followLatest: false,
  anchorExactIso: null,
};

export const rangeReducer = createReducer(
  initialState,
  on(RangeActions.setPreset, (state, { preset }) => ({ ...state, rangePreset: preset })),
  on(RangeActions.setAnchor, (state, { value }) => ({ ...state, anchorDateTimeLocal: value, followLatest: false, anchorExactIso: null })),
  on(RangeActions.setFollowLatest, (state, { follow }) => ({ ...state, followLatest: follow, anchorExactIso: follow ? state.anchorExactIso : null })),
  on(RangeActions.anchorFollowedLatest, (state, { value, exactIso }) => ({ ...state, anchorDateTimeLocal: value, anchorExactIso: exactIso })),
  on(RangeActions.setLeftSteps, (state, { steps }) => ({ ...state, leftSteps: Math.max(0, steps) })),
  on(RangeActions.setRightSteps, (state, { steps }) => ({ ...state, rightSteps: Math.max(0, steps) })),
  on(RangeActions.incrementLeft, state => ({ ...state, leftSteps: state.leftSteps + 1 })),
  on(RangeActions.decrementLeft, state => ({ ...state, leftSteps: Math.max(0, state.leftSteps - 1) })),
  on(RangeActions.incrementRight, state => ({ ...state, rightSteps: state.rightSteps + 1 })),
  on(RangeActions.decrementRight, state => ({ ...state, rightSteps: Math.max(0, state.rightSteps - 1) })),
);
