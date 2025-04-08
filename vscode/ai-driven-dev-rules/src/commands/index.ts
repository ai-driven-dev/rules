import * as vscode from "vscode";
import { IGitHubApiService } from "../api/github";
import { IDownloadService } from "../services/download";
import { ILogger } from "../services/logger";
import { IStorageService } from "../services/storage";
import { ExplorerView } from "../views/explorer/explorerView";

/**
 * Register all commands for the extension
 * @param context Extension context
 * @param explorerView Explorer view
 * @param githubService GitHub API service
 * @param logger Logger service
 * @param storageService Storage service
 * @param downloadService Download service
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  explorerView: ExplorerView,
  githubService: IGitHubApiService,
  logger: ILogger,
  storageService: IStorageService,
  downloadService: IDownloadService
): void {
  // Command to show settings
  context.subscriptions.push(
    vscode.commands.registerCommand("githubExplorer.showSettings", async () => {
      logger.debug("Show settings command executed");

      // Show settings in quick pick
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

      // Handle selection
      if (selectedItem.label.includes("Maximum Recent Repositories")) {
        const value = await vscode.window.showInputBox({
          prompt: "Enter maximum number of recent repositories",
          value: String(settings.maxRecentRepositories),
          validateInput: (value) => {
            const number = parseInt(value, 10);
            if (isNaN(number) || number < 1) {
              return "Must be a positive number";
            }
            return null;
          },
        });

        if (value) {
          storageService.updateSettings({
            maxRecentRepositories: parseInt(value, 10),
          });
        }
      } else if (selectedItem.label.includes("Maximum Concurrent Downloads")) {
        const value = await vscode.window.showInputBox({
          prompt: "Enter maximum number of concurrent downloads",
          value: String(settings.maxConcurrentDownloads),
          validateInput: (value) => {
            const number = parseInt(value, 10);
            if (isNaN(number) || number < 1) {
              return "Must be a positive number";
            }
            return null;
          },
        });

        if (value) {
          storageService.updateSettings({
            maxConcurrentDownloads: parseInt(value, 10),
          });

          // Update download service settings
          downloadService.updateSettings(storageService.getSettings());
        }
      } else if (selectedItem.label.includes("Show Welcome On Startup")) {
        storageService.updateSettings({
          showWelcomeOnStartup: !settings.showWelcomeOnStartup,
        });
      } else if (selectedItem.label.includes("Auto Refresh")) {
        if (settings.autoRefreshInterval) {
          // Toggle off
          storageService.updateSettings({
            autoRefreshInterval: undefined,
          });
        } else {
          // Toggle on
          const value = await vscode.window.showInputBox({
            prompt: "Enter refresh interval in seconds",
            value: "60",
            validateInput: (value) => {
              const number = parseInt(value, 10);
              if (isNaN(number) || number < 10) {
                return "Must be at least 10 seconds";
              }
              return null;
            },
          });

          if (value) {
            storageService.updateSettings({
              autoRefreshInterval: parseInt(value, 10),
            });
          }
        }
      }
    })
  );

  // Command to clear all storage
  context.subscriptions.push(
    vscode.commands.registerCommand("githubExplorer.clearStorage", async () => {
      logger.debug("Clear storage command executed");

      const confirm = await vscode.window.showWarningMessage(
        "This will clear all GitHub Explorer storage, including recent repositories and settings. Are you sure?",
        { modal: true },
        "Yes"
      );

      if (confirm === "Yes") {
        storageService.clearStorage();
        vscode.window.showInformationMessage(
          "GitHub Explorer storage has been cleared."
        );
      }
    })
  );

  // Command to show output channel
  context.subscriptions.push(
    vscode.commands.registerCommand("githubExplorer.showOutput", () => {
      logger.show();
    })
  );
}
