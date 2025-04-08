import * as vscode from "vscode";
import { IGitHubApiService } from "../../api/github";
import { GithubRepository } from "../../api/types";
import { ILogger } from "../../services/logger";
import { ExplorerTreeItem, getSelectedItems } from "./treeItem";

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

  private _onDidChangeCheckboxState = new vscode.EventEmitter<
    vscode.TreeCheckboxChangeEvent<ExplorerTreeItem>
  >();
  readonly onDidChangeCheckboxState = this._onDidChangeCheckboxState.event;

  private repository: GithubRepository | null = null;
  private rootItems: ExplorerTreeItem[] = [];

  // Cache to avoid refetching the same data
  private loadingPaths = new Map<string, Promise<ExplorerTreeItem[]>>();

  /**
   * Create a tree data provider
   * @param githubService GitHub API service
   * @param logger Logger service
   */
  constructor(
    private readonly githubService: IGitHubApiService,
    private readonly logger: ILogger
  ) {}

  /**
   * Get selected items
   * @returns Selected items
   */
  public getSelectedItems(): ExplorerTreeItem[] {
    return getSelectedItems(this.rootItems);
  }

  /**
   * Set repository to display
   * @param repository Repository information
   */
  public async setRepository(repository: GithubRepository): Promise<void> {
    this.repository = repository;
    this.rootItems = [];
    this.loadingPaths.clear();
    this._onDidChangeTreeData.fire();

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
      // Remove cached items for this path
      this.loadingPaths.delete(item.content.path);
    } else {
      // Clear all cached items
      this.loadingPaths.clear();
      this.rootItems = [];
    }

    this._onDidChangeTreeData.fire(item);
  }

  /**
   * Handle checkbox changes
   * @param item Item that was checked/unchecked
   * @param checked Whether the item was checked
   */
  public handleCheckboxChange(item: ExplorerTreeItem, checked: boolean): void {
    // Update selection state
    item.selected = checked;

    // Update children if it's a directory
    if (item.content.type === "dir") {
      item.updateChildrenSelection(checked);
    }

    // Update parent selection state
    item.updateParentSelection();

    // Fire event
    this._onDidChangeCheckboxState.fire({
      items: [
        [
          item,
          item.selected
            ? vscode.TreeItemCheckboxState.Checked
            : vscode.TreeItemCheckboxState.Unchecked,
        ],
      ],
    });

    // Update tree view
    this.refresh(item);
  }

  /**
   * Get tree item for element
   * @param element Tree item
   * @returns Tree item
   */
  public getTreeItem(element: ExplorerTreeItem): vscode.TreeItem {
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
      if (!this.repository) {
        return [];
      }

      if (!element) {
        // Root level
        return this.getRootItems();
      } else if (element.content.type === "dir") {
        // Directory
        return this.getDirectoryItems(element);
      } else {
        // File - no children
        return [];
      }
    } catch (error) {
      this.logger.error("Error fetching tree items", error);
      throw error;
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

      this.rootItems = result.data.map(
        (content) => new ExplorerTreeItem(content)
      );
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
        const items = result.data.map((content) => {
          const item = new ExplorerTreeItem(content, parent);

          // Inherit selection state from parent
          if (parent.selected) {
            item.selected = true;
            item.updateIcon();
          }

          return item;
        });

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
}
