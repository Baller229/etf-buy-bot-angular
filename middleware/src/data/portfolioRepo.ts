import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { Logger } from "../core/logger";

export type PortfolioRow = {
  timeIso: string;
  value: number | null;
  profitP: number | null;
  profit: number | null;
  purchase: number | null;
};

const PORTFOLIO_KEYS = ["value", "profitP", "profit", "purchase"] as const;

function parsePortfolioTime(raw: string): string | null {
  const s = raw.trim();
  const m = s.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, yyyy, mm, dd, HH, MM, SS] = m;
  return `${yyyy}-${mm}-${dd}T${HH}:${MM}:${SS}.000Z`;
}

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

  constructor(private opts: { dataDir: string; fileName: string }) {}

  loadAll(): PortfolioRow[] {
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

    const out: PortfolioRow[] = [];
    for (const rec of recordsRaw) {
      // Time is in the first column regardless of header name
      const timeRaw = String(Object.values(rec)[0] ?? "").trim();
      const timeIso = parsePortfolioTime(timeRaw);
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
    this.cache = out;
    this.log.info("loaded", { rows: out.length });
    return out;
  }
}
