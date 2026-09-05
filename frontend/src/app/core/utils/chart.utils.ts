import { parseISO, format } from 'date-fns';

export type AxisKey = 'y1' | 'y2';

export function seriesKey(symbol: string, axis: AxisKey): string {
  return `${symbol}::${axis}`;
}

function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

export function buildColorMap(keys: string[]): Map<string, string> {
  const sorted = [...keys].sort();
  const map = new Map<string, string>();
  const usedHues: number[] = [];

  for (const k of sorted) {
    const seed = hash32(k);
    let hue = (seed % 36000) / 100;
    const sat = 65 + (seed >>> 8) % 20;
    const light = 45 + (seed >>> 16) % 16;

    let attempts = 0;
    while (usedHues.some(h => Math.abs(((hue - h + 180) % 360) - 180) < 25) && attempts < 20) {
      hue = (hue + 137.508) % 360;
      attempts++;
    }
    usedHues.push(hue);
    map.set(k, `hsl(${hue.toFixed(1)},${sat}%,${light}%)`);
  }
  return map;
}

export function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 4 }).format(v);
}

export function lastKnownValue(
  points: (number | null)[],
  idx: number,
): number | null {
  for (let i = idx; i >= 0; i--) {
    if (points[i] !== null && points[i] !== undefined) return points[i]!;
  }
  return null;
}

// Fix for +2h bug: use parseISO so the string is treated as UTC, not local time.
export function formatTickFromIso(rawIso: string): string {
  try {
    const d = parseISO(rawIso);
    return format(d, 'dd.MM HH:mm');
  } catch {
    return rawIso;
  }
}

export function formatTooltipTitle(rawIso: string): string {
  try {
    return format(parseISO(rawIso), 'dd.MM.yyyy HH:mm:ss');
  } catch {
    return rawIso;
  }
}

export function formatClockTime(ts: number): string {
  return format(new Date(ts), 'HH:mm:ss');
}

export function isoToLocalInput(iso: string): string {
  try {
    const d = parseISO(iso);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
}
