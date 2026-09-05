import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { Logger } from "../core/logger";
import { readFileSignature, sameSignature, type FileSignature } from "../core/fileSignature";
import { csvTimeToUtcIso, DEFAULT_DATA_TIME_ZONE } from "../core/timeZone";

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

export class MultiQuoteAllRepo {
    private log = new Logger("repo:MultiQuoteAll");
    private cache: QuoteRow[] | null = null;
    private cacheSignature: FileSignature | null = null;

    readonly filePath: string;

    constructor(private opts: { dataDir: string; fileName: string; timeZone?: string }) {
        this.filePath = path.resolve(process.cwd(), opts.dataDir, opts.fileName);
    }

    loadAll(): QuoteRow[] {
        const signature = readFileSignature(this.filePath);

        // Cache is valid only while mtime+size match the file on disk.
        if (this.cache && sameSignature(signature, this.cacheSignature)) return this.cache;

        this.log.info("loading csv", { filePath: this.filePath });

        let rows: QuoteRow[];
        try {
            rows = this.parseCsv(readFileSync(this.filePath, "utf-8"));
        } catch (e) {
            // The producer writes non-atomically, so a half-written file must
            // never destroy good data. Signature is not stored -> retry next call.
            if (this.cache) {
                this.log.warn("csv read failed, keeping previous data", { filePath: this.filePath, err: String(e) });
                return this.cache;
            }
            throw e;
        }

        if (rows.length === 0 && this.cache) {
            this.log.warn("csv parsed to 0 rows, keeping previous data", { filePath: this.filePath });
            return this.cache;
        }

        this.cache = rows;
        this.cacheSignature = signature;
        this.log.info("loaded", { rows: rows.length });
        return rows;
    }

    getBySymbols(symbols: string[]): QuoteRow[] {
        const set = new Set(symbols.map((s) => s.trim()).filter(Boolean));
        if (set.size === 0) return [];
        const all = this.loadAll();
        return all.filter((r) => set.has(r.symbol));
    }

    private parseCsv(csv: string): QuoteRow[] {
        const recordsRaw = parse(csv, {
            columns: true,
            delimiter: ";",
            skip_empty_lines: true,
            trim: true,
        }) as Record<string, unknown>[];

        // Detect time/symbol keys from CSV headers (supports both old and new CSV formats)
        let timeKey = "time";
        let symKey = "symbol";
        if (recordsRaw.length > 0) {
            const firstSanitized = Object.keys(recordsRaw[0]).map(k => sanitizeKey(k.trim()));
            timeKey = firstSanitized.find(k => k === "time") ?? firstSanitized.find(k => k.startsWith("yyyy")) ?? "time";
            symKey = firstSanitized.find(k => k === "symbol") ?? firstSanitized.find(k => k === "name") ?? "symbol";
        }

        // build sanitized-key records
        const out: QuoteRow[] = [];
        for (const rec of recordsRaw) {
            const cleaned: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(rec)) {
                const label = String(k).trim();
                const key = sanitizeKey(label);
                cleaned[key] = typeof v === "string" ? v.trim() : v;
            }

            const symbol = String(cleaned[symKey] ?? "").trim();
            const timeRaw = String(cleaned[timeKey] ?? "").trim();
            const timeIso = csvTimeToUtcIso(timeRaw, this.opts.timeZone ?? DEFAULT_DATA_TIME_ZONE);

            if (!symbol || !timeIso) continue;

            out.push({ symbol, timeIso, ...cleaned });
        }

        // sort by time
        out.sort((a, b) => a.timeIso.localeCompare(b.timeIso));
        return out;
    }
}
