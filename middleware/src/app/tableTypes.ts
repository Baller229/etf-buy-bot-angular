export type TableColumn = {
    key: string;   // safe key (sanitized)
    label: string; // original csv header (trimmed)
    type?: "string" | "number" | "datetime";
};

export type TableRow = Record<string, unknown> & {
    id: string;
};

export type TableId = 'etf' | 'portfolioTickers';

export type InitTablePayload = {
    tableId: TableId;
    columns: TableColumn[];
    rows: TableRow[];
};