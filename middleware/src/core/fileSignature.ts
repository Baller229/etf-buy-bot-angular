import { statSync } from "node:fs";

/**
 * Cheap "has this file changed?" fingerprint. Used both for cache invalidation
 * in the repos and for change detection in CsvFileWatcher.
 */
export type FileSignature = { mtimeMs: number; size: number };

export function readFileSignature(filePath: string): FileSignature | null {
    try {
        const st = statSync(filePath);
        return { mtimeMs: st.mtimeMs, size: st.size };
    } catch {
        // missing or momentarily locked by the writer
        return null;
    }
}

export function sameSignature(a: FileSignature | null, b: FileSignature | null): boolean {
    if (!a || !b) return false;
    return a.mtimeMs === b.mtimeMs && a.size === b.size;
}
