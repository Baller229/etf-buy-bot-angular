import type { RangeMeta } from "./snapshotTypes";

export type PortfolioPoint = { x: string; y: number | null };

export type PortfolioSeries = {
  key: string;
  axis: "y1" | "y2";
  points: PortfolioPoint[];
};

/** Values of the newest row inside the current window — for the wallet summary. */
export type PortfolioLatest = {
  timeIso: string;
  value: number | null;
  profitP: number | null;
  profit: number | null;
  purchase: number | null;
};

export type PortfolioSnapshotPayload = {
  y1Key: string | null;
  y2Key: string | null;
  series: PortfolioSeries[];
  rangeMeta: RangeMeta;
  latest: PortfolioLatest | null;
};
