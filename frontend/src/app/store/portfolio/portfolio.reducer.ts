import { createReducer, on } from '@ngrx/store';
import type { RangePreset, PortfolioSnapshotPayload } from '../../core/ws/ws.types';
import { PortfolioActions } from './portfolio.actions';

export interface PortfolioState {
  y1Key: string | null;
  y2Key: string | null;
  splitMode: boolean;
  rangePreset: RangePreset;
  anchorDateTimeLocal: string;
  leftSteps: number;
  rightSteps: number;
  snapshot: PortfolioSnapshotPayload | null;
}

const initialState: PortfolioState = {
  y1Key: 'value',
  y2Key: 'purchase',
  splitMode: true,
  rangePreset: 'MAX',
  anchorDateTimeLocal: '',
  leftSteps: 0,
  rightSteps: 0,
  snapshot: null,
};

export const portfolioReducer = createReducer(
  initialState,
  on(PortfolioActions.setY1Key, (state, { key }) => ({ ...state, y1Key: key })),
  on(PortfolioActions.setY2Key, (state, { key }) => ({ ...state, y2Key: key })),
  on(PortfolioActions.setSplitMode, (state, { split }) => ({ ...state, splitMode: split })),
  on(PortfolioActions.setRangePreset, (state, { preset }) => ({ ...state, rangePreset: preset })),
  on(PortfolioActions.setAnchor, (state, { value }) => ({ ...state, anchorDateTimeLocal: value })),
  on(PortfolioActions.setLeftSteps, (state, { steps }) => ({ ...state, leftSteps: Math.max(0, steps) })),
  on(PortfolioActions.setRightSteps, (state, { steps }) => ({ ...state, rightSteps: Math.max(0, steps) })),
  on(PortfolioActions.incrementLeft, state => ({ ...state, leftSteps: state.leftSteps + 1 })),
  on(PortfolioActions.decrementLeft, state => ({ ...state, leftSteps: Math.max(0, state.leftSteps - 1) })),
  on(PortfolioActions.incrementRight, state => ({ ...state, rightSteps: state.rightSteps + 1 })),
  on(PortfolioActions.decrementRight, state => ({ ...state, rightSteps: Math.max(0, state.rightSteps - 1) })),
  on(PortfolioActions.snapshotReceived, (state, { payload }) => ({ ...state, snapshot: payload })),
);
