import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import type { TableColumn, TableData, TableRow } from "../app/tableTypes";
import { Logger } from "../core/logger";
import { readFileSignature, sameSignature, type FileSignature } from "../core/fileSignature";

function sanitizeKey(header: string) {
    let k = header.trim();
    k = k.replace(/\s+/g, "_");
    k = k.replace(/[^a-zA-Z0-9_]/g, "_");
    if (/^[0-9]/.test(k)) k = `c_${k}`;
    return k;
}

function trimRecordKeys(rec: Record<string, unknown>) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rec)) {
        const key = String(k).trim();
        out[key] = typeof v === "string" ? v.trim() : v;
    }
    return out;
}

export class MultiQuoteTableRepo {
    private log = new Logger("repo:MultiQuoteTable");
    private cache: TableData | null = null;
    private cacheSignature: FileSignature | null = null;

    readonly filePath: string;

    constructor(private opts: { dataDir: string; fileName: string }) {
        this.filePath = path.resolve(process.cwd(), opts.dataDir, opts.fileName);
    }

    load(): TableData {
        const signature = readFileSignature(this.filePath);

        // Cache is valid only while mtime+size match the file on disk.
        if (this.cache && sameSignature(signature, this.cacheSignature)) return this.cache;

        this.log.info("loading csv", { filePath: this.filePath });

        let payload: TableData;
        try {
            payload = this.parseCsv(readFileSync(this.filePath, "utf-8"));
        } catch (e) {
            if (this.cache) {
                this.log.warn("csv read failed, keeping previous data", { filePath: this.filePath, err: String(e) });
                return this.cache;
            }
            throw e;
        }

        if (payload.rows.length === 0 && this.cache) {
            this.log.warn("csv parsed to 0 rows, keeping previous data", { filePath: this.filePath });
            return this.cache;
        }

        this.cache = payload;
        this.cacheSignature = signature;
        this.log.info("loaded", { rows: payload.rows.length, cols: payload.columns.length });
        return payload;
    }

    private parseCsv(csv: string): TableData {
        const recordsRaw = parse(csv, {
            columns: true,
            delimiter: ";",
            skip_empty_lines: true,
            trim: true,
        }) as Record<string, unknown>[];

        const records = recordsRaw.map(trimRecordKeys);
        if (records.length === 0) {
            return { columns: [], rows: [] };
        }

        const headers = Object.keys(records[0]).map((h) => h.trim());
        const columns: TableColumn[] = headers.map((h) => ({
            key: sanitizeKey(h),
            label: h,
            type: "string",
        }));

        const keyByLabel = new Map(columns.map((c) => [c.label, c.key]));
        const symbolKey = keyByLabel.get("symbol") ?? keyByLabel.get("name") ?? "symbol";
        const idxKey = keyByLabel.get("idx") ?? "idx";

        const rows: TableRow[] = records.map((r) => {
            const row: Record<string, unknown> = {};
            for (const h of headers) {
                const key = keyByLabel.get(h) ?? sanitizeKey(h);
                row[key] = r[h];
            }

            const symbol = String(row[symbolKey] ?? "");
            const idx = String(row[idxKey] ?? "");
            const id = symbol || idx || cryptoRandomIdFallback();

            return { id, ...row };
        });

        return { columns, rows };
    }
}

function cryptoRandomIdFallback() {
    return `row_${Math.random().toString(16).slice(2)}`;
}
