import * as vscode from "vscode";
import { IGitHubApiService } from "../../api/github";
import { GithubContent, GithubRepository } from "../../api/types";
import { ILogger } from "../../services/logger";
import { ISelectionService } from "../../services/selection";
import { ExplorerTreeItem } from "./treeItem";


export class ExplorerTreeProvider
  implements vscode.TreeDataProvider<ExplorerTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    ExplorerTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private repository: GithubRepository | null = null;
  private rootItems: ExplorerTreeItem[] | null = null;
  private isRootLoading: boolean = false;
  private itemMap: Map<string, ExplorerTreeItem> = new Map();


  private loadingPaths = new Map<string, Promise<ExplorerTreeItem[]>>();
  private readonly initialLoadDepth = 3;


  constructor(
    private readonly githubService: IGitHubApiService,
    private readonly logger: ILogger,
    private readonly extensionPath: string,
    private readonly selectionService: ISelectionService
  ) {

    this.selectionService.onDidChangeSelection(() => {

      this._onDidChangeTreeData.fire();
    });
  }


  public async setRepository(repository: GithubRepository): Promise<void> {
    this.repository = repository;
    this.rootItems = null;
    this.isRootLoading = false;
    this.itemMap.clear();
    this.loadingPaths.clear();
    this.selectionService.clearSelection();
    this._onDidChangeTreeData.fire();

  }


  public refresh(item?: ExplorerTreeItem): void {
    if (item) {


      if (item.content.type === 'dir') {
        this.loadingPaths.delete(item.content.path);
        item.children = [];
      }
      this._onDidChangeTreeData.fire(item);
    } else {

      this.loadingPaths.clear();
      this.itemMap.clear();
      this.rootItems = null;
      this.isRootLoading = false;
      this._onDidChangeTreeData.fire();
    }
  }


  public async handleCheckboxChange(item: ExplorerTreeItem, checked: boolean): Promise<void> {
    const itemPath = item.content.path;
    this.logger.debug(`handleCheckboxChange called for ${itemPath}, checked: ${checked}`);


    this.selectionService.toggleSelection(itemPath);


    if (item.content.type === 'dir' && checked) {
      this.logger.info(`Directory checked: ${itemPath}. Triggering recursive load (depth 5) and selection.`);
      await this.loadAndSelectDirectoryRecursively(item, 5);
    }

  }


  public getTreeItem(element: ExplorerTreeItem): vscode.TreeItem {


    const isSelected = this.selectionService.isSelected(element.content.path);

    if (typeof element.updateSelectionState === 'function') {
        element.updateSelectionState(isSelected);
    } else {
        this.logger.warn(`updateSelectionState method missing on item: ${element.label}`);

        element.checkboxState = isSelected ? vscode.TreeItemCheckboxState.Checked : vscode.TreeItemCheckboxState.Unchecked;
    }
    return element;
  }


  public async getChildren(
    element?: ExplorerTreeItem
  ): Promise<ExplorerTreeItem[]> {
    try {
      if (!this.repository) {
        this.logger.debug("getChildren called with no repository set.");
        return [];
      }


      if (!element) {
        if (this.rootItems) {
          this.logger.debug("Returning cached root items.");
          return this.rootItems;
        }
        if (this.isRootLoading) {
          this.logger.debug("Root is loading, returning placeholder.");
          return [this.createLoadingPlaceholder()];
        }
        this.logger.debug("Root not loaded, starting background load (depth 3) and returning placeholder.");
        this.loadRootInBackground();
        return [this.createLoadingPlaceholder()];
      }


      if (element.content.type === "dir") {
        const elementPath = element.content.path;
        this.logger.debug(`Getting children for directory: ${elementPath}`);


        const childrenFromMap = this.findChildrenInMap(elementPath);
        if (childrenFromMap.length > 0) {
           this.logger.debug(`Found ${childrenFromMap.length} pre-loaded children in map for ${elementPath}.`);

           element.children = childrenFromMap;
           return childrenFromMap;
        }
        this.logger.debug(`No pre-loaded children found in map for ${elementPath}. Falling back to getDirectoryItems.`);

        return this.getDirectoryItems(element);
      }


      this.logger.debug(`Item is a file, returning no children: ${element.content.path}`);
      return [];
    } catch (error) {
      this.logger.error("Error in getChildren", error);
      return [this.createErrorPlaceholder(error)];
    }
  }


  public getParent(
    element: ExplorerTreeItem
  ): vscode.ProviderResult<ExplorerTreeItem> {
    return element.parent;
  }




  private createLoadingPlaceholder(): ExplorerTreeItem {
    const loadingContent: GithubContent = {
      name: "Chargement...", path: "__loading__", sha: "", size: 0, url: "",
      html_url: "", git_url: "", download_url: null, type: "file"

    };
    const item = new ExplorerTreeItem(loadingContent, undefined, this.extensionPath);
    item.collapsibleState = vscode.TreeItemCollapsibleState.None;
    item.description = "Récupération des données...";
    item.iconPath = new vscode.ThemeIcon("loading~spin");
    return item;
  }


   private createErrorPlaceholder(error: unknown): ExplorerTreeItem {
    const errorContent: GithubContent = {
      name: "Erreur de chargement", path: "__error__", sha: "", size: 0, url: "",
      html_url: "", git_url: "", download_url: null, type: "file"

    };
    const item = new ExplorerTreeItem(errorContent, undefined, this.extensionPath);
    item.collapsibleState = vscode.TreeItemCollapsibleState.None;
    item.description = error instanceof Error ? error.message : String(error);
    item.iconPath = new vscode.ThemeIcon("error");
    item.tooltip = `Erreur: ${item.description}`;
    return item;
  }


  private async loadRootInBackground(): Promise<void> {
    if (!this.repository || this.isRootLoading || this.rootItems !== null) {
      this.logger.debug("Skipping background load: no repo, already loading, or already loaded.");
      return;
    }

    this.isRootLoading = true;
    this.logger.info(`Starting background load for root items (depth ${this.initialLoadDepth})...`);

    try {

      const result = await this.githubService.fetchRepositoryContentRecursive(
        this.repository,
        "",
        this.initialLoadDepth
      );

      if (!result.success) {
        this.logger.error(`Error fetching initial recursive items: ${result.error.message}`);
        this.rootItems = [this.createErrorPlaceholder(result.error)];
        this.itemMap.clear();
      } else {
        this.logger.info(`Successfully fetched ${result.data.length} items recursively (depth ${this.initialLoadDepth}). Processing...`);

        this.itemMap.clear();

        result.data.forEach(content => this.createTreeItem(content));


        this.rootItems = Array.from(this.itemMap.values()).filter(item =>
          !item.content.path.includes('/')
        );
        this.logger.info(`Processed ${this.itemMap.size} total items into map. ${this.rootItems.length} root items identified.`);
      }
    } catch (error) {
      this.logger.error(
        `Exception fetching root items for ${this.repository.owner}/${this.repository.name}`,
        error
      );
      this.rootItems = [this.createErrorPlaceholder(error)];
    } finally {
      this.isRootLoading = false;
      this._onDidChangeTreeData.fire();
      this.logger.info("Background load for root items finished.");
    }
  }


  private async getDirectoryItems(
    parent: ExplorerTreeItem
  ): Promise<ExplorerTreeItem[]> {
    const path = parent.content.path;


    if (parent.children.length > 0) {
       this.logger.debug(`Returning cached children for ${path}`);
       return parent.children;
    }


    let loadingPromise = this.loadingPaths.get(path);
    if (loadingPromise) {
      this.logger.debug(`Already loading children for ${path}, returning existing promise.`);
      return loadingPromise;
    }

    if (!this.repository) {
      this.logger.warn(`getDirectoryItems called without repository for path: ${path}`);
      return [];
    }


    loadingPromise = (async () => {
      this.logger.debug(`Fetching children for directory: ${path}`);
      try {
        const result = await this.githubService.fetchRepositoryContent(
          this.repository!,
          path
        );

        if (!result.success) {
          this.logger.error(`Error fetching directory contents for ${path}: ${result.error.message}`);

          return [this.createErrorPlaceholder(result.error)];
        }


        const items = result.data.map((content) =>
          this.createTreeItem(content, parent)
        );


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

        this.loadingPaths.delete(path);
        this.logger.debug(`Finished loading children for ${path}`);
      }
    })();


    this.loadingPaths.set(path, loadingPromise);

    return loadingPromise;
  }


  private createTreeItem(content: GithubContent, explicitParent?: ExplorerTreeItem): ExplorerTreeItem {

    let item = this.itemMap.get(content.path);
    if (item) {


       if (!item.parent && explicitParent) {



         this.logger.warn(`Item ${content.path} found in map but parent reassignment attempted.`);
       }
       return item;
    }


    let parentToUse: ExplorerTreeItem | undefined = explicitParent;


    if (!parentToUse) {
        const parentPath = content.path.includes('/')
          ? content.path.substring(0, content.path.lastIndexOf('/'))
          : undefined;
        if (parentPath !== undefined) {
            parentToUse = this.itemMap.get(parentPath);
        }
    }


    item = new ExplorerTreeItem(content, parentToUse, this.extensionPath);
    this.itemMap.set(content.path, item);
    this.logger.debug(`Created and mapped item: ${content.path} ${parentToUse ? `(Parent: ${parentToUse.content.path})` : '(Root)'}`);



    if (parentToUse && parentToUse.content.type === 'dir' && !parentToUse.children.some((child: ExplorerTreeItem) => child.content.path === item!.content.path)) {


    }

    return item;
  }


  private findChildrenInMap(parentPath: string): ExplorerTreeItem[] {
    const children: ExplorerTreeItem[] = [];
    const parentDepth = parentPath === "" ? 0 : parentPath.split('/').length;

    for (const item of this.itemMap.values()) {
      const itemPath = item.content.path;

      if (itemPath.startsWith(parentPath === "" ? "" : parentPath + '/')) {

         const itemDepth = itemPath.split('/').length;
         if (itemDepth === parentDepth + 1) {
           children.push(item);
         }
      }
    }

    children.sort((a, b) => {
        if (a.content.type === 'dir' && b.content.type !== 'dir') return -1;
        if (a.content.type !== 'dir' && b.content.type === 'dir') return 1;
        return a.content.name.localeCompare(b.content.name);
    });
    return children;
  }


  private async loadAndSelectDirectoryRecursively(directoryItem: ExplorerTreeItem, depth: number): Promise<void> {
    if (!this.repository) return;

    const path = directoryItem.content.path;
    this.logger.info(`Starting recursive load & select for '${path}' up to depth ${depth}`);

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Chargement récursif de ${directoryItem.content.name}...`,
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: "Appel API GitHub..." });

      try {
        const result = await this.githubService.fetchRepositoryContentRecursive(
          this.repository!,
          path,
          depth
        );

        progress.report({ increment: 50, message: "Traitement des résultats..." });

        if (!result.success) {
          this.logger.error(`Recursive load failed for ${path}: ${result.error.message}`);
          vscode.window.showErrorMessage(`Erreur lors du chargement récursif de ${path}: ${result.error.message}`);
          return;
        }

        const fetchedItems = result.data;
        this.logger.info(`Recursive fetch for '${path}' successful. Found ${fetchedItems.length} items.`);


        fetchedItems.forEach(content => this.createTreeItem(content));


        const itemsToSelect = [directoryItem.content, ...fetchedItems];
        this.selectionService.selectItems(itemsToSelect.map(item => item.path));

        progress.report({ increment: 100, message: "Terminé." });
        this.logger.info(`Selection updated for ${itemsToSelect.length} items under ${path}. Refreshing tree.`);


        this.refresh();

      } catch (error) {
        this.logger.error(`Exception during recursive load & select for ${path}`, error);
        vscode.window.showErrorMessage(`Erreur inattendue lors du chargement récursif de ${path}.`);
      }
    });
  }


  public async getTreeItemsByPaths(paths: string[]): Promise<ExplorerTreeItem[]> {


    const items = paths
      .map(path => this.itemMap.get(path))
      .filter((item): item is ExplorerTreeItem => !!item);
    this.logger.debug(`Retrieved ${items.length} items from map for paths: ${paths.join(', ')}`);
    return items;
  }
}
