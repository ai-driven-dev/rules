import * as vscode from "vscode";
import type { IGitHubApiService } from "../api/github";
import type { IDownloadService } from "../services/download";
import type { ILogger } from "../services/logger";
import type { IStorageService } from "../services/storage";
import type { ExplorerView } from "../views/explorer/explorerView";
import type { ExplorerTreeItem } from "../views/explorer/treeItem";

interface CommandDependencies {
  context: vscode.ExtensionContext;
  explorerView: ExplorerView;
  githubService: IGitHubApiService;
  logger: ILogger;
  storageService: IStorageService;
  downloadService: IDownloadService;
}

export function registerCommands(dependencies: CommandDependencies): void {
  const { context, explorerView, logger, storageService, downloadService } =
    dependencies;

  context.subscriptions.push(
    vscode.commands.registerCommand("aidd.setRepository", () => {
      explorerView.promptForRepository();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aidd.refresh", () => {
      explorerView.refreshView();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aidd.toggleSelection",
      (item: ExplorerTreeItem) => {
        explorerView.handleToggleSelectionCommand(item);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aidd.downloadSelected", () => {
      explorerView.downloadSelectedFiles();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aidd.showSettings", async () => {
      logger.debug("Show settings command executed");

      const settings = storageService.getSettings();

      const items: vscode.QuickPickItem[] = [
        {
          label: `$(info) Maximum Recent Repositories: ${settings.maxRecentRepositories}`,
          description: "Number of recent repositories to remember",
          detail: "Click to change",
        },
        {
          label: `$(info) Maximum Concurrent Downloads: ${settings.maxConcurrentDownloads}`,
          description: "Number of files to download simultaneously",
          detail: "Click to change",
        },
        {
          label: `$(info) Show Welcome On Startup: ${
            settings.showWelcomeOnStartup ? "Yes" : "No"
          }`,
          description: "Whether to show the welcome view on startup",
          detail: "Click to toggle",
        },
      ];

      if (settings.autoRefreshInterval) {
        items.push({
          label: `$(info) Auto Refresh: Every ${settings.autoRefreshInterval} seconds`,
          description: "Automatically refresh the repository list",
          detail: "Click to change or disable",
        });
      } else {
        items.push({
          label: "$(info) Auto Refresh: Disabled",
          description: "Automatically refresh the repository list",
          detail: "Click to enable",
        });
      }

      const selectedItem = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a setting to change",
      });

      if (!selectedItem) {
        return;
      }

      if (selectedItem.label.includes("Maximum Recent Repositories")) {
        const value = await vscode.window.showInputBox({
          prompt: "Enter maximum number of recent repositories",
          value: String(settings.maxRecentRepositories),
          validateInput: (value) => {
            const number = Number.parseInt(value, 10);
            if (Number.isNaN(number) || number < 1) {
              return "Must be a positive number";
            }
            return null;
          },
        });
        if (value) {
          storageService.updateSettings({
            maxRecentRepositories: Number.parseInt(value, 10),
          });
        }
      } else if (selectedItem.label.includes("Maximum Concurrent Downloads")) {
        const value = await vscode.window.showInputBox({
          prompt: "Enter maximum number of concurrent downloads",
          value: String(settings.maxConcurrentDownloads),
          validateInput: (value) => {
            const number = Number.parseInt(value, 10);
            if (Number.isNaN(number) || number < 1) {
              return "Must be a positive number";
            }
            return null;
          },
        });
        if (value) {
          const newMax = Number.parseInt(value, 10);
          storageService.updateSettings({ maxConcurrentDownloads: newMax });

          downloadService.updateSettings({
            ...settings,
            maxConcurrentDownloads: newMax,
          });
        }
      } else if (selectedItem.label.includes("Show Welcome On Startup")) {
        storageService.updateSettings({
          showWelcomeOnStartup: !settings.showWelcomeOnStartup,
        });
      } else if (selectedItem.label.includes("Auto Refresh")) {
        if (settings.autoRefreshInterval) {
          storageService.updateSettings({ autoRefreshInterval: undefined });
        } else {
          const value = await vscode.window.showInputBox({
            prompt: "Enter refresh interval in seconds",
            value: "60",
            validateInput: (value) => {
              const number = Number.parseInt(value, 10);
              if (Number.isNaN(number) || number < 10) {
                return "Must be at least 10 seconds";
              }
              return null;
            },
          });
          if (value) {
            storageService.updateSettings({
              autoRefreshInterval: Number.parseInt(value, 10),
            });
          }
        }

        vscode.window.showInformationMessage(
          "Auto-refresh setting updated. Restart VS Code for changes to take full effect if needed.",
        );
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aidd.clearStorage", async () => {
      logger.debug("Clear storage command executed");
      const confirm = await vscode.window.showWarningMessage(
        "This will clear all GitHub Explorer storage, including recent repositories and settings. Are you sure?",
        { modal: true },
        "Yes",
      );
      if (confirm === "Yes") {
        storageService.clearStorage();
        vscode.window.showInformationMessage(
          "GitHub Explorer storage has been cleared.",
        );

        vscode.commands.executeCommand("aidd.refresh");
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aidd.showOutput", () => {
      logger.show();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aidd.openSettings", () => {
      logger.debug("Open settings command executed");
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "@ext:ai-driven-dev-rules aidd.",
      );
    }),
  );
}
