import * as vscode from "vscode";
import { IGitHubApiService } from "../../api/github";
import { GithubRepository } from "../../api/types";
import { DownloadFile, IDownloadService } from "../../services/download";
import { ILogger } from "../../services/logger";
import { ISelectionService, SelectionService } from "../../services/selection";
import { IStorageService } from "../../services/storage";
import { ExplorerTreeItem } from "./treeItem";
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
    private readonly selectionService: ISelectionService
  ) {

    this.treeProvider = new ExplorerTreeProvider(
      githubService,
      logger,
      this.context.extensionPath,
      selectionService
    );



    this.treeView = vscode.window.createTreeView(ExplorerView.VIEW_ID, {
      treeDataProvider: this.treeProvider,
      showCollapseAll: true,
      canSelectMany: false,
    });


    this.restoreLastRepository();


    this.registerCommands();
  }


  private registerCommands(): void {

    this.context.subscriptions.push(
      vscode.commands.registerCommand("aidd.setRepository", () => {
        this.promptForRepository();
      })
    );


    this.context.subscriptions.push(
      vscode.commands.registerCommand("aidd.refresh", () => {
        this.refreshView();
      })
    );


    this.context.subscriptions.push(
      vscode.commands.registerCommand(
        "aidd.toggleSelection",
        (item: ExplorerTreeItem) => {


          if (item?.content?.path) {
            this.logger.debug(`Command aidd.toggleSelection triggered for: ${item.content.path}`);

            const isCurrentlySelected = this.selectionService.isSelected(item.content.path);
            const targetCheckedState = !isCurrentlySelected;

            this.treeProvider.handleCheckboxChange(item, targetCheckedState);

          } else {
            this.logger.warn("toggleSelection command called without a valid item.");
          }
        }
      )
    );


    this.context.subscriptions.push(
      vscode.commands.registerCommand("aidd.downloadSelected", () => {
        this.downloadSelectedFiles();
      })
    );


    this.context.subscriptions.push(
      this.treeView.onDidChangeVisibility((e) => {
        if (e.visible) {

          this.logger.debug("GitHub Explorer view became visible");
        }
      })
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
            }
          )
        );
      } else {


         this.logger.warn("TreeView checkbox API not available. Using fallback command/icons for selection.");
      }
    } catch (e) {

      this.logger.error("Error setting up checkbox listener, relying on fallback.", e);
    }
  }


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


  private async promptForRepository(): Promise<void> {

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


  private async setRepository(repository: GithubRepository): Promise<void> {
    try {
      this.currentRepository = repository;
      this.treeView.title = `GitHub: ${repository.owner}/${repository.name}${
        repository.branch ? ` (${repository.branch})` : ""
      }`;

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


  private refreshView(): void {


    this.treeProvider.refresh();
  }




  private async downloadSelectedFiles(): Promise<void> {
    try {

      const selectedPaths = this.selectionService.getSelectedItems();

      if (selectedPaths.length === 0) {
        vscode.window.showInformationMessage(
          "No items selected. Use the checkbox to select files or directories to download."
        );
        return;
      }


      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage(
          "No workspace folder open. Please open a folder to download files."
        );
        return;
      }
      const workspaceFolder = workspaceFolders[0].uri.fsPath;



      const selectedItems = await this.treeProvider.getTreeItemsByPaths(selectedPaths);

      if (!selectedItems || selectedItems.length === 0) {
         vscode.window.showErrorMessage("Could not retrieve details for selected items.");
         this.logger.error("Failed to get TreeItems for selected paths", { selectedPaths });
         return;
      }



      const files: DownloadFile[] = selectedItems.map((item) => ({
        url: item.content.download_url || "",
        targetPath: item.content.path,
        type: item.content.type === "file" ? "file" : "dir",
        size: item.content.size,
      }));


      const validFiles = files.filter(
        (file) => file.type === "dir" || file.url
      );


      const filesToDownload = validFiles.filter((f) => f.type === "file");
      if (filesToDownload.length === 0 && validFiles.some(f => f.type === 'dir')) {


         vscode.window.showInformationMessage(
           "Only directories selected. Downloading individual files within selected directories is not yet supported. Please select specific files."
         );
         return;
       } else if (filesToDownload.length === 0) {

         vscode.window.showInformationMessage(
           "No downloadable files selected."
         );
         return;
       }



      const results = await this.downloadService.downloadFiles(
        validFiles,
        workspaceFolder
      );


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
