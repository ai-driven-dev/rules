import * as vscode from "vscode";

/**
 * Logger service interface
 */
export interface ILogger {
  log(message: string): void;
  error(message: string, error?: unknown): void;
  info(message: string): void;
  warn(message: string): void;
  debug(message: string): void;
  show(): void;
}

/**
 * Implementation of logger service using VS Code output channel
 */
export class Logger implements ILogger {
  private outputChannel: vscode.OutputChannel;
  private debugMode: boolean;

  /**
   * Create a new logger
   * @param channelName Name of the output channel
   * @param debugMode Whether to show debug logs
   */
  constructor(channelName: string, debugMode = false) {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
    this.debugMode = debugMode;
  }

  /**
   * Format timestamp for logs
   * @returns Formatted timestamp
   */
  private getTimestamp(): string {
    return `[${new Date().toLocaleTimeString()}]`;
  }

  /**
   * Log a message
   * @param message Message to log
   */
  public log(message: string): void {
    this.outputChannel.appendLine(`${this.getTimestamp()} ${message}`);
  }

  /**
   * Log an error message
   * @param message Error message
   * @param error Error object
   */
  public error(message: string, error?: unknown): void {
    this.outputChannel.appendLine(`${this.getTimestamp()} ERROR: ${message}`);

    if (error) {
      if (error instanceof Error) {
        this.outputChannel.appendLine(`${error.message}`);
        if (error.stack) {
          this.outputChannel.appendLine(error.stack);
        }
      } else if (typeof error === "object" && error !== null) {
        this.outputChannel.appendLine(JSON.stringify(error, null, 2));
      } else {
        this.outputChannel.appendLine(String(error));
      }
    }
  }

  /**
   * Log an info message
   * @param message Info message
   */
  public info(message: string): void {
    this.outputChannel.appendLine(`${this.getTimestamp()} INFO: ${message}`);
  }

  /**
   * Log a warning message
   * @param message Warning message
   */
  public warn(message: string): void {
    this.outputChannel.appendLine(`${this.getTimestamp()} WARNING: ${message}`);
  }

  /**
   * Log a debug message (only shown when debug mode is enabled)
   * @param message Debug message
   */
  public debug(message: string): void {
    if (this.debugMode) {
      this.outputChannel.appendLine(`${this.getTimestamp()} DEBUG: ${message}`);
    }
  }

  /**
   * Show the output channel
   */
  public show(): void {
    this.outputChannel.show();
  }

  /**
   * Dispose the output channel
   */
  public dispose(): void {
    this.outputChannel.dispose();
  }
}
