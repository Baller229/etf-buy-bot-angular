export type WsMsgType =
  | 'HELLO'
  | 'PING'
  | 'PONG'
  | 'INIT_TABLE'
  | 'APPLY_FILTER'
  | 'DATA_SNAPSHOT'
  | 'PORTFOLIO_FILTER'
  | 'PORTFOLIO_SNAPSHOT'
  | 'ERROR';

export type WsStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

export type TableId = 'etf' | 'portfolioTickers';

export type TableColumn = {
  key: string;
  label: string;
  type?: 'string' | 'number' | 'datetime';
};

export type TableRow = Record<string, unknown> & { id: string };

export type InitTablePayload = {
  tableId: TableId;
  columns: TableColumn[];
  rows: TableRow[];
};

export type Point = { x: string; y: number | null };

export type SnapshotSeries = {
  symbol: string;
  y1: Point[];
  y2?: Point[];
};

export type RangeMeta = {
  minIso: string | null;
  maxIso: string | null;
  startIso: string | null;
  endIso: string | null;
  leftCapped: boolean;
  rightCapped: boolean;
};

export type DataSnapshotPayload = {
  y1Key: string | null;
  y2Key: string | null;
  series: SnapshotSeries[];
  rangeMeta: RangeMeta;
};

export type RangePreset = '1H' | '1D' | '1W' | '1M' | '1Y' | 'MAX';

export type RangeFilter =
  | { preset: 'MAX' }
  | { preset: Exclude<RangePreset, 'MAX'>; anchorDateTime: string; leftSteps: number; rightSteps: number };

export type ApplyFilterPayload = {
  tableId: TableId;
  rowIds: string[];
  y1: string | null;
  y2: string | null;
  range: RangeFilter;
};

export type PortfolioSeries = {
  key: string;
  axis: 'y1' | 'y2';
  points: Point[];
};

/** Values of the newest row inside the current window — for the wallet summary. */
export type PortfolioLatest = {
  timeIso: string;
  value: number | null;
  profitP: number | null;
  profit: number | null;
  purchase: number | null;
};

/** All four metrics of the window, columnar — lets the summary follow the cursor. */
export type PortfolioMetrics = {
  times: string[];
  value: (number | null)[];
  profitP: (number | null)[];
  profit: (number | null)[];
  purchase: (number | null)[];
};

export type PortfolioSnapshotPayload = {
  y1Key: string | null;
  y2Key: string | null;
  series: PortfolioSeries[];
  rangeMeta: RangeMeta;
  latest: PortfolioLatest | null;
  metrics: PortfolioMetrics;
};

export type PortfolioFilterPayload = {
  y1Key: string | null;
  y2Key: string | null;
  range: RangeFilter;
};

export type WsEnvelope = {
  wsMsgType: WsMsgType | string;
  requestId?: string;
  clientTime?: string;
  serverTime?: string;
  table?: InitTablePayload;
  snapshot?: DataSnapshotPayload;
  portfolioSnapshot?: PortfolioSnapshotPayload;
  [k: string]: unknown;
};

export type WsLogEntry = {
  ts: number;
  dir: 'IN' | 'OUT' | 'SYS';
  type?: string;
  text: string;
};
