import * as vscode from "vscode";
import { IGitHubApiService } from "../../api/github";
import { GithubRepository } from "../../api/types";
import { DownloadFile, IDownloadService } from "../../services/download";
import { ILogger } from "../../services/logger";
import { ISelectionService } from "../../services/selection"; // Import ISelectionService
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
   * @param selectionService Selection service
   */
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly githubService: IGitHubApiService,
    private readonly logger: ILogger,
    private readonly storageService: IStorageService,
    private readonly downloadService: IDownloadService,
    private readonly selectionService: ISelectionService // Add selectionService parameter
  ) {
    // Create tree provider
    this.treeProvider = new ExplorerTreeProvider(
      githubService,
      logger,
      this.context.extensionPath,
      selectionService // Pass selectionService to TreeProvider constructor
    );

    // Create tree view
    this.treeView = vscode.window.createTreeView(ExplorerView.VIEW_ID, {
      treeDataProvider: this.treeProvider,
      showCollapseAll: true,
      canSelectMany: false, // Keep false as service handles multi-select logic
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

    // Command to toggle selection (Always register for context menu and fallback)
    this.context.subscriptions.push(
      vscode.commands.registerCommand(
        "aidd.toggleSelection",
        (item: ExplorerTreeItem) => {
          // Use the service directly
          if (item?.content?.path) {
            this.selectionService.toggleSelection(item.content.path);
            // Refresh is handled by the service event listener in the provider
          } else {
            this.logger.warn("toggleSelection called without a valid item.");
          }
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
                // Delegate checkbox handling entirely to the provider
                this.treeProvider.handleCheckboxChange(item, checked);
              }
            }
          )
        );
      } else {
         // Fallback if checkbox API not available (e.g., older VS Code)
         // The command is already registered unconditionally above.
         this.logger.warn("TreeView checkbox API not available. Using fallback command/icons for selection.");
      }
    } catch (e) {
      // Checkbox API detection failed, rely on fallback command/icons
      this.logger.error("Error setting up checkbox listener, relying on fallback.", e);
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
         vscode.window.showErrorMessage(
           `Failed to restore last repository (${lastRepo.owner}/${
             lastRepo.name
           }): ${error instanceof Error ? error.message : String(error)}`
         );
       }
     }
  }

  /**
   * Prompt user for repository URL
   */
  private async promptForRepository(): Promise<void> {
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

    if (!selection) {return;}

    if (selection.repo) {
      try {
        await this.setRepository(selection.repo);
      } catch (error) {
        this.logger.error(
          `Failed to set recent repository: ${selection.repo.owner}/${selection.repo.name}`,
          error
        );
        vscode.window.showErrorMessage(
          `Failed to load recent repository: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } else {
      const repoUrl = await vscode.window.showInputBox({
        prompt: "Enter GitHub repository URL",
        placeHolder: "https://github.com/owner/repo",
        value: "https://github.com/ai-driven-dev/rules",
        validateInput: (value) => {
          if (!value) {return "Repository URL is required";}
          const repo = this.githubService.parseRepositoryUrl(value);
          if (!repo) {return "Invalid GitHub repository URL";}
          return null;
        },
      });
      if (!repoUrl) {return;}
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
      this.treeView.title = `GitHub: ${repository.owner}/${repository.name}${
        repository.branch ? ` (${repository.branch})` : ""
      }`;
      // Clear selection when setting a new repository
      this.selectionService.clearSelection();
      await this.treeProvider.setRepository(repository);
      this.storageService.addRecentRepository(repository);
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
    // Clear selection on manual refresh? Maybe not desirable.
    // this.selectionService.clearSelection();
    this.treeProvider.refresh();
  }

  // REMOVED - Selection is handled by the provider/service now
  // /**
  //  * Toggle item selection
  //  * @param item Item to toggle
  //  */
  // private toggleItemSelection(item: ExplorerTreeItem): void {
  //   // Delegate to service
  //   this.selectionService.toggleSelection(item.content.path);
  //   // Refresh is triggered by the service event listener in the provider
  // }

  /**
   * Download selected files
   */
  private async downloadSelectedFiles(): Promise<void> {
    try {
      // Get selected paths from the service
      const selectedPaths = this.selectionService.getSelectedItems();

      if (selectedPaths.length === 0) {
        vscode.window.showInformationMessage(
          "No items selected. Use the checkbox to select files or directories to download."
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

      // We need the full item details (type, url) for the download service.
      // The TreeProvider needs a way to map paths back to items or fetch details.
      // Let's modify TreeProvider to provide this mapping or the items directly.
      // For now, let's assume TreeProvider has a method `getTreeItemsByPaths(paths: string[])`
      const selectedItems = await this.treeProvider.getTreeItemsByPaths(selectedPaths);

      if (!selectedItems || selectedItems.length === 0) {
         vscode.window.showErrorMessage("Could not retrieve details for selected items.");
         this.logger.error("Failed to get TreeItems for selected paths", { selectedPaths });
         return;
      }


      // Prepare files for download using the retrieved items
      const files: DownloadFile[] = selectedItems.map((item) => ({
        url: item.content.download_url || "",
        targetPath: item.content.path,
        type: item.content.type === "file" ? "file" : "dir",
        size: item.content.size,
      }));

      // Filter out files without download URL (directories are kept)
      const validFiles = files.filter(
        (file) => file.type === "dir" || file.url
      );

      // Check if there are any actual files to download
      const filesToDownload = validFiles.filter((f) => f.type === "file");
      if (filesToDownload.length === 0 && validFiles.some(f => f.type === 'dir')) {
         // Only directories selected - we might want to fetch their contents recursively later
         // For now, inform the user.
         vscode.window.showInformationMessage(
           "Only directories selected. Downloading individual files within selected directories is not yet supported. Please select specific files."
         );
         return;
       } else if (filesToDownload.length === 0) {
         // No files and no directories (e.g., selection cleared between click and execution)
         vscode.window.showInformationMessage(
           "No downloadable files selected."
         );
         return;
       }


      // Download files
      const results = await this.downloadService.downloadFiles(
        validFiles, // Pass directories as well, service handles creation
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
