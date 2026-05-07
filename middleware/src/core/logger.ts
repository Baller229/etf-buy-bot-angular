export type LogLevel = "debug" | "info" | "warn" | "error";

export class Logger {
  constructor(private scope: string) {}

  debug(msg: string, meta?: unknown) {
    this.log("debug", msg, meta);
  }
  info(msg: string, meta?: unknown) {
    this.log("info", msg, meta);
  }
  warn(msg: string, meta?: unknown) {
    this.log("warn", msg, meta);
  }
  error(msg: string, meta?: unknown) {
    this.log("error", msg, meta);
  }

  private log(level: LogLevel, msg: string, meta?: unknown) {
    const ts = new Date().toISOString();
    const base = `[${ts}] [${level.toUpperCase()}] [${this.scope}] ${msg}`;
    if (meta === undefined) {
      // eslint-disable-next-line no-console
      console.log(base);
      return;
    }
    // eslint-disable-next-line no-console
    console.log(base, meta);
  }
}
