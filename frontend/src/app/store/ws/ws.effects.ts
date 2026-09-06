import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { merge } from 'rxjs';
import { debounceTime, filter, tap, withLatestFrom } from 'rxjs/operators';
import { WsService } from '../../core/ws/ws.service';
import { WsActions } from './ws.actions';
import { TableActions } from '../table/table.actions';
import { RangeActions } from '../range/range.actions';
import { selectApplyFilterPayload } from '../index';
import { selectWsStatus } from './ws.selectors';

@Injectable()
export class WsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly wsService = inject(WsService);

  readonly scheduleApply$ = createEffect(
    () =>
      merge(
        this.actions$.pipe(
          ofType(
            TableActions.setActiveTable,
            TableActions.toggleRowSelection,
            TableActions.setAllSelected,
            TableActions.clearSelection,
            TableActions.setY1Key,
            TableActions.setY2Key,
            TableActions.initTable,
            RangeActions.setPreset,
            RangeActions.setAnchor,
            RangeActions.anchorFollowedLatest,
            RangeActions.setLeftSteps,
            RangeActions.setRightSteps,
            RangeActions.incrementLeft,
            RangeActions.decrementLeft,
            RangeActions.incrementRight,
            RangeActions.decrementRight,
          ),
        ),
        this.actions$.pipe(
          ofType(WsActions.statusChanged),
          filter(({ status }) => status === 'CONNECTED'),
        ),
      ).pipe(
        debounceTime(200),
        withLatestFrom(
          this.store.select(selectApplyFilterPayload),
          this.store.select(selectWsStatus),
        ),
        filter(([, payload, status]) => payload !== null && status === 'CONNECTED'),
        tap(([, payload]) => {
          this.wsService.send({
            wsMsgType: 'APPLY_FILTER',
            requestId: crypto.randomUUID?.() ?? `req_${Date.now()}`,
            clientTime: new Date().toISOString(),
            filter: payload,
          });
        }),
      ),
    { dispatch: false },
  );
}
