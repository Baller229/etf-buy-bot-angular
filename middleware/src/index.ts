import { WsServer } from "./transport/wsServer";
import { MultiQuoteTableRepo } from "./data/multiQuoteTableRepo";
import { MultiQuoteAllRepo } from "./data/multiQuoteAllRepo";
import { InitTableService } from "./services/initTableService";
import { DataSnapshotService } from "./services/dataSnapshotService";
import { PortfolioRepo } from "./data/portfolioRepo";
import { PortfolioSnapshotService } from "./services/portfolioSnapshotService";

const port = Number(process.env.PORT ?? 8083);
const path = String(process.env.WS_PATH ?? "/ws");
const dataDir = String(process.env.DATA_DIR ?? "../data");

// ETF dataset
const etfTableRepo = new MultiQuoteTableRepo({ dataDir, fileName: "EtfTable.csv" });
const etfAllRepo = new MultiQuoteAllRepo({ dataDir, fileName: "EtfTableAll.csv" });
const etfInitTableService = new InitTableService("etf", etfTableRepo);
const etfSnapshotService = new DataSnapshotService(etfAllRepo);

// Portfolio Tickers dataset
const portfolioTickersTableRepo = new MultiQuoteTableRepo({ dataDir, fileName: "PortfolioTickersTable.csv" });
const portfolioTickersAllRepo = new MultiQuoteAllRepo({ dataDir, fileName: "PortfolioTickersTableAll.csv" });
const portfolioTickersInitTableService = new InitTableService("portfolioTickers", portfolioTickersTableRepo);
const portfolioTickersSnapshotService = new DataSnapshotService(portfolioTickersAllRepo);

// Portfolio (wallet tab)
const portfolioDataDir = String(process.env.PORTFOLIO_DATA_DIR ?? "../data");
const portfolioRepo = new PortfolioRepo({ dataDir: portfolioDataDir, fileName: "Portfolio.csv" });
const portfolioSnapshotService = new PortfolioSnapshotService(portfolioRepo);

const tableServices = {
    etf: { initTable: etfInitTableService, snapshot: etfSnapshotService },
    portfolioTickers: { initTable: portfolioTickersInitTableService, snapshot: portfolioTickersSnapshotService },
};

const server = new WsServer({ port, path }, tableServices, portfolioSnapshotService);
server.start();
