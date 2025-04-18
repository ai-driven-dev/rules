import * as vscode from "vscode";
import type { GithubRepository } from "../api/types";

export enum StorageKey {
  RECENT_REPOSITORIES = "aidd.recentRepositories",
  LAST_REPOSITORY = "aidd.lastRepository",
}

export interface IStorageService {
  getRecentRepositories(): GithubRepository[];
  addRecentRepository(repository: GithubRepository): void;
  getLastRepository(): GithubRepository | undefined;
  setLastRepository(repository: GithubRepository): void;

  clearStorage(): void;
}

export class StorageService implements IStorageService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  public getRecentRepositories(): GithubRepository[] {
    const repos = this.context.globalState.get<GithubRepository[]>(
      StorageKey.RECENT_REPOSITORIES,
      [],
    );
    return repos;
  }

  public addRecentRepository(repository: GithubRepository): void {
    const repos = this.getRecentRepositories();

    const maxRecent =
      vscode.workspace
        .getConfiguration("aidd")
        .get<number>("maxRecentRepositories") ?? 5;

    const filteredRepos = repos.filter(
      (repo) =>
        !(repo.owner === repository.owner && repo.name === repository.name),
    );

    filteredRepos.unshift(repository);

    const limitedRepos = filteredRepos.slice(0, maxRecent);

    this.context.globalState.update(
      StorageKey.RECENT_REPOSITORIES,
      limitedRepos,
    );

    this.setLastRepository(repository);
  }

  public getLastRepository(): GithubRepository | undefined {
    return this.context.globalState.get<GithubRepository>(
      StorageKey.LAST_REPOSITORY,
    );
  }

  public setLastRepository(repository: GithubRepository): void {
    this.context.globalState.update(StorageKey.LAST_REPOSITORY, repository);
  }

  public clearStorage(): void {
    this.context.globalState.update(StorageKey.RECENT_REPOSITORIES, undefined);
    this.context.globalState.update(StorageKey.LAST_REPOSITORY, undefined);
  }
}
