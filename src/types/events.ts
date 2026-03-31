/**
 * CLI event types used by OutputManager for JSON-lines output.
 */

export type ProgressEvent = {
  type: "progress";
  step: number;
  total: number;
  message: string;
};

export type ResultEvent = {
  type: "result";
  success: boolean;
  data?: unknown;
};

export type ErrorEvent = {
  type: "error";
  code: string;
  message: string;
  exitCode: number;
};

export type CliEvent = ProgressEvent | ResultEvent | ErrorEvent;
