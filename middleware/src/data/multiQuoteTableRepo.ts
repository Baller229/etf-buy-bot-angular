import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import type { InitTablePayload, TableColumn, TableRow } from "../app/tableTypes";
import { Logger } from "../core/logger";

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

    constructor(private opts: { dataDir: string; fileName: string }) { }

    load(): InitTablePayload {
        const filePath = path.resolve(process.cwd(), this.opts.dataDir, this.opts.fileName);
        this.log.info("loading csv", { filePath });

        const csv = readFileSync(filePath, "utf-8");

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