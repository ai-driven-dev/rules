import * as vscode from "vscode";
import { GithubRepository } from "../api/types";

/**
 * Keys for stored values
 */
export enum StorageKey {
  RECENT_REPOSITORIES = "githubExplorer.recentRepositories",
  LAST_REPOSITORY = "githubExplorer.lastRepository",
  SETTINGS = "githubExplorer.settings",
}

/**
 * Extension settings
 */
export interface Settings {
  maxRecentRepositories: number;
  maxConcurrentDownloads: number;
  showWelcomeOnStartup: boolean;
  autoRefreshInterval?: number;
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: Settings = {
  maxRecentRepositories: 5,
  maxConcurrentDownloads: 3,
  showWelcomeOnStartup: true,
  autoRefreshInterval: undefined,
};

/**
 * Storage service interface
 */
export interface IStorageService {
  getRecentRepositories(): GithubRepository[];
  addRecentRepository(repository: GithubRepository): void;
  getLastRepository(): GithubRepository | undefined;
  setLastRepository(repository: GithubRepository): void;
  getSettings(): Settings;
  updateSettings(settings: Partial<Settings>): void;
  clearStorage(): void;
}

/**
 * Storage service for VS Code extension
 */
export class StorageService implements IStorageService {
  /**
   * Create a new storage service
   * @param context Extension context
   */
  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Get recent repositories
   * @returns Array of recent repositories
   */
  public getRecentRepositories(): GithubRepository[] {
    const repos = this.context.globalState.get<GithubRepository[]>(
      StorageKey.RECENT_REPOSITORIES,
      []
    );
    return repos;
  }

  /**
   * Add a repository to recent repositories
   * @param repository Repository to add
   */
  public addRecentRepository(repository: GithubRepository): void {
    const repos = this.getRecentRepositories();
    const settings = this.getSettings();

    // Remove if already exists
    const filteredRepos = repos.filter(
      (repo) =>
        !(
          repo.owner === repository.owner &&
          repo.name === repository.name &&
          repo.branch === repository.branch
        )
    );

    // Add to beginning of array
    filteredRepos.unshift(repository);

    // Limit to max number of repositories
    const limitedRepos = filteredRepos.slice(0, settings.maxRecentRepositories);

    // Save to storage
    this.context.globalState.update(
      StorageKey.RECENT_REPOSITORIES,
      limitedRepos
    );

    // Update last repository
    this.setLastRepository(repository);
  }

  /**
   * Get last used repository
   * @returns Last repository or undefined
   */
  public getLastRepository(): GithubRepository | undefined {
    return this.context.globalState.get<GithubRepository>(
      StorageKey.LAST_REPOSITORY
    );
  }

  /**
   * Set last used repository
   * @param repository Repository to set
   */
  public setLastRepository(repository: GithubRepository): void {
    this.context.globalState.update(StorageKey.LAST_REPOSITORY, repository);
  }

  /**
   * Get extension settings
   * @returns Settings object
   */
  public getSettings(): Settings {
    const savedSettings = this.context.globalState.get<Partial<Settings>>(
      StorageKey.SETTINGS,
      {}
    );

    // Merge with default settings
    return {
      ...DEFAULT_SETTINGS,
      ...savedSettings,
    };
  }

  /**
   * Update extension settings
   * @param settings Settings to update
   */
  public updateSettings(settings: Partial<Settings>): void {
    const currentSettings = this.getSettings();
    const newSettings = {
      ...currentSettings,
      ...settings,
    };

    this.context.globalState.update(StorageKey.SETTINGS, newSettings);
  }

  /**
   * Clear all storage
   */
  public clearStorage(): void {
    this.context.globalState.update(StorageKey.RECENT_REPOSITORIES, undefined);
    this.context.globalState.update(StorageKey.LAST_REPOSITORY, undefined);
    this.context.globalState.update(StorageKey.SETTINGS, undefined);
  }
}
