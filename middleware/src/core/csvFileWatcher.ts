import { Logger } from "./logger";
import { readFileSignature, sameSignature, type FileSignature } from "./fileSignature";

export type WatchedFile = { id: string; filePath: string };

type Tracked = {
    file: WatchedFile;
    /** last signature we already reported as settled */
    settled: FileSignature | null;
    /** signature seen once but not yet confirmed as final */
    pending: FileSignature | null;
};

/**
 * Polls mtime+size of the watched CSVs and reports a change only once the file
 * has stopped changing for a full interval.
 *
 * Polling (not fs.watch) on purpose: fs.watch is unreliable on Windows/network
 * paths and fires several times per write. The producer writes non-atomically
 * (WriteAllText + AppendAllText), so the settle check is what keeps us from
 * reading a file that is only half written.
 */
export class CsvFileWatcher {
    private log = new Logger("core:CsvFileWatcher");
    private timer: NodeJS.Timeout | null = null;
    private tracked: Tracked[];

    constructor(
        files: WatchedFile[],
        private opts: { intervalMs: number },
        private onChange: (ids: string[]) => void,
    ) {
        // Take the current state as the baseline so we don't fire on startup.
        this.tracked = files.map((file) => ({
            file,
            settled: readFileSignature(file.filePath),
            pending: null,
        }));
    }

    start(): void {
        if (this.timer) return;
        this.timer = setInterval(() => this.poll(), this.opts.intervalMs);
        this.timer.unref?.();
        this.log.info("watching csv files", {
            intervalMs: this.opts.intervalMs,
            files: this.tracked.map((t) => t.file.id),
        });
    }

    stop(): void {
        if (!this.timer) return;
        clearInterval(this.timer);
        this.timer = null;
    }

    private poll(): void {
        const changed: string[] = [];

        for (const t of this.tracked) {
            const signature = readFileSignature(t.file.filePath);

            // missing or locked right now — look again next tick
            if (!signature) continue;

            if (sameSignature(signature, t.settled)) {
                t.pending = null;
                continue;
            }

            if (t.pending && sameSignature(signature, t.pending)) {
                // unchanged for a whole interval => the writer is done
                t.settled = signature;
                t.pending = null;
                changed.push(t.file.id);
            } else {
                // first sighting (or still growing) — wait one more tick
                t.pending = signature;
            }
        }

        if (changed.length === 0) return;

        this.log.info("csv changed", { ids: changed });
        try {
            this.onChange(changed);
        } catch (e) {
            this.log.error("onChange handler failed", { err: String(e) });
        }
    }
}
