import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { Logger } from "../core/logger";

export type QuoteRow = {
    symbol: string;
    timeIso: string; // ISO
    [k: string]: unknown;
};

function sanitizeKey(header: string) {
    let k = header.trim();
    k = k.replace(/\s+/g, "_");
    k = k.replace(/[^a-zA-Z0-9_]/g, "_");
    if (/^[0-9]/.test(k)) k = `c_${k}`;
    return k;
}

function parseTimeToIso(raw: string): string | null {
    const s = raw.trim().replace("_", " ");
    const m = s.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (!m) return null;
    const [_, yyyy, mm, dd, HH, MM, SS] = m;
    return `${yyyy}-${mm}-${dd}T${HH}:${MM}:${SS}.000Z`;
}

export class MultiQuoteAllRepo {
    private log = new Logger("repo:MultiQuoteAll");
    private cache: QuoteRow[] | null = null;

    constructor(private opts: { dataDir: string; fileName: string }) { }

    loadAll(): QuoteRow[] {
        if (this.cache) return this.cache;

        const filePath = path.resolve(process.cwd(), this.opts.dataDir, this.opts.fileName);
        this.log.info("loading csv", { filePath });

        const csv = readFileSync(filePath, "utf-8");

        const recordsRaw = parse(csv, {
            columns: true,
            delimiter: ";",
            skip_empty_lines: true,
            trim: true,
        }) as Record<string, unknown>[];

        // build sanitized-key records
        const out: QuoteRow[] = [];
        for (const rec of recordsRaw) {
            const cleaned: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(rec)) {
                const label = String(k).trim();
                const key = sanitizeKey(label);
                cleaned[key] = typeof v === "string" ? v.trim() : v;
            }

            const symbol = String(cleaned["symbol"] ?? "").trim();
            const timeRaw = String(cleaned["time"] ?? "").trim();
            const timeIso = parseTimeToIso(timeRaw);

            if (!symbol || !timeIso) continue;

            out.push({ symbol, timeIso, ...cleaned });
        }

        // sort by time
        out.sort((a, b) => a.timeIso.localeCompare(b.timeIso));

        this.cache = out;
        this.log.info("loaded", { rows: out.length });
        return out;
    }

    getBySymbols(symbols: string[]): QuoteRow[] {
        const set = new Set(symbols.map((s) => s.trim()).filter(Boolean));
        if (set.size === 0) return [];
        const all = this.loadAll();
        return all.filter((r) => set.has(r.symbol));
    }
}