import * as vscode from "vscode";
import type { IGitHubApiService } from "../../api/github";
import type { GithubRepository } from "../../api/types";
import type { DownloadFile, IDownloadService } from "../../services/download";
import type { IExplorerStateService } from "../../services/explorerStateService";
import type { ILogger } from "../../services/logger";
import type { ISelectionService } from "../../services/selection";
import type { IStatusBarService } from "../../services/statusBarService";
import type { IStorageService } from "../../services/storage";
import type { IUpdateCheckService } from "../../services/updateCheckService";
// Removed import for UpdatesTreeProvider
import { parseRepositoryUrl } from "../../utils/githubUtils";
import type { ExplorerTreeItem } from "./treeItem";
import { ExplorerTreeProvider } from "./treeProvider";

export class ExplorerView {
  public static readonly VIEW_ID = "ai-driven-dev-rules";

  public readonly treeProvider: ExplorerTreeProvider; // Make public to access from extension.ts
  private treeView!: vscode.TreeView<ExplorerTreeItem>;
  private currentRepository: GithubRepository | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly githubService: IGitHubApiService,
    private readonly logger: ILogger,
    private readonly storageService: IStorageService,
    private readonly downloadService: IDownloadService,
    private readonly selectionService: ISelectionService,
    private readonly stateService: IExplorerStateService,
    private readonly updateCheckService: IUpdateCheckService,
    private readonly statusBarService: IStatusBarService,
    // Removed updatesTreeProvider from constructor params
  ) {
    this.treeProvider = new ExplorerTreeProvider(
      githubService,
      logger,
      selectionService,
      stateService,
      updateCheckService,
      statusBarService, // Pass StatusBarService
      context,
      this.context.extensionPath,
    );
    // Store the provider passed from extension.ts
    // this.updatesTreeProvider = updatesTreeProvider; // Already done via constructor param

    this.treeView = vscode.window.createTreeView(ExplorerView.VIEW_ID, {
      treeDataProvider: this.treeProvider,
      showCollapseAll: true,
      canSelectMany: false,
    });

    this.restoreLastRepository();

    this.registerViewListeners();
  }

  /** Register listeners specific to the TreeView UI elements */
  private registerViewListeners(): void {
    this.context.subscriptions.push(
      this.treeView.onDidChangeVisibility((e) => {
        if (e.visible) {
          this.logger.debug("AI-Driven Dev Rules view became visible");
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
        await this.setRepository(lastRepo);
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

  /** Prompts user to select or enter a repository URL */
  public async promptForRepository(): Promise<void> {
    this.logger.debug("ExplorerView promptForRepository called.");

    this.selectionService.clearSelection();

    const featuredRepo: GithubRepository = {
      owner: "ai-driven-dev",
      name: "rules",
      branch: "",
    };
    const featuredRepoId = `${featuredRepo.owner}/${featuredRepo.name}`;

    const storedRepos = this.storageService.getRecentRepositories();
    const items: (vscode.QuickPickItem & { repo?: GithubRepository })[] = [
      {
        label: "$(repo) Enter repository URL...",
        description: "Specify a GitHub repository URL",
      },

      {
        label: `$(star-full) ${featuredRepo.owner}/${featuredRepo.name}`,
        description: "Featured repository",
        repo: featuredRepo,
      },
    ];

    for (const repo of storedRepos) {
      const repoId = `${repo.owner}/${repo.name}`;
      if (repoId !== featuredRepoId) {
        items.push({
          label: `$(history) ${repo.owner}/${repo.name}`,
          description: repo.branch
            ? `Branch: ${repo.branch}`
            : "Default branch",
          repo,
        });
      }
    }

    const selection = await vscode.window.showQuickPick(items, {
      placeHolder: "Select a featured or recent repository, or enter a URL",
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
          const repo = parseRepositoryUrl(value);
          if (!repo) {
            return "Invalid GitHub repository URL";
          }
          return null;
        },
      });
      if (!repoUrl) {
        return;
      }
      const repo = parseRepositoryUrl(repoUrl);
      if (repo) {
        await this.setRepository(repo);
      }
    }
  }

  /** Sets the repository for the view and triggers data loading */
  public async setRepository(repository: GithubRepository): Promise<void> {
    try {
      this.treeView.title = `GitHub: ${repository.owner}/${repository.name}${
        repository.branch ? ` (${repository.branch})` : ""
      }`;

      this.selectionService.clearSelection();
      await this.treeProvider.setRepository(repository);
      this.storageService.addRecentRepository(repository);
      // Removed call to updatesTreeProvider.setCurrentRepository
      vscode.window.showInformationMessage(
        `Connected to GitHub repository: ${repository.owner}/${repository.name}`,
      );
      // Optionally trigger initial status check after setting repo
      // vscode.commands.executeCommand("aidd.refreshRuleStatus");

      vscode.commands.executeCommand(`${ExplorerView.VIEW_ID}.focus`);
    } catch (error) {
      // Removed call to updatesTreeProvider.setCurrentRepository
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

    this.treeProvider.refresh();
  }

  /** Handles the toggle selection command */
  public handleToggleSelectionCommand(item: ExplorerTreeItem): void {
    if (item?.content?.path) {
      this.logger.debug(
        `Command aidd.toggleSelection triggered for: ${item.content.path}`,
      );

      const isCurrentlySelected = this.selectionService.isSelected(
        item.content.path,
      );
      const targetCheckedState = !isCurrentlySelected;

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

      const itemsToProcess: DownloadFile[] = selectedItems
        .map((item): DownloadFile | null => {
          if (!item?.content?.path || !item.content.type) {
            this.logger.warn(
              `Skipping invalid selected item in download mapping: ${JSON.stringify(
                item,
              )}`,
            );
            return null;
          }

          if (item.content.type === "dir") {
            return {
              targetPath: item.content.path,
              type: "dir",
            };
          }
          if (item.content.type === "file") {
            return {
              targetPath: item.content.path,
              type: "file",
              size: item.content.size,
              sha: item.content.sha, // Add the SHA property here

              downloadUrl: item.content.download_url,
              base64Content: item.content.content,
            };
          }

          this.logger.warn(
            `Skipping item with unexpected type '${item.content.type}': ${item.content.path}`,
          );
          return null;
        })
        .filter((item): item is DownloadFile => item !== null);

      if (itemsToProcess.length === 0) {
        vscode.window.showInformationMessage(
          "No downloadable files or directories selected, or failed to retrieve item details.",
        );
        return;
      }

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

      const results = await this.downloadService.downloadFiles(
        itemsToProcess,
        workspaceFolder,
        currentRepo,
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
