export type Point = { x: string; y: number | null };

export type Series = {
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
    series: Series[];
    rangeMeta: RangeMeta;
};