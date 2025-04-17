import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import type { GithubRepository } from "../api/types";
import type { IHttpClient } from "./httpClient";
import type { ILogger } from "./logger";

export interface DownloadFile {
  targetPath: string;
  type: "file" | "dir";
  size?: number;

  downloadUrl?: string | null;
  base64Content?: string;
}

export interface DownloadResult {
  file: DownloadFile;
  success: boolean;
  error?: Error;
}

export interface IDownloadService {
  downloadFiles(
    files: DownloadFile[],
    workspaceFolder: string,
    repository: GithubRepository,
  ): Promise<DownloadResult[]>;
  cancelDownloads(): void;
}

export class DownloadService implements IDownloadService {
  private isCancelled = false;

  private readonly httpClient: IHttpClient;

  constructor(
    private readonly logger: ILogger,
    httpClient: IHttpClient,
  ) {
    this.httpClient = httpClient;
  }

  public async downloadFiles(
    files: DownloadFile[],
    workspaceFolder: string,
    repository: GithubRepository,
  ): Promise<DownloadResult[]> {
    if (files.length === 0 || !repository) {
      this.logger.warn(
        "downloadFiles called with no files or no repository info.",
      );
      return [];
    }

    this.isCancelled = false;

    const directoriesToCreate = files.filter((f) => f.type === "dir");
    const filesToDownload = files.filter((f) => f.type === "file");

    const totalFiles = filesToDownload.length;
    let processedFiles = 0;
    const results: DownloadResult[] = [];

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Downloading files from GitHub",
        cancellable: true,
      },
      async (progress, token) => {
        token.onCancellationRequested(() => {
          this.cancelDownloads();
          this.logger.info("Download cancelled by user");
        });

        for (const dir of directoriesToCreate) {
          if (this.isCancelled) {
            break;
          }
          try {
            await this.createDirectory(
              path.join(workspaceFolder, dir.targetPath),
            );
          } catch (error) {
            this.logger.error(
              `Failed to create directory: ${dir.targetPath}`,
              error,
            );
          }
        }

        const allFilePromises = filesToDownload.map(async (file) => {
          if (this.isCancelled) {
            throw new Error("Download cancelled");
          }

          progress.report({
            message: `Downloading ${file.targetPath} (${++processedFiles}/${totalFiles})`,
            increment: 100 / totalFiles,
          });

          const targetPath = path.join(workspaceFolder, file.targetPath);
          const parentDir = path.dirname(targetPath);

          try {
            await this.createDirectory(parentDir);

            if (file.downloadUrl) {
              this.logger.debug(
                `Using provided downloadUrl for ${file.targetPath}`,
              );
              await this.downloadFileFromUrl(file.downloadUrl, targetPath);
            } else if (file.base64Content) {
              this.logger.debug(
                `Using provided base64 content for ${file.targetPath}`,
              );
              await this.writeFileContent(file.base64Content, targetPath);
            } else {
              this.logger.error(
                `Missing downloadUrl and base64Content for file: ${file.targetPath}`,
              );
              throw new Error(
                `No download details (URL or content) provided for ${file.targetPath}`,
              );
            }

            return { file, success: true };
          } catch (error) {
            this.logger.error(`Failed to process ${file.targetPath}`, error);

            return {
              file,
              success: false,
              error: error instanceof Error ? error : new Error(String(error)),
            };
          }
        });

        const settledResults = await Promise.allSettled(allFilePromises);

        for (const result of settledResults) {
          if (result.status === "fulfilled") {
            results.push(result.value);
            if (result.value.success) {
              this.logger.debug(`Processed ${result.value.file.targetPath}`);
            }
          } else {
            if (
              !(
                result.reason instanceof Error &&
                result.reason.message === "Download cancelled"
              )
            ) {
              this.logger.error(
                "An unexpected error occurred during file processing promise",
                result.reason,
              );
            }
          }
        }

        if (this.isCancelled) {
          this.logger.info("Download process completed after cancellation.");
        }

        return results;
      },
    );
  }

  public cancelDownloads(): void {
    this.isCancelled = true;
  }

  private async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      this.logger.error(`Error creating directory ${dirPath}`, error);
      throw error;
    }
  }

  /** Writes base64 encoded content to a file */
  private async writeFileContent(
    base64Content: string,
    targetPath: string,
  ): Promise<void> {
    try {
      const buffer = Buffer.from(base64Content, "base64");
      await fs.promises.writeFile(targetPath, buffer);
      this.logger.debug(`Successfully wrote base64 content to ${targetPath}`);
    } catch (error) {
      this.logger.error(`Error writing base64 content to ${targetPath}`, error);
      throw error;
    }
  }

  /** Downloads a file directly from a given URL using HttpClient */
  private async downloadFileFromUrl(
    url: string,
    targetPath: string,
  ): Promise<void> {
    if (!url) {
      throw new Error("Download URL is missing");
    }
    if (this.isCancelled) {
      throw new Error("Download cancelled");
    }

    try {
      await this.httpClient.downloadFile(url, targetPath);
      this.logger.debug(`HttpClient successfully downloaded ${url}`);
    } catch (error) {
      this.logger.error(`HttpClient failed to download ${url}`, error);

      throw error;
    }
  }
}
