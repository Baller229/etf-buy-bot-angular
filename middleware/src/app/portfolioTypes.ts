import type { RangeMeta } from "./snapshotTypes";

export type PortfolioPoint = { x: string; y: number | null };

export type PortfolioSeries = {
  key: string;
  axis: "y1" | "y2";
  points: PortfolioPoint[];
};

export type PortfolioSnapshotPayload = {
  y1Key: string | null;
  y2Key: string | null;
  series: PortfolioSeries[];
  rangeMeta: RangeMeta;
};
