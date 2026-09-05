import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import type { WsEnvelope } from "../app/messages";
import { Logger } from "../core/logger";
import { InitTableService } from "../services/initTableService";
import { DataSnapshotService } from "../services/dataSnapshotService";
import { PortfolioSnapshotService } from "../services/portfolioSnapshotService";
import type { TableId } from "../app/tableTypes";
import { parseRangeFilter, type RangeFilter } from "../app/rangeTypes";

type TableServices = Record<TableId, { initTable: InitTableService; snapshot: DataSnapshotService }>;

type TableFilter = {
    tableId: TableId;
    rowIds: string[];
    y1Key: string | null;
    y2Key: string | null;
    range?: RangeFilter;
};

type PortfolioFilter = {
    y1Key: string | null;
    y2Key: string | null;
    range?: RangeFilter;
};

type ClientState = {
    clientId: string;
    lastFilter: TableFilter | null;
    lastPortfolioFilter: PortfolioFilter | null;
};

export type DataChange =
    | { kind: "table"; tableId: TableId }      // *Table.csv    -> INIT_TABLE
    | { kind: "series"; tableId: TableId }     // *TableAll.csv -> DATA_SNAPSHOT
    | { kind: "portfolio" };                   // Portfolio.csv -> PORTFOLIO_SNAPSHOT

export class WsServer {
    private wss: WebSocketServer;
    private log = new Logger("ws");
    private clients = new Map<WebSocket, ClientState>();

    constructor(
        private opts: { port: number; path: string },
        private tableServices: TableServices,
        private portfolioSnapshotService: PortfolioSnapshotService,
    ) {
        this.wss = new WebSocketServer({ port: opts.port, path: opts.path });
    }

    start() {
        this.log.info("listening", this.opts);

        this.wss.on("connection", (socket) => {
            const clientId = randomUUID();
            const state: ClientState = { clientId, lastFilter: null, lastPortfolioFilter: null };
            this.clients.set(socket, state);
            this.log.info("connected", { clientId, clients: this.clients.size });

            this.send(socket, {
                wsMsgType: "HELLO",
                requestId: randomUUID(),
                serverTime: new Date().toISOString(),
                clientId,
                version: 3,
            });

            // Send INIT_TABLE for every table so the frontend has all data immediately
            for (const tableId of Object.keys(this.tableServices) as TableId[]) {
                this.sendInitTable(socket, tableId);
            }

            socket.on("message", (data) => {
                const raw = data.toString("utf-8");
                this.log.info("recv", { clientId, raw });

                let msg: WsEnvelope | null = null;
                try {
                    msg = JSON.parse(raw) as WsEnvelope;
                } catch {
                    this.send(socket, { wsMsgType: "ERROR", message: "Invalid JSON" });
                    return;
                }

                if (msg.wsMsgType === "PING") {
                    this.send(socket, {
                        wsMsgType: "PONG",
                        requestId: msg.requestId,
                        serverTime: new Date().toISOString(),
                    });
                    return;
                }

                if (msg.wsMsgType === "APPLY_FILTER") {
                    const filter = readTableFilter(msg);
                    state.lastFilter = filter;
                    this.sendSnapshot(socket, filter, msg.requestId);
                    return;
                }

                if (msg.wsMsgType === "PORTFOLIO_FILTER") {
                    const filter = readPortfolioFilter(msg);
                    state.lastPortfolioFilter = filter;
                    this.sendPortfolioSnapshot(socket, filter, msg.requestId);
                    return;
                }
            });

            socket.on("close", (code, reason) => {
                this.clients.delete(socket);
                this.log.info("disconnected", {
                    clientId,
                    code,
                    reason: reason.toString("utf-8") || "-",
                    clients: this.clients.size,
                });
            });

            socket.on("error", (err) => {
                this.log.error("socket error", { clientId, err: String(err) });
            });
        });
    }

    notifyDataChanged(changes: DataChange[]): void {
        if (changes.length === 0 || this.clients.size === 0) return;

        const tableIds = new Set<TableId>();
        const seriesTableIds = new Set<TableId>();
        let portfolioChanged = false;

        for (const c of changes) {
            if (c.kind === "table") tableIds.add(c.tableId);
            else if (c.kind === "series") seriesTableIds.add(c.tableId);
            else portfolioChanged = true;
        }

        let pushes = 0;
        for (const [socket, state] of this.clients) {
            if (socket.readyState !== WebSocket.OPEN) continue;

            for (const tableId of tableIds) {
                this.sendInitTable(socket, tableId, true);
                pushes++;
            }

            for (const tableId of seriesTableIds) {
                if (state.lastFilter?.tableId !== tableId) continue;
                this.sendSnapshot(socket, state.lastFilter, undefined, true);
                pushes++;
            }

            if (portfolioChanged && state.lastPortfolioFilter) {
                this.sendPortfolioSnapshot(socket, state.lastPortfolioFilter, undefined, true);
                pushes++;
            }
        }

        this.log.info("pushed data change", {
            changes: changes.map((c) => (c.kind === "portfolio" ? c.kind : `${c.kind}:${c.tableId}`)),
            clients: this.clients.size,
            messages: pushes,
        });
    }

    private sendInitTable(socket: WebSocket, tableId: TableId, pushed = false) {
        try {
            const table = this.tableServices[tableId].initTable.getInitTable();
            this.send(socket, {
                wsMsgType: "INIT_TABLE",
                requestId: randomUUID(),
                serverTime: new Date().toISOString(),
                pushed,
                table,
            });
        } catch (e) {
            this.sendError(socket, undefined, `INIT_TABLE failed for ${tableId}`, e);
        }
    }

    private sendSnapshot(socket: WebSocket, filter: TableFilter, requestId?: string, pushed = false) {
        try {
            const snapshot = this.tableServices[filter.tableId].snapshot.build(
                filter.rowIds,
                filter.y1Key,
                filter.y2Key,
                filter.range,
            );
            this.send(socket, {
                wsMsgType: "DATA_SNAPSHOT",
                requestId: requestId ?? randomUUID(),
                serverTime: new Date().toISOString(),
                pushed,
                snapshot,
            });
        } catch (e) {
            this.sendError(socket, requestId, "DATA_SNAPSHOT failed", e);
        }
    }

    private sendPortfolioSnapshot(socket: WebSocket, filter: PortfolioFilter, requestId?: string, pushed = false) {
        try {
            const portfolioSnapshot = this.portfolioSnapshotService.build(
                filter.y1Key,
                filter.y2Key,
                filter.range,
            );
            this.send(socket, {
                wsMsgType: "PORTFOLIO_SNAPSHOT",
                requestId: requestId ?? randomUUID(),
                serverTime: new Date().toISOString(),
                pushed,
                portfolioSnapshot,
            });
        } catch (e) {
            this.sendError(socket, requestId, "PORTFOLIO_SNAPSHOT failed", e);
        }
    }

    private sendError(socket: WebSocket, requestId: string | undefined, message: string, e: unknown) {
        this.send(socket, {
            wsMsgType: "ERROR",
            requestId: requestId ?? randomUUID(),
            serverTime: new Date().toISOString(),
            message,
            details: String(e),
        });
        this.log.error(message, { err: String(e) });
    }

    private send(socket: WebSocket, msg: WsEnvelope) {
        if (socket.readyState !== WebSocket.OPEN) return;
        const raw = JSON.stringify(msg);
        socket.send(raw);
        this.log.info("send", { wsMsgType: msg.wsMsgType, bytes: raw.length });
    }
}

function readTableFilter(msg: WsEnvelope): TableFilter {
    const filter = msg.filter as Record<string, unknown> | undefined;

    return {
        tableId: (filter?.tableId === "portfolioTickers" ? "portfolioTickers" : "etf") as TableId,
        rowIds: Array.isArray(filter?.rowIds) ? (filter!.rowIds as unknown[]).map(String) : [],
        y1Key: filter?.y1 ? String(filter.y1) : null,
        y2Key: filter?.y2 ? String(filter.y2) : null,
        range: parseRangeFilter(filter?.range),
    };
}

function readPortfolioFilter(msg: WsEnvelope): PortfolioFilter {
    const filter = msg.filter as Record<string, unknown> | undefined;

    return {
        y1Key: filter?.y1Key ? String(filter.y1Key) : null,
        y2Key: filter?.y2Key ? String(filter.y2Key) : null,
        range: parseRangeFilter(filter?.range),
    };
}
