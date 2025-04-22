import * as vscode from "vscode";
import type { IGitHubApiService } from "../api/github";
import type { GithubRepository } from "../api/types";
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
  // Removed updatesTreeProvider from dependencies
}

export function registerCommands(dependencies: CommandDependencies): void {
  const { context, explorerView, logger, storageService } = dependencies; // Removed updatesTreeProvider from destructuring

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aidd.setRepository",
      (repository?: GithubRepository) => {
        if (repository) {
          explorerView.setRepository(repository).catch((error) => {
            logger.error("Error setting repository directly", error);

            vscode.window.showErrorMessage(
              `Error setting repository: ${error instanceof Error ? error.message : String(error)}`,
            );
          });
        } else {
          explorerView.promptForRepository();
        }
      },
    ), // Close the first push call correctly
  ); // End of the first push call

  // Keep the original setRepository registration.
  // ExplorerView.setRepository will be modified to handle updating UpdatesTreeProvider.

  context.subscriptions.push(
    vscode.commands.registerCommand("aidd.refresh", () => {
      explorerView.refreshView();
      // Keep refresh separate for now. User uses the specific refresh status button for updates.
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
    vscode.commands.registerCommand("aidd.clearStorage", async () => {
      logger.debug("Clear storage command executed");
      const confirm = await vscode.window.showWarningMessage(
        "This will clear all AI-Driven Dev Rules storage, including recent repositories and settings. Are you sure?",
        { modal: true },
        "Yes",
      );
      if (confirm === "Yes") {
        storageService.clearStorage();
        vscode.window.showInformationMessage(
          "AI-Driven Dev Rules storage has been cleared.",
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

  // Register the new command to check for rule updates
  context.subscriptions.push(
    vscode.commands.registerCommand("aidd.refreshRuleStatus", () => {
      logger.debug("Refresh rule status command executed");
      // Only refresh the main explorer view (which now handles status)
      explorerView.treeProvider.refreshAndUpdateStatus().catch((error) => {
        logger.error("Error executing refreshRuleStatus command", error);
        // Error is handled and shown by the method itself
      });
    }),
  );
}
