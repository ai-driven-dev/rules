import * as vscode from "vscode";
import type { IGitHubApiService } from "../../api/github";
import type { GithubRepository } from "../../api/types";
import type { DownloadFile, IDownloadService } from "../../services/download";
import type { IExplorerStateService } from "../../services/explorerStateService"; // Import state service
import type { ILogger } from "../../services/logger";
import type { ISelectionService } from "../../services/selection";
import type { IStorageService } from "../../services/storage";
import { parseRepositoryUrl } from "../../utils/githubUtils";
import type { ExplorerTreeItem } from "./treeItem";
import { ExplorerTreeProvider } from "./treeProvider";

export class ExplorerView {
  public static readonly VIEW_ID = "ai-driven-dev-rules";

  private treeProvider: ExplorerTreeProvider;
  private treeView!: vscode.TreeView<ExplorerTreeItem>;
  private currentRepository: GithubRepository | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly githubService: IGitHubApiService,
    private readonly logger: ILogger,
    private readonly storageService: IStorageService,
    private readonly downloadService: IDownloadService,
    private readonly selectionService: ISelectionService,
    // ExplorerView doesn't directly need the state service, but TreeProvider does.
    // Since TreeProvider is instantiated *here*, we need the state service available.
    // It should ideally be passed in from extension.ts where it's created.
    // Let's assume it's passed in (needs adjustment in extension.ts call).
    private readonly stateService: IExplorerStateService, // Add stateService
  ) {
    // Instantiate TreeProvider with all its required dependencies
    this.treeProvider = new ExplorerTreeProvider(
      githubService,
      logger,
      selectionService, // Pass selection service
      stateService, // Pass state service
      this.context.extensionPath, // Pass extension path for factory
    );

    this.treeView = vscode.window.createTreeView(ExplorerView.VIEW_ID, {
      treeDataProvider: this.treeProvider,
      showCollapseAll: true,
      canSelectMany: false,
    });

    this.restoreLastRepository();

    // No longer call registerCommands here
    // this.registerCommands();

    // Register listeners specific to the TreeView UI elements
    this.registerViewListeners();
  }

  // Removed registerCommands method

  /** Register listeners specific to the TreeView UI elements */
  private registerViewListeners(): void {
    // Register for tree view visibility changes
    this.context.subscriptions.push(
      this.treeView.onDidChangeVisibility((e) => {
        if (e.visible) {
          this.logger.debug("GitHub Explorer view became visible");
        }
      }),
    );

    try {
      const view = this.treeView as any;

      if (typeof view.onDidChangeCheckboxState !== "undefined") {
        this.context.subscriptions.push(
          view.onDidChangeCheckboxState(
            (e: vscode.TreeCheckboxChangeEvent<ExplorerTreeItem>) => {
              for (const [item, state] of e.items) {
                const checked = state === vscode.TreeItemCheckboxState.Checked;

                this.treeProvider.handleCheckboxChange(item, checked);
              }
            },
          ),
        );
      } else {
        this.logger.warn(
          "TreeView checkbox API not available. Using fallback command/icons for selection.",
        );
      }
    } catch (e) {
      this.logger.error(
        "Error setting up checkbox listener, relying on fallback.",
        e,
      );
    }
  }

  /** Restore last repository from storage */
  private async restoreLastRepository(): Promise<void> {
    const lastRepo = this.storageService.getLastRepository();
    if (lastRepo) {
      try {
        await this.setRepository(lastRepo); // Use the public setRepository method
        this.logger.info(
          `Restored last repository: ${lastRepo.owner}/${lastRepo.name}`,
        );
      } catch (error) {
        this.logger.error("Failed to restore last repository", error);
        vscode.window.showErrorMessage(
          `Failed to restore last repository (${lastRepo.owner}/${
            lastRepo.name
          }): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  // --- Public Methods Called by Commands ---

  /** Prompts user to select or enter a repository URL */
  public async promptForRepository(): Promise<void> {
    this.logger.debug("ExplorerView promptForRepository called.");
    // Clear previous selection when changing repository
    this.selectionService.clearSelection();

    const recentRepos = this.storageService.getRecentRepositories();
    const items: (vscode.QuickPickItem & { repo?: GithubRepository })[] = [
      {
        label: "$(repo) Enter repository URL...",
        description: "Specify a GitHub repository URL",
      },
    ];
    for (const repo of recentRepos) {
      items.push({
        label: `$(github) ${repo.owner}/${repo.name}`,
        description: repo.branch ? `Branch: ${repo.branch}` : "Default branch",
        repo,
      });
    }
    const selection = await vscode.window.showQuickPick(items, {
      placeHolder: "Select or enter a GitHub repository",
      matchOnDescription: true,
    });

    if (!selection) {
      return;
    }

    if (selection.repo) {
      try {
        await this.setRepository(selection.repo);
      } catch (error) {
        this.logger.error(
          `Failed to set recent repository: ${selection.repo.owner}/${selection.repo.name}`,
          error,
        );
        vscode.window.showErrorMessage(
          `Failed to load recent repository: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    } else {
      const repoUrl = await vscode.window.showInputBox({
        prompt: "Enter GitHub repository URL",
        placeHolder: "https://github.com/owner/repo",
        value: "https://github.com/ai-driven-dev/rules",
        validateInput: (value) => {
          if (!value) {
            return "Repository URL is required";
          }
          const repo = parseRepositoryUrl(value); // Use the imported function
          if (!repo) {
            return "Invalid GitHub repository URL";
          }
          return null;
        },
      });
      if (!repoUrl) {
        return;
      }
      const repo = parseRepositoryUrl(repoUrl); // Use the imported function
      if (repo) {
        await this.setRepository(repo);
      }
    }
  }

  /** Sets the repository for the view and triggers data loading */
  public async setRepository(repository: GithubRepository): Promise<void> {
    // This method might remain private if only called internally after prompt,
    // or public if a command needs to set it directly. Let's keep it public for flexibility.
    try {
      // Store locally if needed, or rely on stateService via treeProvider
      // this.currentRepository = repository; // Maybe not needed here anymore
      this.treeView.title = `GitHub: ${repository.owner}/${repository.name}${
        repository.branch ? ` (${repository.branch})` : ""
      }`;

      this.selectionService.clearSelection();
      await this.treeProvider.setRepository(repository);
      this.storageService.addRecentRepository(repository);
      vscode.window.showInformationMessage(
        `Connected to GitHub repository: ${repository.owner}/${repository.name}`,
      );
    } catch (error) {
      this.logger.error(
        `Error connecting to repository: ${repository.owner}/${repository.name}`,
        error,
      );
      vscode.window.showErrorMessage(
        `Error connecting to repository: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  /** Refreshes the entire tree view */
  public refreshView(): void {
    this.logger.debug("ExplorerView refreshView called.");
    // Reset state and refresh provider
    this.treeProvider.refresh(); // Let the provider handle state reset via its refresh logic
  }

  /** Handles the toggle selection command */
  public handleToggleSelectionCommand(item: ExplorerTreeItem): void {
    if (item?.content?.path) {
      this.logger.debug(
        `Command aidd.toggleSelection triggered for: ${item.content.path}`,
      );
      // Determine the 'checked' state *after* the toggle would happen
      const isCurrentlySelected = this.selectionService.isSelected(
        item.content.path,
      );
      const targetCheckedState = !isCurrentlySelected;
      // Call the provider's handler, which contains the logic for recursive loading/selection
      // This needs to be async now
      this.treeProvider
        .handleCheckboxChange(item, targetCheckedState)
        .catch((err) => {
          this.logger.error(
            `Error during handleCheckboxChange for ${item.content.path}`,
            err,
          );
          vscode.window.showErrorMessage(
            `Failed to toggle selection: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
    } else {
      this.logger.warn("toggleSelection command called without a valid item.");
    }
  }

  /** Handles the download selected files command */
  public async downloadSelectedFiles(): Promise<void> {
    this.logger.debug("ExplorerView downloadSelectedFiles called.");
    try {
      const selectedPaths = this.selectionService.getSelectedItems();

      if (selectedPaths.length === 0) {
        vscode.window.showInformationMessage(
          "No items selected. Use the checkbox to select files or directories to download.",
        );
        return;
      }

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage(
          "No workspace folder open. Please open a folder to download files.",
        );
        return;
      }
      const workspaceFolder = workspaceFolders[0].uri.fsPath;

      const selectedItems =
        await this.treeProvider.getTreeItemsByPaths(selectedPaths);

      if (!selectedItems || selectedItems.length === 0) {
        vscode.window.showErrorMessage(
          "Could not retrieve details for selected items.",
        );
        this.logger.error("Failed to get TreeItems for selected paths", {
          selectedPaths,
        });
        return;
      }

      // Map selected items to DownloadFile objects.
      // We no longer rely on download_url here; DownloadService will fetch content using the path.
      const itemsToProcess: DownloadFile[] = selectedItems
        .map((item): DownloadFile | null => {
          // Check if item and item.content exist and have necessary properties
          if (!item?.content?.path || !item.content.type) {
            this.logger.warn(
              `Skipping invalid selected item in download mapping: ${JSON.stringify(item)}`,
            );
            return null;
          }

          // Process only files and directories
          if (item.content.type === "file" || item.content.type === "dir") {
            return {
              // url: "", // URL is no longer provided here. DownloadService will fetch it.
              targetPath: item.content.path, // Path relative to repo root
              type: item.content.type,
              size: item.content.size, // Optional size info
            };
          }
          // Ignore any other unexpected types
          this.logger.warn(
            `Skipping item with unexpected type '${item.content.type}': ${item.content.path}`,
          );
          return null;
        })
        .filter((item): item is DownloadFile => item !== null); // Filter out nulls

      if (itemsToProcess.length === 0) {
        vscode.window.showInformationMessage(
          "No downloadable files or directories selected, or failed to retrieve item details.",
        );
        return;
      }

      // Get the current repository information from the tree provider
      const currentRepo = this.treeProvider.getCurrentRepository();
      if (!currentRepo) {
        vscode.window.showErrorMessage(
          "No repository is currently loaded. Cannot download files.",
        );
        this.logger.error(
          "downloadSelectedFiles called but no repository is set in TreeProvider.",
        );
        return;
      }

      // Pass the complete list (files and dirs) and repository info to the download service
      const results = await this.downloadService.downloadFiles(
        itemsToProcess,
        workspaceFolder,
        currentRepo, // Pass the repository object
      );

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (failCount === 0) {
        vscode.window.showInformationMessage(
          `Successfully downloaded ${successCount} items.`,
        );
      } else {
        vscode.window.showWarningMessage(
          `Downloaded ${successCount} items with ${failCount} errors. Check the output log for details.`,
        );
      }
    } catch (error) {
      this.logger.error("Error downloading files", error);
      vscode.window.showErrorMessage(
        `Error downloading files: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
