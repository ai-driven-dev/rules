import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import type { ExplorerTreeItem } from "../views/explorer/treeItem";
import { DownloadService } from "../services/download";
import type { ILogger } from "../services/logger";
import type { Settings } from "../services/storage";

export class FileSystemService {
  private static instance: FileSystemService;
  private outputChannel: vscode.OutputChannel;
  private downloadCount = 0;
  private downloadService: DownloadService;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel(
      "GitHub Explorer File System",
    );
    // For demo, create with dummy logger/settings. In real use, inject these!
    this.downloadService = new DownloadService(
      {
        debug: (msg: string) => this.log(msg),
        info: (msg: string) => this.log(msg),
        warn: (msg: string) => this.log(msg),
        error: (msg: string, err?: any) => this.logError(msg, err),
        log: (msg: string) => this.log(msg),
        show: () => this.outputChannel.show(),
        dispose: () => this.outputChannel.dispose(),
      } as ILogger,
      {} as Settings,
      {} as any // IGitHubApiService stub
    );
  }

  public static getInstance(): FileSystemService {
    if (!FileSystemService.instance) {
      FileSystemService.instance = new FileSystemService();
    }
    return FileSystemService.instance;
  }

  public async downloadFiles(items: ExplorerTreeItem[]): Promise<void> {
    if (items.length === 0) {
      vscode.window.showInformationMessage("No files selected for download");
      return;
    }

    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage(
        "No workspace folder open. Please open a folder to download files.",
      );
      return;
    }

    this.downloadCount = 0;

    // --- REFACTOR: Prepare file list for DownloadService ---
    const filesToDownload = this.flattenItems(items);
    try {
      await this.downloadService.downloadFiles(
        filesToDownload,
        workspaceFolder,
        {} as any // GithubRepository stub, adapt as needed
      );
      vscode.window.showInformationMessage(
        `Successfully downloaded ${filesToDownload.length} files`,
      );
    } catch (error) {
      this.logError("Error downloading files", error);
      vscode.window.showErrorMessage(
        `Error downloading files: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // --- Utility to flatten ExplorerTreeItem tree to DownloadFile[] ---
  private flattenItems(items: ExplorerTreeItem[]): any[] {
    const result: any[] = [];
    const walk = (item: ExplorerTreeItem) => {
      if (item.content.type === "file") {
        result.push({
          url: item.content.download_url,
          targetPath: item.content.path,
          type: "file",
          size: item.content.size,
        });
      } else if (item.content.type === "dir") {
        result.push({
          targetPath: item.content.path,
          type: "dir",
        });
        for (const child of item.children) {
          walk(child);
        }
      }
    };
    for (const item of items) walk(item);
    return result;
  }

  private getWorkspaceFolder(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return undefined;
    }
    return workspaceFolders[0].uri.fsPath;
  }

  // --- Make countFiles public for testing and orchestration ---
  public countFiles(items: ExplorerTreeItem[]): number {
    let count = 0;
    for (const item of items) {
      if (item.content.type === "file") {
        count++;
      } else if (item.content.type === "dir") {
        count += this.countFiles(item.children);
      }
    }
    return count;
  }

  private log(message: string): void {
    this.outputChannel.appendLine(
      `[${new Date().toLocaleTimeString()}] ${message}`,
    );
  }

  private logError(message: string, error: any): void {
    this.outputChannel.appendLine(
      `[${new Date().toLocaleTimeString()}] ERROR: ${message}`,
    );
    if (error instanceof Error) {
      this.outputChannel.appendLine(`${error.message}`);
      if (error.stack) {
        this.outputChannel.appendLine(error.stack);
      }
    } else if (typeof error === "object") {
      this.outputChannel.appendLine(JSON.stringify(error, null, 2));
    } else {
      this.outputChannel.appendLine(String(error));
    }
  }
}
