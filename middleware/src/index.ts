import { WsServer } from "./transport/wsServer";
import { MultiQuoteTableRepo } from "./data/multiQuoteTableRepo";
import { InitTableService } from "./services/initTableService";
import { DataSnapshotService } from "./services/dataSnapshotService";
import { MultiQuoteAllRepo } from "./data/multiQuoteAllRepo";
import { PortfolioRepo } from "./data/portfolioRepo";
import { PortfolioSnapshotService } from "./services/portfolioSnapshotService";

const port = Number(process.env.PORT ?? 8083);
const path = String(process.env.WS_PATH ?? "/ws");

// IMPORTANT: run backend from /fake-backend, CSVs are in ../data
const dataDir = String(process.env.DATA_DIR ?? "../data");
const tableFile = String(process.env.TABLE_FILE ?? "MultiQuoteTable.csv");
const allFile = String(process.env.ALL_FILE ?? "MultiQuoteAll.csv");

// Portfolio CSV lives in etf-buy-bot-angular/data/ (sibling of this project)
const portfolioDataDir = String(process.env.PORTFOLIO_DATA_DIR ?? "../../etf-buy-bot-angular/data");
const portfolioFile = String(process.env.PORTFOLIO_FILE ?? "portfolio.csv");

const repo = new MultiQuoteTableRepo({ dataDir, fileName: tableFile });
const initTableService = new InitTableService(repo);

const allRepo = new MultiQuoteAllRepo({ dataDir, fileName: allFile });
const snapshotService = new DataSnapshotService(allRepo);

const portfolioRepo = new PortfolioRepo({ dataDir: portfolioDataDir, fileName: portfolioFile });
const portfolioSnapshotService = new PortfolioSnapshotService(portfolioRepo);

const server = new WsServer({ port, path }, initTableService, snapshotService, portfolioSnapshotService);
server.start();