import { WsServer } from "./transport/wsServer";
import { MultiQuoteTableRepo } from "./data/multiQuoteTableRepo";
import { InitTableService } from "./services/initTableService";
import { DataSnapshotService } from "./services/dataSnapshotService";
import { MultiQuoteAllRepo } from "./data/multiQuoteAllRepo";

const port = Number(process.env.PORT ?? 8083);
const path = String(process.env.WS_PATH ?? "/ws");

// Run from /middleware — CSVs are resolved from DATA_DIR (default: ../data)
const dataDir = String(process.env.DATA_DIR ?? "../data");
const tableFile = String(process.env.TABLE_FILE ?? "MultiQuoteTable.csv");
const allFile = String(process.env.ALL_FILE ?? "MultiQuoteAll.csv");

const repo = new MultiQuoteTableRepo({ dataDir, fileName: tableFile });
const initTableService = new InitTableService(repo);

const allRepo = new MultiQuoteAllRepo({ dataDir, fileName: allFile });
const snapshotService = new DataSnapshotService(allRepo);

const server = new WsServer({ port, path }, initTableService, snapshotService);
server.start();