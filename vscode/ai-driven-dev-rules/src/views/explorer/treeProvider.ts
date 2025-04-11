import * as vscode from "vscode";
import { IGitHubApiService } from "../../api/github";
import { GithubRepository, GithubContent } from "../../api/types"; // Import GithubContent
import { ILogger } from "../../services/logger";
import { ISelectionService } from "../../services/selection"; // Import ISelectionService
import { ExplorerTreeItem } from "./treeItem"; // Remove getSelectedItems import

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

  // Remove onDidChangeCheckboxState as selection is handled by the service event
  // readonly onDidChangeCheckboxState = this._onDidChangeCheckboxState.event;

  private repository: GithubRepository | null = null;
  private rootItems: ExplorerTreeItem[] = [];
  private itemMap: Map<string, ExplorerTreeItem> = new Map(); // Map to store items by path

  // Cache to avoid refetching the same data
  private loadingPaths = new Map<string, Promise<ExplorerTreeItem[]>>();

  /**
   * Create a tree data provider
   * @param githubService GitHub API service
   * @param logger Logger service
   * @param extensionPath Path to the extension's directory
   */
  constructor(
    private readonly githubService: IGitHubApiService,
    private readonly logger: ILogger,
    private readonly extensionPath: string,
    private readonly selectionService: ISelectionService // Add selectionService
  ) {
     // Listen to selection changes to refresh the tree
     this.selectionService.onDidChangeSelection(() => {
       this._onDidChangeTreeData.fire(); // Refresh the entire tree for simplicity
     });
  }

  // Remove internal getSelectedItems, use service instead

  /**
   * Set repository to display
   * @param repository Repository information
   */
  public async setRepository(repository: GithubRepository): Promise<void> {
    this.repository = repository;
    this.rootItems = [];
    this.itemMap.clear(); // Clear item map
    this.loadingPaths.clear();
    this.selectionService.clearSelection(); // Clear selection in the service
    this._onDidChangeTreeData.fire(); // Trigger refresh

    try {
      await this.getRootItems();
    } catch (error) {
      this.logger.error(
        `Failed to load repository: ${repository.owner}/${repository.name}`,
        error
      );
      throw error;
    }
  }

  /**
   * Refresh the tree view
   * @param item Optional item to refresh, or undefined to refresh entire tree
   */
  public refresh(item?: ExplorerTreeItem): void {
    if (item) {
      // Refresh specific item and its children potentially
      // For simplicity with the selection service, refresh the whole view for now
      // TODO: Optimize refresh later if needed
      this._onDidChangeTreeData.fire();
    } else {
      // Clear all cached items and map
      this.loadingPaths.clear();
      this.itemMap.clear();
      this.rootItems = [];
      this._onDidChangeTreeData.fire(); // Refresh entire tree
    }
  }

  /**
   * Handle checkbox changes
   * @param item Item that was checked/unchecked
   * @param checked Whether the item should be checked (true) or unchecked (false)
   */
  public handleCheckboxChange(item: ExplorerTreeItem, checked: boolean): void {
    // Use the selection service to toggle the state
    // Note: The 'checked' parameter from the event might not perfectly align
    // if the service already changed the state. Rely on toggle.
    this.selectionService.toggleSelection(item.content.path);
    // The tree will refresh automatically due to the onDidChangeSelection listener
  }

  /**
   * Get tree item for element
   * @param element Tree item
   * @returns Tree item configured with current selection state
   */
  public getTreeItem(element: ExplorerTreeItem): vscode.TreeItem {
    // Update the element's appearance based on the selection service state
    const isSelected = this.selectionService.isSelected(element.content.path);
    element.updateSelectionState(isSelected); // Add this method to ExplorerTreeItem
    return element;
  }

  /**
   * Get children of element
   * @param element Parent element, or undefined for root
   * @returns Array of child elements
   */
  public async getChildren(
    element?: ExplorerTreeItem
  ): Promise<ExplorerTreeItem[]> {
    try {
      if (!this.repository) {return [];}

      let items: ExplorerTreeItem[];
      if (!element) {
        items = await this.getRootItems();
      } else if (element.content.type === "dir") {
        items = await this.getDirectoryItems(element);
      } else {
        items = []; // Files have no children
      }
      // Ensure items are in the map
      items.forEach(item => this.itemMap.set(item.content.path, item));
      return items;
    } catch (error) {
      this.logger.error("Error fetching tree children", error);
      // Provide a user-friendly error item?
      return []; // Return empty on error to avoid crashing VS Code UI
    }
  }

  /**
   * Get root items
   * @returns Array of root items
   */
  private async getRootItems(): Promise<ExplorerTreeItem[]> {
    if (this.rootItems.length > 0) {
      return this.rootItems;
    }

    if (!this.repository) {
      return [];
    }

    try {
      const result = await this.githubService.fetchRepositoryContent(
        this.repository
      );

      if (!result.success) {
        vscode.window.showErrorMessage(
          `Error fetching repository contents: ${result.error.message}`
        );
        return [];
      }

      this.rootItems = result.data.map((content) =>
        this.createTreeItem(content, undefined)
      );
      // Add root items to map
      this.rootItems.forEach(item => this.itemMap.set(item.content.path, item));
      return this.rootItems;
    } catch (error) {
      this.logger.error(
        `Error fetching root items for ${this.repository.owner}/${this.repository.name}`,
        error
      );
      vscode.window.showErrorMessage(
        `Error fetching repository contents: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  }

  /**
   * Get directory items
   * @param parent Parent directory item
   * @returns Array of child items
   */
  private async getDirectoryItems(
    parent: ExplorerTreeItem
  ): Promise<ExplorerTreeItem[]> {
    const path = parent.content.path;

    // Check if we're already loading this directory
    const loadingPromise = this.loadingPaths.get(path);
    if (loadingPromise) {
      return loadingPromise;
    }

    // If children are already loaded, return them
    if (parent.children.length > 0) {
      return parent.children;
    }

    if (!this.repository) {
      return [];
    }

    // Start loading children
    const promise = (async () => {
      try {
        const result = await this.githubService.fetchRepositoryContent(
          this.repository!,
          path
        );

        if (!result.success) {
          vscode.window.showErrorMessage(
            `Error fetching directory contents: ${result.error.message}`
          );
          return [];
        }

        // Create tree items for each content item
        const items = result.data.map((content) =>
          this.createTreeItem(content, parent)
        );

        // Store children in parent
        parent.children = items;

        return items;
      } catch (error) {
        this.logger.error(
          `Error fetching directory contents for ${path}`,
          error
        );
        vscode.window.showErrorMessage(
          `Error fetching directory contents: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return [];
      } finally {
        // Remove from loading paths
        this.loadingPaths.delete(path);
      }
    })();

    // Store promise in loading paths
    this.loadingPaths.set(path, promise);

    return promise;
  }

  /**
   * Get parent of element
   * @param element Element to get parent of
   * @returns Parent element
   */
  public getParent(
    element: ExplorerTreeItem
  ): vscode.ProviderResult<ExplorerTreeItem> {
    return element.parent;
  }

  /**
   * Creates a new ExplorerTreeItem and adds it to the map.
   * @param content GitHub content
   * @param parent Parent item
   * @returns The created ExplorerTreeItem
   */
  private createTreeItem(content: GithubContent, parent?: ExplorerTreeItem): ExplorerTreeItem {
    const item = new ExplorerTreeItem(content, parent, this.extensionPath);
    this.itemMap.set(content.path, item); // Add item to map
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
    return paths
      .map(path => this.itemMap.get(path))
      .filter((item): item is ExplorerTreeItem => !!item);
  }
}
