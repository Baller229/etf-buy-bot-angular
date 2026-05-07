import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { WsState } from './ws.reducer';

const selectWsState = createFeatureSelector<WsState>('ws');

export const selectWsStatus = createSelector(selectWsState, s => s.wsStatus);
export const selectWsLogs = createSelector(selectWsState, s => s.wsLogs);
