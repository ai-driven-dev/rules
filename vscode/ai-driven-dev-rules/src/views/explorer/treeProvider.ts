import * as vscode from "vscode";
import type { IGitHubApiService } from "../../api/github";
import type { GithubContent, GithubRepository } from "../../api/types";
import type { IExplorerStateService } from "../../services/explorerStateService";
import type { ILogger } from "../../services/logger";
import type { ISelectionService } from "../../services/selection";
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
  private readonly recursiveLoadDepth = 5;
  private treeItemFactory: TreeItemFactory;

  constructor(
    private readonly githubService: IGitHubApiService,
    private readonly logger: ILogger,
    private readonly selectionService: ISelectionService,
    private readonly stateService: IExplorerStateService,
    extensionPath: string,
  ) {
    this.treeItemFactory = new TreeItemFactory(extensionPath, logger);

    this.selectionService.onDidChangeSelection(() => {
      this.logger.debug("Selection changed, firing onDidChangeTreeData");
      this._onDidChangeTreeData.fire();
    });
  }

  public async setRepository(repository: GithubRepository): Promise<void> {
    this.stateService.setRepository(repository);
    this.selectionService.clearSelection();
    this._onDidChangeTreeData.fire();
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
      this._onDidChangeTreeData.fire();
    }
  }

  public async handleCheckboxChange(
    item: ExplorerTreeItem,
    checked: boolean, // Ce paramètre semble toujours inutilisé, mais on le garde pour la signature
  ): Promise<void> {
    const itemPath = item.content.path;
    this.logger.debug(
      `handleCheckboxChange called for ${itemPath}, checked: ${checked}`,
    );

    if (item.content.type === "dir") {
      this.logger.info(
        `Directory checkbox toggled: ${itemPath}. Triggering local recursive selection.`,
      );
      // Gère le dossier ET ses descendants
      this.selectionService.toggleRecursiveSelection(itemPath);
    } else {
      this.logger.debug(
        `File checkbox toggled: ${itemPath}. Triggering simple selection.`,
      );
      // Gère uniquement le fichier
      this.selectionService.toggleSelection(itemPath);
    }
    // L'événement onDidChangeSelection déclenché par le service
    // provoquera la mise à jour de l'UI via _onDidChangeTreeData.fire()
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
      this._onDidChangeTreeData.fire();
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
    contents.forEach((content) => {
      let parentToUse = explicitParent;
      if (!parentToUse) {
        const parentPath = content.path.includes("/")
          ? content.path.substring(0, content.path.lastIndexOf("/"))
          : undefined;
        if (parentPath !== undefined) {
          parentToUse = this.stateService.getItem(parentPath);
        }
      }

      const newItem = this.treeItemFactory.createItem(content, parentToUse);

      this.stateService.mapItem(newItem);
      createdItems.push(newItem);
    });
    return createdItems;
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

    children.sort((a, b) => {
      if (a.content.type === "dir" && b.content.type !== "dir") {
        return -1;
      }
      if (a.content.type !== "dir" && b.content.type === "dir") {
        return 1;
      }
      return a.content.name.localeCompare(b.content.name);
    });
    return children;
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
}
