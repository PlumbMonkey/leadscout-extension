/* ──────────────────────────────────────────────────────────
   Hunter – Logger Utility
   ────────────────────────────────────────────────────────── */

export interface LoggerConfig {
  debug: boolean;
}

export class Logger {
  private debug: boolean;

  constructor(config: LoggerConfig) {
    this.debug = config.debug;
  }

  log(section: string, message: string) {
    console.log(`[${section}] ${message}`);
  }

  debug_log(section: string, message: string) {
    if (this.debug) {
      console.log(`[${section}:DEBUG] ${message}`);
    }
  }

  warn(section: string, message: string) {
    console.warn(`[${section}:WARN] ${message}`);
  }

  error(section: string, message: string) {
    console.error(`[${section}:ERROR] ${message}`);
  }
}
