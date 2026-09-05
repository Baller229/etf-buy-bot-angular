/**
 * The CSVs carry a wall-clock timestamp in the exchange's local time
 * (Xetra / Europe/Berlin), e.g. "2026.05.15_17:35:57" = 17:35 in Berlin.
 *
 * Everything on the wire and in the frontend is real UTC, so the wall clock has
 * to be converted here — otherwise the frontend renders it in local time and the
 * chart ends up shifted by the UTC offset (the old "+2h" bug).
 *
 * Uses Intl (no extra dependency) and is DST-correct: the offset is resolved for
 * the actual instant, so winter (+01:00) and summer (+02:00) both come out right.
 */

export const DEFAULT_DATA_TIME_ZONE = "Europe/Berlin";

const formatterCache = new Map<string, Intl.DateTimeFormat>();
const offsetCache = new Map<string, number>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
    let f = formatterCache.get(timeZone);
    if (!f) {
        f = new Intl.DateTimeFormat("en-US", {
            timeZone,
            hour12: false,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
        formatterCache.set(timeZone, f);
    }
    return f;
}

/** Offset of `timeZone` at instant `ts`, in ms (positive east of Greenwich). */
function offsetMsAt(ts: number, timeZone: string): number {
    // Offsets only change at DST boundaries -> one lookup per hour is enough.
    const bucket = `${timeZone}|${Math.floor(ts / 3_600_000)}`;
    const cached = offsetCache.get(bucket);
    if (cached !== undefined) return cached;

    const parts = formatterFor(timeZone).formatToParts(new Date(ts));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);

    const asUtc = Date.UTC(
        get("year"),
        get("month") - 1,
        get("day"),
        get("hour") % 24, // en-US hour12:false can render midnight as "24"
        get("minute"),
        get("second"),
    );

    const offset = asUtc - ts;
    offsetCache.set(bucket, offset);
    return offset;
}

/**
 * Converts a local wall clock in `timeZone` to a real UTC ISO string.
 * Returns null when the parts do not form a valid date.
 */
export function wallClockToUtcIso(
    parts: { year: number; month: number; day: number; hour: number; minute: number; second: number },
    timeZone: string,
): string | null {
    const naive = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    if (Number.isNaN(naive)) return null;

    // Fixed-point iteration: the offset itself depends on the instant, so one
    // correction pass settles it (a second pass covers DST-boundary wall clocks).
    let ts = naive - offsetMsAt(naive, timeZone);
    for (let i = 0; i < 2; i++) {
        const next = naive - offsetMsAt(ts, timeZone);
        if (next === ts) break;
        ts = next;
    }

    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Parses "yyyy.MM.dd_HH:mm:ss" / "yyyy.MM.dd HH:mm:ss" (local wall clock) to a UTC ISO string. */
export function csvTimeToUtcIso(raw: string, timeZone: string): string | null {
    const s = raw.trim().replace("_", " ");
    const m = s.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (!m) return null;

    return wallClockToUtcIso(
        {
            year: Number(m[1]),
            month: Number(m[2]),
            day: Number(m[3]),
            hour: Number(m[4]),
            minute: Number(m[5]),
            second: Number(m[6]),
        },
        timeZone,
    );
}
