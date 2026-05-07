export type WsMsgType =
  | 'HELLO'
  | 'PING'
  | 'PONG'
  | 'INIT_TABLE'
  | 'APPLY_FILTER'
  | 'DATA_SNAPSHOT'
  | 'ERROR';

export type WsStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

export type TableColumn = {
  key: string;
  label: string;
  type?: 'string' | 'number' | 'datetime';
};

export type TableRow = Record<string, unknown> & { id: string };

export type InitTablePayload = {
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

export type ApplyFilterPayload = {
  symbols: string[];
  y1Key: string | null;
  y2Key: string | null;
  range?: {
    preset: RangePreset;
    anchorIso: string;
    leftSteps: number;
    rightSteps: number;
  };
};

export type WsEnvelope = {
  wsMsgType: WsMsgType | string;
  requestId?: string;
  clientTime?: string;
  serverTime?: string;
  table?: InitTablePayload;
  snapshot?: DataSnapshotPayload;
  [k: string]: unknown;
};

export type WsLogEntry = {
  ts: number;
  dir: 'IN' | 'OUT' | 'SYS';
  type?: string;
  text: string;
};
