import { Logger } from "../core/logger";
import { PortfolioRepo, type PortfolioRow } from "../data/portfolioRepo";
import type { PortfolioSnapshotPayload, PortfolioSeries, PortfolioPoint, PortfolioLatest, PortfolioMetrics } from "../app/portfolioTypes";
import type { RangeMeta } from "../app/snapshotTypes";

type RangePreset = "1H" | "1D" | "1W" | "1M" | "1Y" | "MAX";
type RangeFilter =
  | { preset: "MAX" }
  | { preset: Exclude<RangePreset, "MAX">; anchorDateTime: string; leftSteps: number; rightSteps: number };

function clamp(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.floor(x));
}

function addHoursUTC(d: Date, h: number) { const x = new Date(d); x.setUTCHours(x.getUTCHours() + h); return x; }
function addDaysUTC(d: Date, days: number) { const x = new Date(d); x.setUTCDate(x.getUTCDate() + days); return x; }
function addMonthsUTC(d: Date, m: number) { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + m); return x; }
function addYearsUTC(d: Date, y: number) { const x = new Date(d); x.setUTCFullYear(x.getUTCFullYear() + y); return x; }

function addUnit(anchor: Date, preset: Exclude<RangePreset, "MAX">, units: number) {
  switch (preset) {
    case "1H": return addHoursUTC(anchor, units);
    case "1D": return addDaysUTC(anchor, units);
    case "1W": return addDaysUTC(anchor, units * 7);
    case "1M": return addMonthsUTC(anchor, units);
    case "1Y": return addYearsUTC(anchor, units);
  }
}

function lowerBound(arr: string[], x: string) {
  let lo = 0, hi = arr.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < x) lo = mid + 1; else hi = mid; }
  return lo;
}
function upperBound(arr: string[], x: string) {
  let lo = 0, hi = arr.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] <= x) lo = mid + 1; else hi = mid; }
  return lo;
}

function hasDataHalfOpen(times: string[], s: string, e: string) {
  const i = lowerBound(times, s); return i < times.length && times[i] < e;
}
function hasDataOpenClosed(times: string[], s: string, e: string) {
  const i = upperBound(times, s); return i < times.length && times[i] <= e;
}

function computeWindowSkipGaps(
  times: string[],
  range?: RangeFilter | null,
): { startIso: string; endIso: string; meta: RangeMeta } | null {
  if (!times.length) {
    return { startIso: "", endIso: "", meta: { minIso: null, maxIso: null, startIso: null, endIso: null, leftCapped: true, rightCapped: true } };
  }
  const minIso = times[0];
  const maxIso = times[times.length - 1];
  if (!range || range.preset === "MAX") {
    return { startIso: minIso, endIso: maxIso, meta: { minIso, maxIso, startIso: minIso, endIso: maxIso, leftCapped: true, rightCapped: true } };
  }
  const anchor = new Date(range.anchorDateTime);
  if (Number.isNaN(anchor.getTime())) return null;
  const leftSteps = clamp(range.leftSteps);
  const rightSteps = clamp(range.rightSteps);
  let startIso = addUnit(anchor, range.preset, -1).toISOString();
  let endIso = anchor.toISOString();
  if (startIso < minIso) startIso = minIso;
  if (endIso > maxIso) endIso = maxIso;
  for (let i = 0; i < leftSteps; i++) {
    if (startIso <= minIso) { startIso = minIso; break; }
    const prev = startIso;
    let cand = addUnit(new Date(prev), range.preset, -1).toISOString();
    if (cand < minIso) cand = minIso;
    while (cand > minIso && !hasDataHalfOpen(times, cand, prev)) {
      const next = addUnit(new Date(cand), range.preset, -1).toISOString();
      cand = next < minIso ? minIso : next;
      if (cand === minIso) break;
    }
    startIso = cand;
    if (startIso === minIso) break;
  }
  for (let j = 0; j < rightSteps; j++) {
    if (endIso >= maxIso) { endIso = maxIso; break; }
    const prev = endIso;
    let cand = addUnit(new Date(prev), range.preset, 1).toISOString();
    if (cand > maxIso) cand = maxIso;
    while (cand < maxIso && !hasDataOpenClosed(times, prev, cand)) {
      const next = addUnit(new Date(cand), range.preset, 1).toISOString();
      cand = next > maxIso ? maxIso : next;
      if (cand === maxIso) break;
    }
    endIso = cand;
    if (endIso === maxIso) break;
  }
  return { startIso, endIso, meta: { minIso, maxIso, startIso, endIso, leftCapped: startIso <= minIso, rightCapped: endIso >= maxIso } };
}

function buildPoints(rows: PortfolioRow[], key: keyof PortfolioRow): PortfolioPoint[] {
  return rows.map(r => ({ x: r.timeIso, y: r[key] as number | null }));
}

export class PortfolioSnapshotService {
  private log = new Logger("svc:PortfolioSnapshot");

  constructor(private repo: PortfolioRepo) {}

  build(y1Key: string | null, y2Key: string | null, range?: RangeFilter): PortfolioSnapshotPayload {
    const allRows = this.repo.loadAll();
    const times = allRows.map(r => r.timeIso);
    const window = computeWindowSkipGaps(times, range);

    let rows = allRows;
    let rangeMeta: RangeMeta = { minIso: null, maxIso: null, startIso: null, endIso: null, leftCapped: true, rightCapped: true };

    if (window) {
      rangeMeta = window.meta;
      if (rangeMeta.startIso && rangeMeta.endIso) {
        rows = rows.filter(r => r.timeIso >= rangeMeta.startIso! && r.timeIso <= rangeMeta.endIso!);
      } else {
        rows = [];
      }
    }

    const series: PortfolioSeries[] = [];
    const validKeys = new Set<keyof PortfolioRow>(["value", "profitP", "profit", "purchase"]);
    if (y1Key && validKeys.has(y1Key as keyof PortfolioRow)) {
      series.push({ key: y1Key, axis: "y1", points: buildPoints(rows, y1Key as keyof PortfolioRow) });
    }
    if (y2Key && validKeys.has(y2Key as keyof PortfolioRow)) {
      series.push({ key: y2Key, axis: "y2", points: buildPoints(rows, y2Key as keyof PortfolioRow) });
    }

    // Every metric of the window, so the wallet summary can follow the cursor.
    const metrics: PortfolioMetrics = {
      times: rows.map(r => r.timeIso),
      value: rows.map(r => r.value),
      profitP: rows.map(r => r.profitP),
      profit: rows.map(r => r.profit),
      purchase: rows.map(r => r.purchase),
    };

    // Newest row of the current window — always sent, regardless of the axis keys.
    const lastRow = rows.length > 0 ? rows[rows.length - 1] : null;
    const latest: PortfolioLatest | null = lastRow
      ? {
        timeIso: lastRow.timeIso,
        value: lastRow.value,
        profitP: lastRow.profitP,
        profit: lastRow.profit,
        purchase: lastRow.purchase,
      }
      : null;

    this.log.info("built portfolio snapshot", { y1Key, y2Key, rows: rows.length, preset: (range as any)?.preset ?? "none" });
    return { y1Key, y2Key, series, rangeMeta, latest, metrics };
  }
}
