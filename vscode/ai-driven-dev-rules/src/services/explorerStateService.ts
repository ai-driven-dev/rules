import type { GithubRepository } from "../api/types";
import type { ExplorerTreeItem } from "../views/explorer/treeItem";
import type { ILogger } from "./logger";

export interface IExplorerStateService {
  getRepository(): GithubRepository | null;
  setRepository(repository: GithubRepository | null): void;

  isRootLoading(): boolean;
  setRootLoading(isLoading: boolean): void;

  getRootItems(): ExplorerTreeItem[] | null;
  setRootItems(items: ExplorerTreeItem[] | null): void;

  getItem(path: string): ExplorerTreeItem | undefined;
  getAllItems(): Map<string, ExplorerTreeItem>;
  mapItem(item: ExplorerTreeItem): void;
  clearItemMap(): void;

  getLoadingPromise(path: string): Promise<ExplorerTreeItem[]> | undefined;
  setLoadingPromise(path: string, promise: Promise<ExplorerTreeItem[]>): void;
  deleteLoadingPromise(path: string): void;
  clearLoadingPromises(): void;

  resetState(): void;
}

export class ExplorerStateService implements IExplorerStateService {
  private currentRepository: GithubRepository | null = null;
  private currentRootItems: ExplorerTreeItem[] | null = null;
  private rootLoadingState = false;
  private readonly itemsByPath: Map<string, ExplorerTreeItem> = new Map();
  private readonly directoryLoadingPromises = new Map<
    string,
    Promise<ExplorerTreeItem[]>
  >();

  constructor(private readonly logger: ILogger) {}

  public getRepository(): GithubRepository | null {
    return this.currentRepository;
  }

  public setRepository(repository: GithubRepository | null): void {
    if (
      this.currentRepository?.owner !== repository?.owner ||
      this.currentRepository?.name !== repository?.name ||
      this.currentRepository?.branch !== repository?.branch
    ) {
      this.logger.debug(
        `Setting repository state to: ${repository ? `${repository.owner}/${repository.name}` : "null"}`,
      );
      this.currentRepository = repository;

      this.resetState();
    }
  }

  public isRootLoading(): boolean {
    return this.rootLoadingState;
  }

  public setRootLoading(isLoading: boolean): void {
    if (this.rootLoadingState !== isLoading) {
      this.logger.debug(`Setting root loading state to: ${isLoading}`);
      this.rootLoadingState = isLoading;
    }
  }

  public getRootItems(): ExplorerTreeItem[] | null {
    return this.currentRootItems;
  }

  public setRootItems(items: ExplorerTreeItem[] | null): void {
    this.logger.debug(
      `Setting root items state (count: ${items?.length ?? "null"})`,
    );
    this.currentRootItems = items;
  }

  public getItem(path: string): ExplorerTreeItem | undefined {
    return this.itemsByPath.get(path);
  }

  public getAllItems(): Map<string, ExplorerTreeItem> {
    return this.itemsByPath;
  }

  public mapItem(item: ExplorerTreeItem): void {
    if (!this.itemsByPath.has(item.content.path)) {
      this.logger.debug(`Mapping item: ${item.content.path}`);
    }
    this.itemsByPath.set(item.content.path, item);
  }

  public clearItemMap(): void {
    if (this.itemsByPath.size > 0) {
      this.logger.debug("Clearing item map.");
      this.itemsByPath.clear();
    }
  }

  public getLoadingPromise(
    path: string,
  ): Promise<ExplorerTreeItem[]> | undefined {
    return this.directoryLoadingPromises.get(path);
  }

  public setLoadingPromise(
    path: string,
    promise: Promise<ExplorerTreeItem[]>,
  ): void {
    this.logger.debug(`Setting loading promise for path: ${path}`);
    this.directoryLoadingPromises.set(path, promise);
  }

  public deleteLoadingPromise(path: string): void {
    if (this.directoryLoadingPromises.has(path)) {
      this.logger.debug(`Deleting loading promise for path: ${path}`);
      this.directoryLoadingPromises.delete(path);
    }
  }

  public clearLoadingPromises(): void {
    if (this.directoryLoadingPromises.size > 0) {
      this.logger.debug("Clearing directory loading promises.");
      this.directoryLoadingPromises.clear();
    }
  }

  public resetState(): void {
    this.logger.debug("Resetting explorer state.");
    this.currentRootItems = null;
    this.rootLoadingState = false;
    this.clearItemMap();
    this.clearLoadingPromises();
  }
}
