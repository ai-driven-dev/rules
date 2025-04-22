import * as vscode from "vscode";
import type { IGitHubApiService } from "../../api/github";
import type { GithubContent, GithubRepository } from "../../api/types";
import type { IExplorerStateService } from "../../services/explorerStateService";
import type { ILogger } from "../../services/logger";
import type { ISelectionService } from "../../services/selection";
import type { IStatusBarService } from "../../services/statusBarService"; // Import StatusBarService interface
import type {
  FileUpdateStatus,
  IUpdateCheckService,
} from "../../services/updateCheckService"; // Import update service and status type
import type { ExplorerTreeItem } from "./treeItem";
import { TreeItemFactory } from "./treeItemFactory";

export class ExplorerTreeProvider
  implements vscode.TreeDataProvider<ExplorerTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    ExplorerTreeItem | undefined | null | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly initialLoadDepth = 3;
  // private readonly recursiveLoadDepth = 5; // Not used directly anymore with fetchRepositoryContentRecursive
  private treeItemFactory: TreeItemFactory;
  private updateStatusMap: Map<string, FileUpdateStatus["status"]> = new Map(); // Store update statuses

  constructor(
    private readonly githubService: IGitHubApiService,
    private readonly logger: ILogger,
    private readonly selectionService: ISelectionService,
    private readonly stateService: IExplorerStateService,
    private readonly updateCheckService: IUpdateCheckService,
    private readonly statusBarService: IStatusBarService, // Inject StatusBarService
    private readonly context: vscode.ExtensionContext,
    extensionPath: string,
  ) {
    this.treeItemFactory = new TreeItemFactory(extensionPath, logger);

    this.selectionService.onDidChangeSelection(() => {
      this.logger.debug("Selection changed, firing onDidChangeTreeData");
      this._onDidChangeTreeData.fire(undefined);
    });
  }

  public async setRepository(repository: GithubRepository): Promise<void> {
    this.stateService.setRepository(repository);
    this.selectionService.clearSelection();
    this.updateStatusMap.clear(); // Clear statuses when repo changes
    this._onDidChangeTreeData.fire(undefined);
    // Optionally trigger an initial update check here
    // this.refreshAndUpdateStatus();
  }

  /** Returns the currently loaded repository information */
  public getCurrentRepository(): GithubRepository | null {
    return this.stateService.getRepository();
  }

  public refresh(item?: ExplorerTreeItem): void {
    if (item) {
      if (item.content.type === "dir") {
        this.stateService.deleteLoadingPromise(item.content.path);
      }
      this._onDidChangeTreeData.fire(item);
    } else {
      const currentRepo = this.stateService.getRepository();
      this.stateService.resetState();
      this.stateService.setRepository(currentRepo);
      this.updateStatusMap.clear(); // Clear statuses on full refresh
      this._onDidChangeTreeData.fire(undefined);
    }
  }

  public async handleCheckboxChange(
    item: ExplorerTreeItem,
    checked: boolean,
  ): Promise<void> {
    const itemPath = item.content.path;
    this.logger.debug(
      `handleCheckboxChange called for ${itemPath}, checked: ${checked}`,
    );

    if (item.content.type === "dir") {
      this.logger.info(
        `Directory checkbox toggled: ${itemPath}. Triggering local recursive selection.`,
      );

      this.selectionService.toggleRecursiveSelection(itemPath);
    } else {
      this.logger.debug(
        `File checkbox toggled: ${itemPath}. Triggering simple selection.`,
      );

      this.selectionService.toggleSelection(itemPath);
    }
  }

  public getTreeItem(element: ExplorerTreeItem): vscode.TreeItem {
    const isSelected = this.selectionService.isSelected(element.content.path);

    if (typeof element.updateSelectionState === "function") {
      element.updateSelectionState(isSelected);
    } else {
      this.logger.warn(
        `updateSelectionState method missing on item: ${element.label}`,
      );
      element.checkboxState = isSelected
        ? vscode.TreeItemCheckboxState.Checked
        : vscode.TreeItemCheckboxState.Unchecked;
    }

    // Ensure the item's tooltip reflects the latest known status
    const status = this.updateStatusMap.get(element.content.path);
    element.setUpdateStatus(status); // Update tooltip etc.

    // TODO: Optionally modify icon based on status here

    return element;
  }

  public async getChildren(
    element?: ExplorerTreeItem,
  ): Promise<ExplorerTreeItem[]> {
    const repository = this.stateService.getRepository();
    if (!repository) {
      this.logger.debug("getChildren called with no repository set in state.");
      return [];
    }

    if (!element) {
      const rootItems = this.stateService.getRootItems();
      if (rootItems) {
        this.logger.debug("Returning cached root items from state.");
        // Ensure cached items have their status applied (using for...of)
        for (const item of rootItems) {
          const status = this.updateStatusMap.get(item.content.path);
          item.setUpdateStatus(status);
        }
        return rootItems;
      }
      if (this.stateService.isRootLoading()) {
        this.logger.debug("Root is loading (state), returning placeholder.");
        return [this.treeItemFactory.createLoadingPlaceholder()];
      }

      this.logger.debug(
        "Root not loaded, starting background load and returning placeholder.",
      );
      this.loadRootInBackground(repository);
      return [this.treeItemFactory.createLoadingPlaceholder()];
    }

    if (element.content.type === "dir") {
      const elementPath = element.content.path;
      this.logger.debug(`Getting children for directory: ${elementPath}`);

      const childrenFromMap = this.findChildrenInMap(elementPath);
      if (childrenFromMap.length > 0) {
        this.logger.debug(
          `Found ${childrenFromMap.length} pre-loaded children in map for ${elementPath}.`,
        );
        // Ensure pre-loaded children have their status applied (using for...of)
        for (const item of childrenFromMap) {
          const status = this.updateStatusMap.get(item.content.path);
          item.setUpdateStatus(status);
        }
        element.children = childrenFromMap;
        return childrenFromMap;
      }

      const loadingPromise = this.stateService.getLoadingPromise(elementPath);
      if (loadingPromise) {
        this.logger.debug(
          `Already loading children for ${elementPath}, returning existing promise.`,
        );

        return loadingPromise;
      }

      this.logger.debug(
        `No pre-loaded children found for ${elementPath}. Fetching directory items.`,
      );
      return this.fetchAndCacheDirectoryItems(repository, element);
    }

    this.logger.debug(
      `Item is a file, returning no children: ${element.content.path}`,
    );
    return [];
  }

  public getParent(
    element: ExplorerTreeItem,
  ): vscode.ProviderResult<ExplorerTreeItem> {
    return element.parent;
  }

  private async loadRootInBackground(
    repository: GithubRepository,
  ): Promise<void> {
    if (
      this.stateService.isRootLoading() ||
      this.stateService.getRootItems() !== null
    ) {
      this.logger.debug(
        "Skipping background load: already loading or already loaded (state).",
      );
      return;
    }

    this.stateService.setRootLoading(true);
    this.logger.info(
      `Starting background load for root items (depth ${this.initialLoadDepth})...`,
    );

    try {
      const result = await this.githubService.fetchRepositoryContentRecursive(
        repository,
        "",
        this.initialLoadDepth,
      );

      if (!result.success) {
        this.logger.error(
          `Error fetching initial recursive items: ${result.error.message}`,
        );

        this.stateService.setRootItems([
          this.treeItemFactory.createErrorPlaceholder(result.error),
        ]);
        this.stateService.clearItemMap();
      } else {
        this.logger.info(
          `Successfully fetched ${result.data.length} items recursively (depth ${this.initialLoadDepth}). Processing...`,
        );

        this.processAndCacheItems(result.data);

        const rootItems = Array.from(
          this.stateService.getAllItems().values(),
        ).filter((item) => !item.content.path.includes("/"));
        this.stateService.setRootItems(rootItems);
        this.logger.info(
          `Processed ${this.stateService.getAllItems().size} total items into map. ${rootItems.length} root items identified.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Exception fetching root items for ${repository.owner}/${repository.name}`,
        error,
      );
      this.stateService.setRootItems([
        this.treeItemFactory.createErrorPlaceholder(error),
      ]);
      this.stateService.clearItemMap();
    } finally {
      this.stateService.setRootLoading(false);
      this._onDidChangeTreeData.fire(undefined);
      this.logger.info("Background load for root items finished.");
    }
  }

  private async fetchAndCacheDirectoryItems(
    repository: GithubRepository,
    parent: ExplorerTreeItem,
  ): Promise<ExplorerTreeItem[]> {
    const path = parent.content.path;
    const loadingPromise = (async () => {
      this.logger.debug(`Fetching children for directory: ${path}`);
      try {
        const result = await this.githubService.fetchRepositoryContent(
          repository,
          path,
        );

        if (!result.success) {
          this.logger.error(
            `Error fetching directory contents for ${path}: ${result.error.message}`,
          );
          return [this.treeItemFactory.createErrorPlaceholder(result.error)];
        }

        const items = this.processAndCacheItems(result.data, parent);
        parent.children = items;
        this.logger.debug(
          `Successfully fetched and cached ${items.length} children for ${path}`,
        );
        return items;
      } catch (error) {
        this.logger.error(
          `Exception fetching directory contents for ${path}`,
          error,
        );
        return [this.treeItemFactory.createErrorPlaceholder(error)];
      } finally {
        this.stateService.deleteLoadingPromise(path);
        this.logger.debug(`Finished loading children for ${path}`);
      }
    })();

    this.stateService.setLoadingPromise(path, loadingPromise);
    return loadingPromise;
  }

  /** Helper to process fetched content, create items, and update state map */
  private processAndCacheItems(
    contents: GithubContent[],
    explicitParent?: ExplorerTreeItem,
  ): ExplorerTreeItem[] {
    const createdItems: ExplorerTreeItem[] = [];
    const filters = this.getIncludeFilters(); // Get filters once

    for (const content of contents) {
      // --- Filtering Logic ---
      // 1. Apply includePaths filter first
      if (!this.matchesIncludeFilters(content.path, filters)) {
        this.logger.debug(
          `Skipping item due to includePaths filter: ${content.path}`,
        );
        continue; // Skip this item if it doesn't match filters
      }

      // 2. Check update status and skip if remote-deleted
      const status = this.updateStatusMap.get(content.path);
      if (status === "remote-deleted") {
        this.logger.debug(
          `Skipping item because it's marked as remote-deleted: ${content.path}`,
        );
        continue; // Don't show items deleted remotely
      }

      // --- End Filtering Logic ---

      // Determine parent
      let parentToUse = explicitParent;
      if (!parentToUse) {
        const parentPath = content.path.includes("/")
          ? content.path.substring(0, content.path.lastIndexOf("/"))
          : undefined;
        if (parentPath !== undefined) {
          parentToUse = this.stateService.getItem(parentPath);
        }
      }

      // Create the item first
      const newItem = this.treeItemFactory.createItem(content, parentToUse);

      // Then set its status
      newItem.setUpdateStatus(status); // Use the status determined before the parent logic

      // Map and add to list
      this.stateService.mapItem(newItem);
      createdItems.push(newItem);
    }

    // No need to filter the createdItems array anymore, filtering is done inside the loop
    this.logger.debug(
      `processAndCacheItems: Processed ${contents.length} items, returning ${createdItems.length} after filtering.`,
    );
    return createdItems;
  }

  /** Parses the includePaths setting into an array of strings */
  private getIncludeFilters(): string[] {
    const config = vscode.workspace.getConfiguration("aidd");
    const includePathsString = config.get<string>("includePaths") ?? "";
    if (!includePathsString.trim()) {
      return [];
    }
    return includePathsString
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  /** Checks if a given path matches any of the include filters.
   *  An item matches if its path is exactly one of the filters,
   *  or if its path starts with a filter followed by '/'.
   */
  private matchesIncludeFilters(itemPath: string, filters: string[]): boolean {
    if (filters.length === 0) {
      return true; // No filters means include everything
    }

    for (const filter of filters) {
      // Normalize filter slightly: remove trailing slash if present for comparison consistency
      const normalizedFilter = filter.endsWith("/")
        ? filter.slice(0, -1)
        : filter;

      // 1. Exact match
      if (itemPath === normalizedFilter) {
        this.logger.debug(
          `Filter match (exact): '${itemPath}' == '${normalizedFilter}'`,
        ); // Use debug
        return true;
      }

      // 2. Item is within a filtered directory
      // Ensure filter is treated as a directory by adding '/'
      if (itemPath.startsWith(`${normalizedFilter}/`)) {
        this.logger.debug(
          `Filter match (starts with): '${itemPath}' starts with '${normalizedFilter}/'`,
        ); // Use debug
        return true;
      }
    }

    this.logger.debug(
      `No filter match for: '${itemPath}' against filters: [${filters.join(", ")}]`,
    ); // Use debug
    return false; // No match found
  }

  private findChildrenInMap(parentPath: string): ExplorerTreeItem[] {
    const children: ExplorerTreeItem[] = [];
    const parentDepth = parentPath === "" ? 0 : parentPath.split("/").length;
    const allItems = this.stateService.getAllItems();

    for (const item of allItems.values()) {
      const itemPath = item.content.path;

      if (
        itemPath !== parentPath &&
        itemPath.startsWith(parentPath === "" ? "" : `${parentPath}/`)
      ) {
        const itemDepth = itemPath.split("/").length;
        if (itemDepth === parentDepth + 1) {
          children.push(item);
        }
      }
    }

    // Sort children: directories first, then alphabetically
    children.sort((a, b) => {
      if (a.content.type === "dir" && b.content.type !== "dir") {
        return -1;
      }
      if (a.content.type !== "dir" && b.content.type === "dir") {
        return 1;
      }
      return a.content.name.localeCompare(b.content.name);
    });
    return children; // Added missing return statement
  }

  public async getTreeItemsByPaths(
    paths: string[],
  ): Promise<ExplorerTreeItem[]> {
    const items = paths
      .map((path) => this.stateService.getItem(path))
      .filter((item): item is ExplorerTreeItem => !!item);
    this.logger.debug(
      `Retrieved ${items.length} items from state map for paths: ${paths.join(", ")}`,
    );
    return items;
  }

  // --- Update Check Logic ---

  /**
   * Performs an update check for the current repository and refreshes the view.
   */
  public async refreshAndUpdateStatus(): Promise<void> {
    const repository = this.getCurrentRepository();
    if (!repository) {
      this.logger.warn(
        "refreshAndUpdateStatus called but no repository is set.",
      );
      vscode.window.showWarningMessage("Please select a repository first.");
      return;
    }

    this.logger.info(
      `Starting update status check for ${repository.owner}/${repository.name}...`,
    );
    this.statusBarService.setCheckingUpdates(); // Use status bar

    try {
      const result = await this.updateCheckService.checkUpdates(repository);
      let success = false;
      let details = "";

      if (result.error) {
        this.logger.error("Error during update check:", result.error);
        vscode.window.showErrorMessage(
          `Failed to check for updates: ${result.error.message}`,
        );
        this.updateStatusMap.clear(); // Clear statuses on error
        details = `Error: ${result.error.message}`;
      } else {
        success = true;
        this.logger.info(
          `Update check successful. Found ${result.statuses.length} statuses.`,
        );
        // Update the internal map (using for...of)
        this.updateStatusMap.clear();
        let updatesAvailable = 0;
        for (const s of result.statuses) {
          this.updateStatusMap.set(s.filePath, s.status);
          if (s.status === "update-available") {
            updatesAvailable++;
          }
        }
        details =
          updatesAvailable > 0
            ? `${updatesAvailable} update(s) available.`
            : "All rules up-to-date.";
      }
      this.statusBarService.setUpdatesChecked(success, details);
    } catch (error) {
      this.logger.error("Unexpected error during update check:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(
        `An unexpected error occurred while checking for updates: ${errorMessage}`,
      );
      this.updateStatusMap.clear(); // Clear statuses on error
      this.statusBarService.setUpdatesChecked(
        false,
        `Unexpected error: ${errorMessage}`,
      );
    } finally {
      this.logger.debug("Update check finished, refreshing tree view.");
      // Refresh the entire tree to apply new statuses/tooltips
      this._onDidChangeTreeData.fire(undefined);
      // Optionally reset status bar to idle after a delay, or keep the result shown
      // For now, let's keep the result shown until next action
      // setTimeout(() => this.statusBarService.setIdle(), 5000);
    }
  }
}
