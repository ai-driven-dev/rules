import * as vscode from "vscode";
import { GithubRepository } from "../api/types";


export enum StorageKey {
  RECENT_REPOSITORIES = "aidd.recentRepositories",
  LAST_REPOSITORY = "aidd.lastRepository",
  SETTINGS = "aidd.settings",
}


export interface Settings {
  maxRecentRepositories: number;
  maxConcurrentDownloads: number;
  showWelcomeOnStartup: boolean;
  autoRefreshInterval?: number;
}


export const DEFAULT_SETTINGS: Settings = {
  maxRecentRepositories: 5,
  maxConcurrentDownloads: 3,
  showWelcomeOnStartup: true,
  autoRefreshInterval: undefined,
};


export interface IStorageService {
  getRecentRepositories(): GithubRepository[];
  addRecentRepository(repository: GithubRepository): void;
  getLastRepository(): GithubRepository | undefined;
  setLastRepository(repository: GithubRepository): void;
  getSettings(): Settings;
  updateSettings(settings: Partial<Settings>): void;
  clearStorage(): void;
}


export class StorageService implements IStorageService {

  constructor(private readonly context: vscode.ExtensionContext) {}


  public getRecentRepositories(): GithubRepository[] {
    const repos = this.context.globalState.get<GithubRepository[]>(
      StorageKey.RECENT_REPOSITORIES,
      []
    );
    return repos;
  }


  public addRecentRepository(repository: GithubRepository): void {
    const repos = this.getRecentRepositories();
    const settings = this.getSettings();


    const filteredRepos = repos.filter(
      (repo) =>
        !(
          repo.owner === repository.owner &&
          repo.name === repository.name &&
          repo.branch === repository.branch
        )
    );


    filteredRepos.unshift(repository);


    const limitedRepos = filteredRepos.slice(0, settings.maxRecentRepositories);


    this.context.globalState.update(
      StorageKey.RECENT_REPOSITORIES,
      limitedRepos
    );


    this.setLastRepository(repository);
  }


  public getLastRepository(): GithubRepository | undefined {
    return this.context.globalState.get<GithubRepository>(
      StorageKey.LAST_REPOSITORY
    );
  }


  public setLastRepository(repository: GithubRepository): void {
    this.context.globalState.update(StorageKey.LAST_REPOSITORY, repository);
  }


  public getSettings(): Settings {
    const savedSettings = this.context.globalState.get<Partial<Settings>>(
      StorageKey.SETTINGS,
      {}
    );


    return {
      ...DEFAULT_SETTINGS,
      ...savedSettings,
    };
  }


  public updateSettings(settings: Partial<Settings>): void {
    const currentSettings = this.getSettings();
    const newSettings = {
      ...currentSettings,
      ...settings,
    };

    this.context.globalState.update(StorageKey.SETTINGS, newSettings);
  }


  public clearStorage(): void {
    this.context.globalState.update(StorageKey.RECENT_REPOSITORIES, undefined);
    this.context.globalState.update(StorageKey.LAST_REPOSITORY, undefined);
    this.context.globalState.update(StorageKey.SETTINGS, undefined);
  }
}
