/**
 * OutputManager — JSON-lines output for machine-readable CLI mode.
 *
 * In human mode (default): no-op. Existing logger.* and console.log calls work as-is.
 * In JSON mode (--json): emits JSON-lines to stdout for each event.
 */

import type { CliEvent, ProgressEvent, ResultEvent, ErrorEvent } from "@/types/events.js";

export class OutputManager {
  private _jsonMode: boolean;

  constructor(jsonMode = false) {
    this._jsonMode = jsonMode;
  }

  get jsonMode(): boolean {
    return this._jsonMode;
  }

  setJsonMode(value: boolean): void {
    this._jsonMode = value;
  }

  /** Emit any CLI event as a JSON line (only in JSON mode). */
  emit(event: CliEvent): void {
    if (!this._jsonMode) return;
    process.stdout.write(JSON.stringify(event) + "\n");
  }

  /** Emit a progress event. */
  progress(step: number, total: number, message: string): void {
    this.emit({ type: "progress", step, total, message } satisfies ProgressEvent);
  }

  /** Emit a result event. */
  result(success: boolean, data?: unknown): void {
    this.emit({ type: "result", success, data } satisfies ResultEvent);
  }

  /** Emit an error event. */
  error(code: string, message: string, exitCode = 1): void {
    this.emit({ type: "error", code, message, exitCode } satisfies ErrorEvent);
  }

  /** No-op in human mode; useful as a generic log in JSON mode. */
  log(_message: string): void {
    // Human mode: no-op (let existing logger.* calls handle output)
    // JSON mode: use emit() with a typed event instead
  }
}

/** Singleton instance — JSON mode is enabled if --json is in argv at import time. */
export const outputManager = new OutputManager(
  process.argv.includes("--json")
);
