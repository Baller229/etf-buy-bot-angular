export type RangePreset = "1H" | "1D" | "1W" | "1M" | "1Y" | "MAX";

export type RangeFilter =
    | { preset: "MAX" }
    | {
        preset: Exclude<RangePreset, "MAX">;
        anchorDateTime: string; // ISO (UTC)
        leftSteps: number;
        rightSteps: number;
    };

const STEP_PRESETS: Exclude<RangePreset, "MAX">[] = ["1H", "1D", "1W", "1M", "1Y"];

function clampSteps(v: unknown): number {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
}

/** Normalizes an untrusted range object from the wire. Invalid input => undefined (= MAX). */
export function parseRangeFilter(raw: unknown): RangeFilter | undefined {
    if (!raw || typeof raw !== "object") return undefined;

    const r = raw as Record<string, unknown>;
    if (r.preset === "MAX") return { preset: "MAX" };

    const preset = STEP_PRESETS.find((p) => p === r.preset);
    if (!preset) return undefined;

    const anchorDateTime = String(r.anchorDateTime ?? "").trim();
    if (!anchorDateTime || Number.isNaN(new Date(anchorDateTime).getTime())) return undefined;

    return {
        preset,
        anchorDateTime,
        leftSteps: clampSteps(r.leftSteps),
        rightSteps: clampSteps(r.rightSteps),
    };
}
