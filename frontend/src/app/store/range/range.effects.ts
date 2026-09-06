import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { merge } from 'rxjs';
import { filter, map, withLatestFrom } from 'rxjs/operators';
import { isoToLocalInput } from '../../core/utils/chart.utils';
import { ChartActions } from '../chart/chart.actions';
import { selectRangeMeta } from '../chart/chart.selectors';
import { TableActions } from '../table/table.actions';
import { selectLatestSelectedTimeLocal } from '../table/table.selectors';
import { RangeActions } from './range.actions';
import { selectAnchorDateTimeLocal, selectAnchorExactIso, selectFollowLatest } from './range.selectors';

@Injectable()
export class RangeEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);

  /**
   * While "follow latest" is on, the anchor is pinned to the newest timestamp of the
   * selected symbols.
   *
   * Source of truth is the table data (same clock the Table tab shows), with the
   * snapshot's `rangeMeta.maxIso` as a fallback. Re-runs on every INIT_TABLE and
   * DATA_SNAPSHOT, so a CSV change pushed by the middleware moves the anchor along
   * without any user interaction.
   */
  readonly followLatestAnchor$ = createEffect(() =>
    merge(
      this.actions$.pipe(
        ofType(
          ChartActions.snapshotReceived,
          TableActions.initTable,
          TableActions.toggleRowSelection,
          TableActions.setAllSelected,
          TableActions.clearSelection,
          TableActions.setActiveTable,
        ),
      ),
      this.actions$.pipe(
        ofType(RangeActions.setFollowLatest),
        filter(({ follow }) => follow),
      ),
    ).pipe(
      withLatestFrom(
        this.store.select(selectFollowLatest),
        this.store.select(selectLatestSelectedTimeLocal),
        this.store.select(selectRangeMeta),
        this.store.select(selectAnchorDateTimeLocal),
        this.store.select(selectAnchorExactIso),
      ),
      filter(([, follow]) => follow),
      map(([, , tableLatest, meta, anchor, exact]) => ({
        value: tableLatest ?? (meta?.maxIso ? isoToLocalInput(meta.maxIso) : ''),
        // Exact instant of the newest point — the minute-resolution input would
        // otherwise leave the last seconds of data outside the window.
        exactIso: meta?.maxIso ?? null,
        anchor,
        exact,
      })),
      // Guard against a feedback loop: only dispatch when the anchor really moves.
      filter(({ value, anchor, exactIso, exact }) => !!value && (value !== anchor || exactIso !== exact)),
      map(({ value, exactIso }) => RangeActions.anchorFollowedLatest({ value, exactIso })),
    ),
  );
}
