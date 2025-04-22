import * as vscode from "vscode";
import type { ILogger } from "./logger";

export interface IStatusBarService extends vscode.Disposable {
  setCheckingUpdates(): void;
  setUpdatesChecked(success: boolean, details?: string): void;
  setIdle(): void;
}

export class StatusBarService implements IStatusBarService {
  private statusBarItem: vscode.StatusBarItem;

  constructor(private readonly logger: ILogger) {
    // Create the status bar item, aligned to the left, lower priority
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      10,
    );
    this.statusBarItem.command = "aidd.refreshRuleStatus"; // Make it clickable to trigger refresh
    this.setIdle(); // Initial state
    this.statusBarItem.show();
    logger.debug("StatusBarService initialized.");
  }

  public setCheckingUpdates(): void {
    this.logger.debug("StatusBar: Setting to Checking Updates");
    this.statusBarItem.text = "$(sync~spin) Checking Rules";
    this.statusBarItem.tooltip = "Checking for AI-Driven Dev Rules updates...";
    this.statusBarItem.backgroundColor = undefined; // Reset background color
  }

  public setUpdatesChecked(success: boolean, details?: string): void {
    this.logger.debug(
      `StatusBar: Setting to Updates Checked (Success: ${success})`,
    );
    if (success) {
      this.statusBarItem.text = "$(check) Rules Checked";
      this.statusBarItem.tooltip =
        `Rule status checked successfully. ${details || ""}`.trim();
      this.statusBarItem.backgroundColor = undefined;
    } else {
      this.statusBarItem.text = "$(error) Check Failed";
      this.statusBarItem.tooltip =
        `Failed to check rule status. ${details || "Click to retry."}`.trim();
      // Use warning color for errors
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground",
      );
    }
    // Optional: Reset to idle after a delay
    // setTimeout(() => this.setIdle(), 5000);
  }

  public setIdle(): void {
    this.logger.debug("StatusBar: Setting to Idle");
    this.statusBarItem.text = "$(sync) Check Rules"; // Use sync icon without spin
    this.statusBarItem.tooltip =
      "Click to check for AI-Driven Dev Rules updates";
    this.statusBarItem.backgroundColor = undefined;
  }

  public dispose(): void {
    this.logger.debug("Disposing StatusBarService");
    this.statusBarItem.dispose();
  }
}
