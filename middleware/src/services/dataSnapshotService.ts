import { Logger } from "../core/logger";
import { MultiQuoteAllRepo, type QuoteRow } from "../data/multiQuoteAllRepo";
import type { DataSnapshotPayload, Point, Series, RangeMeta } from "../app/snapshotTypes";

type RangePreset = "1H" | "1D" | "1W" | "1M" | "1Y" | "MAX";
type RangeFilter =
    | { preset: "MAX" }
    | {
        preset: Exclude<RangePreset, "MAX">;
        anchorDateTime: string; // ISO (UTC)
        leftSteps: number;
        rightSteps: number;
    };

function parseNumber(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;

    const s = String(v).trim();
    if (!s) return null;

    const normalized = s.replace(/\s+/g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
}

function buildPoints(rows: QuoteRow[], yKey: string): Point[] {
    const pts: Point[] = [];
    for (const r of rows) pts.push({ x: r.timeIso, y: parseNumber(r[yKey]) });
    return pts;
}

function clamp(n: unknown): number {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, Math.floor(x));
}

// -------- time add in UTC --------
function addHoursUTC(d: Date, h: number) {
    const x = new Date(d);
    x.setUTCHours(x.getUTCHours() + h);
    return x;
}
function addDaysUTC(d: Date, days: number) {
    const x = new Date(d);
    x.setUTCDate(x.getUTCDate() + days);
    return x;
}
function addMonthsUTC(d: Date, months: number) {
    const x = new Date(d);
    x.setUTCMonth(x.getUTCMonth() + months);
    return x;
}
function addYearsUTC(d: Date, years: number) {
    const x = new Date(d);
    x.setUTCFullYear(x.getUTCFullYear() + years);
    return x;
}
function addUnit(anchor: Date, preset: Exclude<RangePreset, "MAX">, units: number) {
    switch (preset) {
        case "1H":
            return addHoursUTC(anchor, units);
        case "1D":
            return addDaysUTC(anchor, units);
        case "1W":
            return addDaysUTC(anchor, units * 7);
        case "1M":
            return addMonthsUTC(anchor, units);
        case "1Y":
            return addYearsUTC(anchor, units);
    }
}

// -------- binary search on ISO strings (sorted) --------
function lowerBound(arr: string[], x: string) {
    let lo = 0,
        hi = arr.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] < x) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
function upperBound(arr: string[], x: string) {
    let lo = 0,
        hi = arr.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] <= x) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

// exists any time in [start, end)
function hasDataHalfOpen(times: string[], startIso: string, endIso: string) {
    const i = lowerBound(times, startIso);
    return i < times.length && times[i] < endIso;
}

// exists any time in (start, end]
function hasDataOpenClosed(times: string[], startIso: string, endIso: string) {
    const i = upperBound(times, startIso);
    return i < times.length && times[i] <= endIso;
}

function computeWindowSkipGaps(
    times: string[],
    range?: RangeFilter | null
): { startIso: string; endIso: string; meta: RangeMeta } | null {
    if (!times.length) {
        return {
            startIso: "",
            endIso: "",
            meta: {
                minIso: null,
                maxIso: null,
                startIso: null,
                endIso: null,
                leftCapped: true,
                rightCapped: true,
            },
        };
    }

    const minIso = times[0];
    const maxIso = times[times.length - 1];

    // MAX => full window
    if (!range || range.preset === "MAX") {
        return {
            startIso: minIso,
            endIso: maxIso,
            meta: {
                minIso,
                maxIso,
                startIso: minIso,
                endIso: maxIso,
                leftCapped: true,
                rightCapped: true,
            },
        };
    }

    const anchor = new Date(range.anchorDateTime);
    if (Number.isNaN(anchor.getTime())) return null;

    const leftSteps = clamp(range.leftSteps);
    const rightSteps = clamp(range.rightSteps);

    // base window: [anchor - 1 unit, anchor]
    let start = addUnit(anchor, range.preset, -1);
    let end = anchor;

    // clamp to min/max
    let startIso = start.toISOString();
    let endIso = end.toISOString();
    if (startIso < minIso) startIso = minIso;
    if (endIso > maxIso) endIso = maxIso;

    // expand LEFT: each "step" MUST add at least one new datapoint, so we skip empty gaps
    for (let i = 0; i < leftSteps; i++) {
        if (startIso <= minIso) {
            startIso = minIso;
            break;
        }

        const prevStartIso = startIso;
        let cand = addUnit(new Date(prevStartIso), range.preset, -1).toISOString();
        if (cand < minIso) cand = minIso;

        // keep extending while the newly added interval has no data
        // interval = [cand, prevStartIso)
        while (cand > minIso && !hasDataHalfOpen(times, cand, prevStartIso)) {
            const next = addUnit(new Date(cand), range.preset, -1).toISOString();
            cand = next < minIso ? minIso : next;
            if (cand === minIso) break;
        }

        startIso = cand;
        if (startIso === minIso) break;
    }

    // expand RIGHT: each step adds at least one new datapoint, skip empty gaps
    for (let j = 0; j < rightSteps; j++) {
        if (endIso >= maxIso) {
            endIso = maxIso;
            break;
        }

        const prevEndIso = endIso;
        let cand = addUnit(new Date(prevEndIso), range.preset, 1).toISOString();
        if (cand > maxIso) cand = maxIso;

        // interval = (prevEndIso, cand]
        while (cand < maxIso && !hasDataOpenClosed(times, prevEndIso, cand)) {
            const next = addUnit(new Date(cand), range.preset, 1).toISOString();
            cand = next > maxIso ? maxIso : next;
            if (cand === maxIso) break;
        }

        endIso = cand;
        if (endIso === maxIso) break;
    }

    const meta: RangeMeta = {
        minIso,
        maxIso,
        startIso,
        endIso,
        leftCapped: startIso <= minIso,
        rightCapped: endIso >= maxIso,
    };

    return { startIso, endIso, meta };
}

export class DataSnapshotService {
    private log = new Logger("svc:DataSnapshot");

    constructor(private repo: MultiQuoteAllRepo) { }

    build(symbols: string[], y1Key: string | null, y2Key: string | null, range?: RangeFilter): DataSnapshotPayload {
        // load all rows for symbols first (needed for gap-skipping boundaries)
        const allRows = this.repo.getBySymbols(symbols);
        const times = allRows.map((r) => r.timeIso); // already sorted in repo

        const window = computeWindowSkipGaps(times, range);

        let rows = allRows;

        let rangeMeta: RangeMeta = {
            minIso: null,
            maxIso: null,
            startIso: null,
            endIso: null,
            leftCapped: true,
            rightCapped: true,
        };

        if (window) {
            rangeMeta = window.meta;
            if (rangeMeta.startIso && rangeMeta.endIso) {
                rows = rows.filter((r) => r.timeIso >= rangeMeta.startIso! && r.timeIso <= rangeMeta.endIso!);
            } else {
                rows = [];
            }
        }

        const bySymbol = new Map<string, QuoteRow[]>();
        for (const r of rows) {
            const arr = bySymbol.get(r.symbol) ?? [];
            arr.push(r);
            bySymbol.set(r.symbol, arr);
        }

        const series: Series[] = [];
        for (const [symbol, list] of bySymbol.entries()) {
            list.sort((a, b) => a.timeIso.localeCompare(b.timeIso));

            const s: Series = { symbol, y1: [] };
            if (y1Key) s.y1 = buildPoints(list, y1Key);
            if (y2Key) s.y2 = buildPoints(list, y2Key);

            series.push(s);
        }

        this.log.info("built snapshot", {
            symbols: symbols.length,
            series: series.length,
            y1Key,
            y2Key,
            preset: (range as any)?.preset ?? "none",
            rangeMeta,
        });

        return { y1Key, y2Key, series, rangeMeta };
    }
}