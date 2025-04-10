import * as vscode from "vscode";
import { IGitHubApiService } from "../../api/github";
import { GithubRepository } from "../../api/types";
import { DownloadFile, IDownloadService } from "../../services/download";
import { ILogger } from "../../services/logger";
import { IStorageService } from "../../services/storage";
import { ExplorerTreeItem } from "./treeItem";
import { ExplorerTreeProvider } from "./treeProvider";

/**
 * Explorer view for GitHub repositories
 */
export class ExplorerView {
  public static readonly VIEW_ID = "ai-driven-dev-rules";

  private treeProvider: ExplorerTreeProvider;
  private treeView: vscode.TreeView<ExplorerTreeItem>;
  private currentRepository: GithubRepository | null = null;

  /**
   * Create an explorer view
   * @param context Extension context
   * @param githubService GitHub API service
   * @param logger Logger service
   * @param storageService Storage service
   * @param downloadService Download service
   */
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly githubService: IGitHubApiService,
    private readonly logger: ILogger,
    private readonly storageService: IStorageService,
    private readonly downloadService: IDownloadService
  ) {
    // Create tree provider
    this.treeProvider = new ExplorerTreeProvider(githubService, logger);

    // Create tree view
    this.treeView = vscode.window.createTreeView(ExplorerView.VIEW_ID, {
      treeDataProvider: this.treeProvider,
      showCollapseAll: true,
      canSelectMany: false,
    });

    // Restore last repository if available
    this.restoreLastRepository();

    // Register commands
    this.registerCommands();
  }

  /**
   * Register commands
   */
  private registerCommands(): void {
    // Command to set repository
    this.context.subscriptions.push(
      vscode.commands.registerCommand("aidd.setRepository", () => {
        this.promptForRepository();
      })
    );

    // Command to refresh view
    this.context.subscriptions.push(
      vscode.commands.registerCommand("aidd.refresh", () => {
        this.refreshView();
      })
    );

    // Command to toggle selection
    this.context.subscriptions.push(
      vscode.commands.registerCommand(
        "aidd.toggleSelection",
        (item: ExplorerTreeItem) => {
          this.toggleItemSelection(item);
        }
      )
    );

    // Command to download selected files
    this.context.subscriptions.push(
      vscode.commands.registerCommand("aidd.downloadSelected", () => {
        this.downloadSelectedFiles();
      })
    );

    // Register for tree view visibility changes
    this.context.subscriptions.push(
      this.treeView.onDidChangeVisibility((e) => {
        if (e.visible) {
          // View became visible
          this.logger.debug("GitHub Explorer view became visible");
        }
      })
    );

    // Register for tree checkbox changes
    try {
      // Try to access the checkbox change event if available (VS Code 1.72+)
      // This is a type assertion to access the experimental API
      const view = this.treeView as any;

      if (typeof view.onDidChangeCheckboxState !== "undefined") {
        this.context.subscriptions.push(
          view.onDidChangeCheckboxState(
            (e: vscode.TreeCheckboxChangeEvent<ExplorerTreeItem>) => {
              for (const [item, state] of e.items) {
                const checked = state === vscode.TreeItemCheckboxState.Checked;
                this.treeProvider.handleCheckboxChange(item, checked);
              }
            }
          )
        );
      }
    } catch (e) {
      // Checkbox API not available, fallback to toggle command
      this.logger.debug("TreeView checkbox API not available");
    }
  }

  /**
   * Restore last repository from storage
   */
  private async restoreLastRepository(): Promise<void> {
    const lastRepo = this.storageService.getLastRepository();

    if (lastRepo) {
      try {
        await this.setRepository(lastRepo);
        this.logger.info(
          `Restored last repository: ${lastRepo.owner}/${lastRepo.name}`
        );
      } catch (error) {
        this.logger.error("Failed to restore last repository", error);
      }
    }
  }

  /**
   * Prompt user for repository URL
   */
  private async promptForRepository(): Promise<void> {
    // Show list of recent repositories
    const recentRepos = this.storageService.getRecentRepositories();

    // Quick pick options
    const items: (vscode.QuickPickItem & { repo?: GithubRepository })[] = [
      {
        label: "$(repo) Enter repository URL...",
        description: "Specify a GitHub repository URL",
      },
    ];

    // Add recent repositories
    for (const repo of recentRepos) {
      items.push({
        label: `$(github) ${repo.owner}/${repo.name}`,
        description: repo.branch ? `Branch: ${repo.branch}` : "Default branch",
        repo,
      });
    }

    // Show quick pick
    const selection = await vscode.window.showQuickPick(items, {
      placeHolder: "Select or enter a GitHub repository",
      matchOnDescription: true,
    });

    if (!selection) {
      return;
    }

    if (selection.repo) {
      // Selected a recent repository
      await this.setRepository(selection.repo);
    } else {
      // Enter URL manually
      const repoUrl = await vscode.window.showInputBox({
        prompt: "Enter GitHub repository URL",
        placeHolder: "https://github.com/owner/repo",
        value: "https://github.com/ai-driven-dev/rules",
        validateInput: (value) => {
          if (!value) {
            return "Repository URL is required";
          }

          const repo = this.githubService.parseRepositoryUrl(value);
          if (!repo) {
            return "Invalid GitHub repository URL";
          }

          return null;
        },
      });

      if (!repoUrl) {
        return;
      }

      const repo = this.githubService.parseRepositoryUrl(repoUrl);
      if (repo) {
        await this.setRepository(repo);
      }
    }
  }

  /**
   * Set repository to display
   * @param repository Repository to display
   */
  private async setRepository(repository: GithubRepository): Promise<void> {
    try {
      this.currentRepository = repository;

      // Update tree view title
      this.treeView.title = `GitHub: ${repository.owner}/${repository.name}${
        repository.branch ? ` (${repository.branch})` : ""
      }`;

      // Update repository in tree provider
      await this.treeProvider.setRepository(repository);

      // Add to recent repositories
      this.storageService.addRecentRepository(repository);

      // Show information message
      vscode.window.showInformationMessage(
        `Connected to GitHub repository: ${repository.owner}/${repository.name}`
      );
    } catch (error) {
      this.logger.error(
        `Error connecting to repository: ${repository.owner}/${repository.name}`,
        error
      );
      vscode.window.showErrorMessage(
        `Error connecting to repository: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Refresh the view
   */
  private refreshView(): void {
    this.treeProvider.refresh();
  }

  /**
   * Toggle item selection
   * @param item Item to toggle
   */
  private toggleItemSelection(item: ExplorerTreeItem): void {
    // Toggle selection
    item.toggleSelection();

    // Update children if it's a directory
    if (item.content.type === "dir") {
      item.updateChildrenSelection(item.selected);
    }

    // Update parent selection state
    item.updateParentSelection();

    // Refresh the item in the tree
    this.treeProvider.refresh(item);
  }

  /**
   * Download selected files
   */
  private async downloadSelectedFiles(): Promise<void> {
    try {
      const selectedItems = this.treeProvider.getSelectedItems();

      if (selectedItems.length === 0) {
        vscode.window.showInformationMessage(
          "No files selected. Use the checkbox to select files to download."
        );
        return;
      }

      // Get workspace folder
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage(
          "No workspace folder open. Please open a folder to download files."
        );
        return;
      }

      const workspaceFolder = workspaceFolders[0].uri.fsPath;

      // Prepare files for download
      const files: DownloadFile[] = selectedItems.map((item) => ({
        url: item.content.download_url || "",
        targetPath: item.content.path,
        type: item.content.type === "file" ? "file" : "dir",
        size: item.content.size,
      }));

      // Filter out files without download URL
      const validFiles = files.filter(
        (file) => file.type === "dir" || file.url
      );

      if (validFiles.filter((f) => f.type === "file").length === 0) {
        vscode.window.showInformationMessage(
          "No files selected for download, only directories."
        );
        return;
      }

      // Download files
      const results = await this.downloadService.downloadFiles(
        validFiles,
        workspaceFolder
      );

      // Count successful downloads
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (failCount === 0) {
        vscode.window.showInformationMessage(
          `Successfully downloaded ${successCount} items.`
        );
      } else {
        vscode.window.showWarningMessage(
          `Downloaded ${successCount} items with ${failCount} errors. Check the output log for details.`
        );
      }
    } catch (error) {
      this.logger.error("Error downloading files", error);
      vscode.window.showErrorMessage(
        `Error downloading files: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
