import { WsServer, type DataChange } from "./transport/wsServer";
import { MultiQuoteTableRepo } from "./data/multiQuoteTableRepo";
import { MultiQuoteAllRepo } from "./data/multiQuoteAllRepo";
import { InitTableService } from "./services/initTableService";
import { DataSnapshotService } from "./services/dataSnapshotService";
import { PortfolioRepo } from "./data/portfolioRepo";
import { PortfolioSnapshotService } from "./services/portfolioSnapshotService";
import { CsvFileWatcher } from "./core/csvFileWatcher";
import { csvTimeToUtcIso, DEFAULT_DATA_TIME_ZONE } from "./core/timeZone";
import { Logger } from "./core/logger";

const port = Number(process.env.PORT ?? 8083);
const path = String(process.env.WS_PATH ?? "/ws");
const dataDir = String(process.env.DATA_DIR ?? "../data");
const watchIntervalMs = Number(process.env.WATCH_INTERVAL_MS ?? 5000);
const timeZone = String(process.env.DATA_TIMEZONE ?? DEFAULT_DATA_TIME_ZONE);

// ETF dataset
const etfTableRepo = new MultiQuoteTableRepo({ dataDir, fileName: "EtfTable.csv" });
const etfAllRepo = new MultiQuoteAllRepo({ dataDir, fileName: "EtfTableAll.csv", timeZone });
const etfInitTableService = new InitTableService("etf", etfTableRepo);
const etfSnapshotService = new DataSnapshotService(etfAllRepo);

// Portfolio Tickers dataset
const portfolioTickersTableRepo = new MultiQuoteTableRepo({ dataDir, fileName: "PortfolioTickersTable.csv" });
const portfolioTickersAllRepo = new MultiQuoteAllRepo({ dataDir, fileName: "PortfolioTickersTableAll.csv", timeZone });
const portfolioTickersInitTableService = new InitTableService("portfolioTickers", portfolioTickersTableRepo);
const portfolioTickersSnapshotService = new DataSnapshotService(portfolioTickersAllRepo);

// Portfolio (wallet tab)
const portfolioDataDir = String(process.env.PORTFOLIO_DATA_DIR ?? "../data");
const portfolioRepo = new PortfolioRepo({ dataDir: portfolioDataDir, fileName: "Portfolio.csv", timeZone });
const portfolioSnapshotService = new PortfolioSnapshotService(portfolioRepo);

const tableServices = {
    etf: { initTable: etfInitTableService, snapshot: etfSnapshotService },
    portfolioTickers: { initTable: portfolioTickersInitTableService, snapshot: portfolioTickersSnapshotService },
};

// Startup fingerprint: shows at a glance whether the CSV wall clock is being
// converted, and with which zone. 17:35:57 in Berlin must come out as 15:35:57Z
// in summer (16:35:57Z in winter).
new Logger("app").info("csv time zone", {
    timeZone,
    sample: `2026.05.15_17:35:57 -> ${csvTimeToUtcIso("2026.05.15_17:35:57", timeZone)}`,
});

const server = new WsServer({ port, path }, tableServices, portfolioSnapshotService);
server.start();

const watched: Array<{ id: string; filePath: string; change: DataChange }> = [
    { id: "etf:table", filePath: etfTableRepo.filePath, change: { kind: "table", tableId: "etf" } },
    { id: "etf:series", filePath: etfAllRepo.filePath, change: { kind: "series", tableId: "etf" } },
    { id: "portfolioTickers:table", filePath: portfolioTickersTableRepo.filePath, change: { kind: "table", tableId: "portfolioTickers" } },
    { id: "portfolioTickers:series", filePath: portfolioTickersAllRepo.filePath, change: { kind: "series", tableId: "portfolioTickers" } },
    { id: "portfolio", filePath: portfolioRepo.filePath, change: { kind: "portfolio" } },
];

const changeById = new Map(watched.map((w) => [w.id, w.change]));

const watcher = new CsvFileWatcher(
    watched.map(({ id, filePath }) => ({ id, filePath })),
    { intervalMs: watchIntervalMs },
    (ids) => {
        const changes = ids
            .map((id) => changeById.get(id))
            .filter((c): c is DataChange => c !== undefined);
        server.notifyDataChanged(changes);
    },
);
watcher.start();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
        watcher.stop();
        process.exit(0);
    });
}
