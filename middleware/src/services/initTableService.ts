import type { InitTablePayload, TableColumn } from "../app/tableTypes";
import { Logger } from "../core/logger";
import { MultiQuoteTableRepo } from "../data/multiQuoteTableRepo";

export class InitTableService {
    private log = new Logger("svc:InitTable");

    constructor(private repo: MultiQuoteTableRepo) { }

    getInitTable(): InitTablePayload {
        const base = this.repo.load();

        // remove columns we do NOT want in UI
        const filtered = base.columns.filter((c) => {
            const label = c.label.trim().toLowerCase();
            return label !== "idx" && label !== "yymmdd";
        });

        const reordered = reorderColumns(filtered);

        this.log.info("init table ready", { rows: base.rows.length, cols: reordered.length });
        return { columns: reordered, rows: base.rows };
    }
}

function reorderColumns(columns: TableColumn[]): TableColumn[] {
    const norm = (s: string) => s.trim().toLowerCase();

    const ts = columns.find((c) => c.label.trim() === "yyyy.MM.dd_HH:mm:ss");
    const symbol = columns.find((c) => norm(c.label) === "symbol");

    const rest = columns.filter((c) => c !== ts && c !== symbol);

    // timestamp second last, symbol last (ak existujú)
    const out = [...rest];
    if (ts) out.push(ts);
    if (symbol) out.push(symbol);

    return out;
}