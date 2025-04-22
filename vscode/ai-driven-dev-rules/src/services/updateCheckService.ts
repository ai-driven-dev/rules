import type * as vscode from "vscode"; // Use import type
import type { IGitHubApiService } from "../api/github";
import type { GithubContent, GithubRepository } from "../api/types"; // Use GithubContent instead of GithubTreeItem
import type { ILogger } from "./logger";

// Define the structure for the update status of a single file
export type UpdateStatus =
  | "up-to-date"
  | "update-available"
  | "remote-deleted"
  | "remote-new"
  | "unknown"; // Added remote-new, removed local-only

export interface FileUpdateStatus {
  filePath: string;
  status: UpdateStatus;
  localSha?: string;
  remoteSha?: string;
}

// Define the result structure for the update check
export interface UpdateCheckResult {
  repository: GithubRepository;
  statuses: FileUpdateStatus[];
  error?: Error;
}

// Interface for the Update Check Service
export interface IUpdateCheckService {
  checkUpdates(repository: GithubRepository): Promise<UpdateCheckResult>;
}

// Implementation of the Update Check Service
export class UpdateCheckService implements IUpdateCheckService {
  constructor(
    private readonly logger: ILogger,
    private readonly githubApiService: IGitHubApiService,
    private readonly context: vscode.ExtensionContext,
  ) {}

  public async checkUpdates(
    repository: GithubRepository,
  ): Promise<UpdateCheckResult> {
    this.logger.info(
      `Checking for updates in repository: ${repository.owner}/${repository.name}`,
    );

    const statuses: FileUpdateStatus[] = [];
    const workspaceStateKey = `aidd.downloadedFiles.${repository.owner}.${repository.name}`;
    const localFilesState =
      this.context.workspaceState.get<{ [filePath: string]: { sha: string } }>(
        workspaceStateKey,
      ) || {};

    try {
      // 1. Fetch remote file tree (using the correct method)
      const contentResult =
        await this.githubApiService.fetchRepositoryContentRecursive(repository);
      if (!contentResult.success) {
        this.logger.error(
          "Failed to fetch remote content",
          contentResult.error,
        );
        throw contentResult.error instanceof Error
          ? contentResult.error
          : new Error("Failed to fetch remote content");
      }

      // 2. Create a map of remote files (path -> sha) from GithubContent[]
      const remoteFilesMap = new Map<string, string>();
      for (const item of contentResult.data) {
        // We only care about files for SHA comparison
        if (item.type === "file" && item.path && item.sha) {
          remoteFilesMap.set(item.path, item.sha);
        }
      }

      // 3. Compare local state with remote map & identify deleted/updated files
      const processedRemotePaths = new Set<string>(); // Keep track of remote files we've matched
      for (const filePath in localFilesState) {
        if (Object.prototype.hasOwnProperty.call(localFilesState, filePath)) {
          const localSha = localFilesState[filePath].sha;
          const remoteSha = remoteFilesMap.get(filePath);
          processedRemotePaths.add(filePath); // Mark this path as seen

          let status: UpdateStatus = "unknown";
          if (remoteSha) {
            // File exists remotely
            if (localSha === remoteSha) {
              status = "up-to-date";
            } else {
              status = "update-available";
            }
          } else {
            // File does not exist remotely (was deleted or renamed)
            status = "remote-deleted";
          }

          statuses.push({
            filePath,
            status,
            localSha,
            remoteSha: remoteSha ?? undefined,
          });
        }
      }

      // 4. Identify new files present only remotely
      for (const [filePath, remoteSha] of remoteFilesMap.entries()) {
        if (!processedRemotePaths.has(filePath)) {
          // This file exists remotely but not in our local state
          statuses.push({
            filePath,
            status: "remote-new",
            remoteSha,
          });
        }
      }

      this.logger.info(
        `Update check completed for ${repository.owner}/${repository.name}. Found ${statuses.length} tracked files.`,
      );
      return { repository, statuses };
    } catch (error) {
      this.logger.error("Failed to check for updates", error);
      return {
        repository,
        statuses: [], // Return empty statuses on error
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
