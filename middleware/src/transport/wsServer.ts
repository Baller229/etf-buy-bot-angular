import { WebSocketServer, type WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import type { WsEnvelope } from "../app/messages";
import { Logger } from "../core/logger";
import { InitTableService } from "../services/initTableService";
import { DataSnapshotService } from "../services/dataSnapshotService";
import { PortfolioSnapshotService } from "../services/portfolioSnapshotService";

export class WsServer {
  private wss: WebSocketServer;
  private log = new Logger("ws");

  constructor(
    private opts: { port: number; path: string },
    private initTableService: InitTableService,
    private snapshotService: DataSnapshotService,
    private portfolioSnapshotService: PortfolioSnapshotService
  ) {
    this.wss = new WebSocketServer({ port: opts.port, path: opts.path });
  }

  start() {
    this.log.info("listening", this.opts);


    // ======================================================================
    //
    // ======================================================================


    this.wss.on("connection", (socket) => {
      const clientId = randomUUID();
      this.log.info("connected", { clientId });

      // HELLO
      this.send(socket, {
        wsMsgType: "HELLO",
        requestId: randomUUID(),
        serverTime: new Date().toISOString(),
        clientId,
        version: 3,
      });

      // INIT_TABLE (right after connect)
      try {
        const table = this.initTableService.getInitTable();
        this.send(socket, {
          wsMsgType: "INIT_TABLE",
          requestId: randomUUID(),
          serverTime: new Date().toISOString(),
          table,
        });
      } catch (e) {
        this.send(socket, {
          wsMsgType: "ERROR",
          requestId: randomUUID(),
          serverTime: new Date().toISOString(),
          message: "INIT_TABLE failed",
          details: String(e),
        });
      }


      // ======================================================================
      //
      // ======================================================================


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
          const filter = (msg as any).filter as
            | { rowIds?: unknown; y1?: unknown; y2?: unknown; range?: unknown }
            | undefined;

          const rowIds = Array.isArray(filter?.rowIds) ? (filter!.rowIds as unknown[]).map(String) : [];
          const y1Key = filter?.y1 ? String(filter.y1) : null;
          const y2Key = filter?.y2 ? String(filter.y2) : null;
          const range = filter?.range as any | undefined;

          try {
            const snapshot = this.snapshotService.build(rowIds, y1Key, y2Key, range);

            this.send(socket, {
              wsMsgType: "DATA_SNAPSHOT",
              requestId: msg.requestId ?? randomUUID(),
              serverTime: new Date().toISOString(),
              snapshot,
            });
          } catch (e) {
            this.send(socket, {
              wsMsgType: "ERROR",
              requestId: msg.requestId ?? randomUUID(),
              serverTime: new Date().toISOString(),
              message: "DATA_SNAPSHOT failed",
              details: String(e),
            });
          }

          return;
        }

        if (msg.wsMsgType === "PORTFOLIO_FILTER") {
          const filter = (msg as any).filter as
            | { y1Key?: unknown; y2Key?: unknown; range?: unknown }
            | undefined;

          const y1Key = filter?.y1Key ? String(filter.y1Key) : null;
          const y2Key = filter?.y2Key ? String(filter.y2Key) : null;
          const range = filter?.range as any | undefined;

          try {
            const portfolioSnapshot = this.portfolioSnapshotService.build(y1Key, y2Key, range);
            this.send(socket, {
              wsMsgType: "PORTFOLIO_SNAPSHOT",
              requestId: msg.requestId ?? randomUUID(),
              serverTime: new Date().toISOString(),
              portfolioSnapshot,
            });
          } catch (e) {
            this.send(socket, {
              wsMsgType: "ERROR",
              requestId: msg.requestId ?? randomUUID(),
              serverTime: new Date().toISOString(),
              message: "PORTFOLIO_SNAPSHOT failed",
              details: String(e),
            });
          }

          return;
        }
      });


      // ======================================================================
      //
      // ======================================================================


      socket.on("close", (code, reason) => {
        this.log.info("disconnected", {
          clientId,
          code,
          reason: reason.toString("utf-8") || "-",
        });
      });


      // ======================================================================
      //
      // ======================================================================


      socket.on("error", (err) => {
        this.log.error("socket error", { clientId, err: String(err) });
      });
    });


  }

  private send(socket: WebSocket, msg: WsEnvelope) {
    const raw = JSON.stringify(msg);
    socket.send(raw);
    this.log.info("send", { wsMsgType: msg.wsMsgType, bytes: raw.length });
  }
}
