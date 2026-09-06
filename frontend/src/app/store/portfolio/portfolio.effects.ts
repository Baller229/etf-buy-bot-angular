import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { merge } from 'rxjs';
import { debounceTime, filter, map, tap, withLatestFrom } from 'rxjs/operators';
import { isoToLocalInput } from '../../core/utils/chart.utils';
import { WsService } from '../../core/ws/ws.service';
import { WsActions } from '../ws/ws.actions';
import { selectWsStatus } from '../ws/ws.selectors';
import { PortfolioActions } from './portfolio.actions';
import {
  selectPortfolioAnchorDateTimeLocal,
  selectPortfolioAnchorExactIso,
  selectPortfolioFilterPayload,
  selectPortfolioFollowLatest,
  selectPortfolioRangeMeta,
} from './portfolio.selectors';

@Injectable()
export class PortfolioEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly wsService = inject(WsService);

  readonly schedulePortfolioApply$ = createEffect(
    () =>
      merge(
        this.actions$.pipe(
          ofType(
            PortfolioActions.setY1Key,
            PortfolioActions.setY2Key,
            PortfolioActions.setRangePreset,
            PortfolioActions.setAnchor,
            PortfolioActions.setFollowLatest,
            PortfolioActions.anchorFollowedLatest,
            PortfolioActions.setLeftSteps,
            PortfolioActions.setRightSteps,
            PortfolioActions.incrementLeft,
            PortfolioActions.decrementLeft,
            PortfolioActions.incrementRight,
            PortfolioActions.decrementRight,
          ),
        ),
        this.actions$.pipe(
          ofType(WsActions.statusChanged),
          filter(({ status }) => status === 'CONNECTED'),
        ),
      ).pipe(
        debounceTime(200),
        withLatestFrom(
          this.store.select(selectPortfolioFilterPayload),
          this.store.select(selectWsStatus),
        ),
        filter(([, payload, status]) => payload !== null && status === 'CONNECTED'),
        tap(([, payload]) => {
          this.wsService.send({
            wsMsgType: 'PORTFOLIO_FILTER',
            requestId: crypto.randomUUID?.() ?? `req_${Date.now()}`,
            clientTime: new Date().toISOString(),
            filter: payload,
          });
        }),
      ),
    { dispatch: false },
  );

  readonly followLatestAnchor$ = createEffect(() =>
    merge(
      this.actions$.pipe(ofType(PortfolioActions.snapshotReceived)),
      this.actions$.pipe(
        ofType(PortfolioActions.setFollowLatest),
        filter(({ follow }) => follow),
      ),
    ).pipe(
      withLatestFrom(
        this.store.select(selectPortfolioFollowLatest),
        this.store.select(selectPortfolioRangeMeta),
        this.store.select(selectPortfolioAnchorDateTimeLocal),
        this.store.select(selectPortfolioAnchorExactIso),
      ),
      filter(([, follow, meta]) => follow && !!meta?.maxIso),
      map(([, , meta, anchor, exact]) => ({
        value: isoToLocalInput(meta!.maxIso!),
        exactIso: meta!.maxIso,
        anchor,
        exact,
      })),
      // Guard against a feedback loop: only dispatch when something really moves.
      filter(({ value, anchor, exactIso, exact }) => !!value && (value !== anchor || exactIso !== exact)),
      map(({ value, exactIso }) => PortfolioActions.anchorFollowedLatest({ value, exactIso })),
    ),
  );
}
