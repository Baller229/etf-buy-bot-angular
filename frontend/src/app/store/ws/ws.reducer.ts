import { createReducer, on } from '@ngrx/store';
import type { WsLogEntry, WsStatus } from '../../core/ws/ws.types';
import { WsActions } from './ws.actions';

export interface WsState {
  wsStatus: WsStatus;
  wsLogs: WsLogEntry[];
}

const initialState: WsState = {
  wsStatus: 'DISCONNECTED',
  wsLogs: [],
};

export const wsReducer = createReducer(
  initialState,
  on(WsActions.statusChanged, (state, { status }) => ({ ...state, wsStatus: status })),
  on(WsActions.logAdded, (state, { entry }) => ({
    ...state,
    wsLogs: [...state.wsLogs.slice(-199), entry],
  })),
);
