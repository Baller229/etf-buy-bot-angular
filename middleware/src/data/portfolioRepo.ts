import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { Logger } from "../core/logger";
import { readFileSignature, sameSignature, type FileSignature } from "../core/fileSignature";
import { csvTimeToUtcIso, DEFAULT_DATA_TIME_ZONE } from "../core/timeZone";

export type PortfolioRow = {
  timeIso: string;
  value: number | null;
  profitP: number | null;
  profit: number | null;
  purchase: number | null;
};

const PORTFOLIO_KEYS = ["value", "profitP", "profit", "purchase"] as const;

function parseDecimal(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export class PortfolioRepo {
  private log = new Logger("repo:Portfolio");
  private cache: PortfolioRow[] | null = null;
  private cacheSignature: FileSignature | null = null;

  readonly filePath: string;

  constructor(private opts: { dataDir: string; fileName: string; timeZone?: string }) {
    this.filePath = path.resolve(process.cwd(), opts.dataDir, opts.fileName);
  }

  loadAll(): PortfolioRow[] {
    const signature = readFileSignature(this.filePath);

    if (this.cache && sameSignature(signature, this.cacheSignature)) return this.cache;

    this.log.info("loading csv", { filePath: this.filePath });

    let rows: PortfolioRow[];
    try {
      rows = this.parseCsv(readFileSync(this.filePath, "utf-8"));
    } catch (e) {
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

  private parseCsv(csv: string): PortfolioRow[] {
    const recordsRaw = parse(csv, {
      columns: true,
      delimiter: ";",
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, unknown>[];

    const out: PortfolioRow[] = [];
    for (const rec of recordsRaw) {
      // Time is in the first column regardless of header name
      const timeRaw = String(Object.values(rec)[0] ?? "").trim();
      const timeIso = csvTimeToUtcIso(timeRaw, this.opts.timeZone ?? DEFAULT_DATA_TIME_ZONE);
      if (!timeIso) continue;

      out.push({
        timeIso,
        value: parseDecimal(rec["value"]),
        profitP: parseDecimal(rec["profitP"]),
        profit: parseDecimal(rec["profit"]),
        purchase: parseDecimal(rec["purchase"]),
      });
    }

    out.sort((a, b) => a.timeIso.localeCompare(b.timeIso));
    return out;
  }
}
