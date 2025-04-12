import * as vscode from "vscode";
import { IGitHubApiService } from "../../api/github";
import { GithubContent, GithubRepository } from "../../api/types";
import { ILogger } from "../../services/logger";
import { ISelectionService } from "../../services/selection";
import { ExplorerTreeItem } from "./treeItem";

/**
 * Tree data provider for GitHub Explorer
 */
export class ExplorerTreeProvider
  implements vscode.TreeDataProvider<ExplorerTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    ExplorerTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private repository: GithubRepository | null = null;
  private rootItems: ExplorerTreeItem[] | null = null; // Use null to indicate not loaded/loading
  private isRootLoading: boolean = false; // Track root loading state
  private itemMap: Map<string, ExplorerTreeItem> = new Map(); // Map to store items by path

  // Cache for directory loading
  private loadingPaths = new Map<string, Promise<ExplorerTreeItem[]>>();

  /**
   * Create a tree data provider
   * @param githubService GitHub API service
   * @param logger Logger service
   * @param extensionPath Path to the extension's directory
   * @param selectionService Selection service
   */
  constructor(
    private readonly githubService: IGitHubApiService,
    private readonly logger: ILogger,
    private readonly extensionPath: string,
    private readonly selectionService: ISelectionService
  ) {
     // Listen to selection changes to refresh the tree
     this.selectionService.onDidChangeSelection(() => {
       // Refresh the entire tree for simplicity for now.
       // Optimization: Could potentially refresh only affected items.
       this._onDidChangeTreeData.fire();
     });
  }

  /**
   * Set repository to display
   * @param repository Repository information
   */
  public async setRepository(repository: GithubRepository): Promise<void> {
    this.repository = repository;
    this.rootItems = null; // Reset root items to trigger loading state
    this.isRootLoading = false; // Reset loading state
    this.itemMap.clear(); // Clear item map
    this.loadingPaths.clear(); // Clear directory loading cache
    this.selectionService.clearSelection(); // Clear selection in the service
    this._onDidChangeTreeData.fire(); // Trigger refresh to show loading or initial state
    // Note: Actual loading happens in getChildren -> loadRootInBackground
  }

  /**
   * Refresh the tree view
   * @param item Optional item to refresh, or undefined to refresh entire tree
   */
  public refresh(item?: ExplorerTreeItem): void {
    if (item) {
      // Refresh specific item and its children potentially
      // Clear cache for this specific item if it's a directory
      if (item.content.type === 'dir') {
        this.loadingPaths.delete(item.content.path);
        item.children = []; // Clear cached children
      }
      this._onDidChangeTreeData.fire(item); // Refresh only the specific item/subtree
    } else {
      // Clear all cached items and map for full refresh
      this.loadingPaths.clear();
      this.itemMap.clear();
      this.rootItems = null; // Reset root to trigger loading on next getChildren
      this.isRootLoading = false;
      this._onDidChangeTreeData.fire(); // Refresh entire tree
    }
  }

  /**
   * Handle checkbox changes (called from ExplorerView based on VS Code API event)
   * @param item Item that was checked/unchecked
   * @param checked Whether the item should be checked (true) or unchecked (false)
   */
  public handleCheckboxChange(item: ExplorerTreeItem, checked: boolean): void {
    // Use the selection service to toggle the state.
    // The 'checked' parameter from the event might not perfectly align
    // if the service already changed the state internally before the event fired.
    // Relying on toggle ensures the correct state transition based on the service's view.
    this.selectionService.toggleSelection(item.content.path);
    // The tree will refresh automatically due to the onDidChangeSelection listener firing _onDidChangeTreeData.
  }

  /**
   * Get tree item for element (required by TreeDataProvider interface)
   * @param element Tree item
   * @returns Tree item configured with current selection state
   */
  public getTreeItem(element: ExplorerTreeItem): vscode.TreeItem {
    // Update the element's appearance based on the selection service state
    // This ensures icons/checkboxes reflect the current selection
    const isSelected = this.selectionService.isSelected(element.content.path);
    // Ensure the updateSelectionState method exists on ExplorerTreeItem
    if (typeof element.updateSelectionState === 'function') {
        element.updateSelectionState(isSelected);
    } else {
        this.logger.warn(`updateSelectionState method missing on item: ${element.label}`);
        // Fallback or default state if method is missing
        element.checkboxState = isSelected ? vscode.TreeItemCheckboxState.Checked : vscode.TreeItemCheckboxState.Unchecked;
    }
    return element;
  }

  /**
   * Get children of element (required by TreeDataProvider interface)
   * @param element Parent element, or undefined for root
   * @returns Array of child elements or a placeholder
   */
  public async getChildren(
    element?: ExplorerTreeItem
  ): Promise<ExplorerTreeItem[]> {
    try {
      if (!this.repository) {
        this.logger.debug("getChildren called with no repository set.");
        return [];
      }

      // Handle root level
      if (!element) {
        if (this.rootItems) {
          // Already loaded
          this.logger.debug("Returning cached root items.");
          return this.rootItems;
        }
        if (this.isRootLoading) {
          // Currently loading, show placeholder
          this.logger.debug("Root is loading, returning placeholder.");
          return [this.createLoadingPlaceholder()];
        }
        // Not loaded and not loading, start loading in background
        this.logger.debug("Root not loaded, starting background load and returning placeholder.");
        this.loadRootInBackground(); // Don't await this
        return [this.createLoadingPlaceholder()];
      }

      // Handle directory level
      if (element.content.type === "dir") {
        this.logger.debug(`Getting children for directory: ${element.content.path}`);
        return this.getDirectoryItems(element); // This handles its own loading/caching
      }

      // Handle file level (no children)
      this.logger.debug(`Item is a file, returning no children: ${element.content.path}`);
      return [];
    } catch (error) {
      this.logger.error("Error in getChildren", error);
      return [this.createErrorPlaceholder(error)]; // Return error placeholder
    }
  }

  /**
   * Get parent of element (required by TreeDataProvider interface)
   * @param element Element to get parent of
   * @returns Parent element or undefined
   */
  public getParent(
    element: ExplorerTreeItem
  ): vscode.ProviderResult<ExplorerTreeItem> {
    return element.parent;
  }

  // --- Helper Methods ---

  /**
   * Creates a placeholder item for loading state.
   */
  private createLoadingPlaceholder(): ExplorerTreeItem {
    const loadingContent: GithubContent = {
      name: "Chargement...", path: "__loading__", sha: "", size: 0, url: "",
      html_url: "", git_url: "", download_url: null, type: "file" // Treat as file
      // No _links property here
    };
    const item = new ExplorerTreeItem(loadingContent, undefined, this.extensionPath);
    item.collapsibleState = vscode.TreeItemCollapsibleState.None;
    item.description = "Récupération des données...";
    item.iconPath = new vscode.ThemeIcon("loading~spin");
    return item;
  }

   /**
   * Creates a placeholder item for error state.
   */
   private createErrorPlaceholder(error: unknown): ExplorerTreeItem {
    const errorContent: GithubContent = {
      name: "Erreur de chargement", path: "__error__", sha: "", size: 0, url: "",
      html_url: "", git_url: "", download_url: null, type: "file"
      // No _links property here
    };
    const item = new ExplorerTreeItem(errorContent, undefined, this.extensionPath);
    item.collapsibleState = vscode.TreeItemCollapsibleState.None;
    item.description = error instanceof Error ? error.message : String(error);
    item.iconPath = new vscode.ThemeIcon("error");
    item.tooltip = `Erreur: ${item.description}`;
    return item;
  }

  /**
   * Load root items in the background. Triggered by getChildren when root is needed but not loaded.
   */
  private async loadRootInBackground(): Promise<void> {
    if (!this.repository || this.isRootLoading || this.rootItems !== null) {
      this.logger.debug("Skipping background load: no repo, already loading, or already loaded.");
      return;
    }

    this.isRootLoading = true;
    this.logger.info("Starting background load for root items...");

    try {
      const result = await this.githubService.fetchRepositoryContent(
        this.repository
      );

      if (!result.success) {
        this.logger.error(`Error fetching root items: ${result.error.message}`);
        this.rootItems = [this.createErrorPlaceholder(result.error)]; // Show error in tree
      } else {
        this.rootItems = result.data.map((content) =>
          this.createTreeItem(content, undefined)
        );
        // Add root items to map
        this.rootItems.forEach(item => this.itemMap.set(item.content.path, item));
        this.logger.info(`Successfully loaded ${this.rootItems.length} root items.`);
      }
    } catch (error) {
      this.logger.error(
        `Exception fetching root items for ${this.repository.owner}/${this.repository.name}`,
        error
      );
      this.rootItems = [this.createErrorPlaceholder(error)]; // Show error in tree
    } finally {
      this.isRootLoading = false;
      this._onDidChangeTreeData.fire(); // Refresh the view to show items or error
      this.logger.info("Background load for root items finished.");
    }
  }

  /**
   * Get directory items, loading them if necessary.
   * @param parent Parent directory item
   * @returns Array of child items
   */
  private async getDirectoryItems(
    parent: ExplorerTreeItem
  ): Promise<ExplorerTreeItem[]> {
    const path = parent.content.path;

    // Return cached children if available
    if (parent.children.length > 0) {
       this.logger.debug(`Returning cached children for ${path}`);
       return parent.children;
    }

    // Check if we're already loading this directory
    let loadingPromise = this.loadingPaths.get(path);
    if (loadingPromise) {
      this.logger.debug(`Already loading children for ${path}, returning existing promise.`);
      return loadingPromise;
    }

    if (!this.repository) {
      this.logger.warn(`getDirectoryItems called without repository for path: ${path}`);
      return [];
    }

    // Start loading children
    loadingPromise = (async () => {
      this.logger.debug(`Fetching children for directory: ${path}`);
      try {
        const result = await this.githubService.fetchRepositoryContent(
          this.repository!, // We checked repository above
          path
        );

        if (!result.success) {
          this.logger.error(`Error fetching directory contents for ${path}: ${result.error.message}`);
          // Return an error item instead of empty array?
          return [this.createErrorPlaceholder(result.error)];
        }

        // Create tree items for each content item
        const items = result.data.map((content) =>
          this.createTreeItem(content, parent)
        );

        // Store children in parent for caching
        parent.children = items;
        this.logger.debug(`Successfully fetched ${items.length} children for ${path}`);
        return items;
      } catch (error) {
        this.logger.error(
          `Exception fetching directory contents for ${path}`,
          error
        );
        return [this.createErrorPlaceholder(error)];
      } finally {
        // Remove from loading paths map once done
        this.loadingPaths.delete(path);
        this.logger.debug(`Finished loading children for ${path}`);
      }
    })();

    // Store promise in loading paths map
    this.loadingPaths.set(path, loadingPromise);

    return loadingPromise;
  }

  /**
   * Creates a new ExplorerTreeItem and adds it to the map.
   * @param content GitHub content
   * @param parent Parent item
   * @returns The created ExplorerTreeItem
   */
  private createTreeItem(content: GithubContent, parent?: ExplorerTreeItem): ExplorerTreeItem {
    const item = new ExplorerTreeItem(content, parent, this.extensionPath);
    this.itemMap.set(content.path, item); // Add/update item in map
    return item;
  }

  /**
   * Retrieves tree items based on their paths.
   * Used by the download command to get full item details.
   * @param paths Array of item paths
   * @returns A promise resolving to an array of ExplorerTreeItem objects
   */
  public async getTreeItemsByPaths(paths: string[]): Promise<ExplorerTreeItem[]> {
    // This implementation assumes items are already loaded and in the map.
    // A more robust version might need to fetch missing items if necessary.
    const items = paths
      .map(path => this.itemMap.get(path))
      .filter((item): item is ExplorerTreeItem => !!item);
    this.logger.debug(`Retrieved ${items.length} items from map for paths: ${paths.join(', ')}`);
    return items;
  }
}
