import * as fs from "node:fs";
import * as https from "node:https";
import * as path from "node:path";
import { URL } from "node:url";
import * as vscode from "vscode";
import type { IGitHubApiService } from "../api/github"; // Import GitHub service interface
import type { GithubRepository } from "../api/types"; // Import Repository type
import type { ILogger } from "./logger";
import type { Settings } from "./storage";

export interface DownloadFile {
  url?: string; // Make URL optional
  targetPath: string;
  type: "file" | "dir";
  size?: number;
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
    repository: GithubRepository, // Add repository info
  ): Promise<DownloadResult[]>;
  cancelDownloads(): void;
  updateSettings(settings: Settings): void;
}

export class DownloadService implements IDownloadService {
  private isCancelled = false;
  private activeDownloads = 0;
  private downloadQueue: DownloadFile[] = [];
  private settings: Settings;
  private readonly githubService: IGitHubApiService; // Add GitHub service instance

  constructor(
    private readonly logger: ILogger,
    settings: Settings,
    githubService: IGitHubApiService, // Inject GitHub service
  ) {
    this.settings = settings;
    this.githubService = githubService; // Store GitHub service instance
  }

  public updateSettings(settings: Settings): void {
    this.settings = settings;
  }

  public async downloadFiles(
    files: DownloadFile[],
    workspaceFolder: string,
    repository: GithubRepository, // Add repository parameter
  ): Promise<DownloadResult[]> {
    if (files.length === 0 || !repository) {
      this.logger.warn(
        "downloadFiles called with no files or no repository info.",
      );
      return [];
    }

    this.isCancelled = false;
    this.activeDownloads = 0;
    // Separate directories and files upfront
    const directoriesToCreate = files.filter((f) => f.type === "dir");
    const filesToDownload = files.filter((f) => f.type === "file");
    this.downloadQueue = [...filesToDownload]; // Queue only files

    const totalFiles = filesToDownload.length; // Use the count of files to download
    let downloadedFiles = 0;
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

        // Process directory creation first
        for (const dir of directoriesToCreate) {
          try {
            await this.createDirectory(
              path.join(workspaceFolder, dir.targetPath),
            );
            // Optionally add success result for directory creation if needed
            // results.push({ file: dir, success: true });
          } catch (error) {
            this.logger.error(
              `Failed to create directory: ${dir.targetPath}`,
              error,
            );
            // Optionally add failure result for directory creation if needed
            // results.push({ file: dir, success: false, error: error instanceof Error ? error : new Error(String(error)) });
            // Decide if directory creation failure should stop the whole process
          }
        }

        // Now process file downloads
        const downloadPromises: Promise<void>[] = [];

        const startNextDownload = async (): Promise<void> => {
          if (this.isCancelled || this.downloadQueue.length === 0) {
            return;
          }

          // Queue only contains files now, shift() should always return a file or undefined
          const file = this.downloadQueue.shift();
          if (!file) {
            // Only check if queue is empty
            return;
          }

          this.activeDownloads++;

          try {
            progress.report({
              message: `Downloading ${
                file.targetPath
              } (${++downloadedFiles}/${totalFiles})`,
              increment: 100 / totalFiles,
            });

            const targetPath = path.join(workspaceFolder, file.targetPath);
            // const targetPath = path.join(workspaceFolder, file.targetPath); // REMOVED DUPLICATE
            const parentDir = path.dirname(targetPath);
            await this.createDirectory(parentDir); // Ensure parent directory exists

            // Fetch content details using the path
            const contentResult =
              await this.githubService.fetchRepositoryContent(
                repository,
                file.targetPath, // Use the relative path from the file object
              );

            // Check for API call failure first
            if (!contentResult.success) {
              throw new Error(
                `Failed to fetch content details for ${file.targetPath}: ${contentResult.error?.message || "Unknown API error"}`,
              );
            }
            // Check if data array is empty or missing (shouldn't happen if success is true, but good practice)
            if (!contentResult.data || contentResult.data.length === 0) {
              throw new Error(
                `Failed to fetch content details for ${file.targetPath}: API returned success but no data found.`,
              );
            }

            const contentData = contentResult.data[0]; // Assuming fetchRepositoryContent returns an array for single path

            // --- BEGIN ADDED LOG ---
            this.logger.debug(
              `Received content data for ${file.targetPath}: ${JSON.stringify(contentData, null, 2)}`,
            );
            // --- END ADDED LOG ---

            if (contentData.download_url) {
              // If download_url is available (e.g., for large files), use it
              this.logger.debug(`Using download_url for ${file.targetPath}`);
              await this.downloadFileFromUrl(
                contentData.download_url,
                targetPath,
              );
            } else if (contentData.content) {
              // If content (base64) is available, decode and write it
              this.logger.debug(`Using base64 content for ${file.targetPath}`);
              await this.writeFileContent(contentData.content, targetPath);
            } else {
              throw new Error(
                `No download_url or content found for ${file.targetPath}`,
              );
            }

            results.push({ file, success: true });
            this.logger.debug(`Processed ${file.targetPath}`);
          } catch (error) {
            this.logger.error(`Failed to process ${file.targetPath}`, error);
            results.push({
              file,
              success: false,
              error: error instanceof Error ? error : new Error(String(error)),
            });
          } finally {
            this.activeDownloads--;

            if (!this.isCancelled) {
              downloadPromises.push(startNextDownload());
            }
          }
        };

        // Start downloads based on the number of files to download
        const initialBatch = Math.min(
          this.settings.maxConcurrentDownloads,
          filesToDownload.length, // Use the correct count
        );
        for (let i = 0; i < initialBatch; i++) {
          // No need to check queue length here, startNextDownload handles empty queue
          downloadPromises.push(startNextDownload());
        }

        await Promise.all(downloadPromises);

        return results;
      },
    );
  }

  public cancelDownloads(): void {
    this.isCancelled = true;
    this.downloadQueue = [];
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
      throw error; // Re-throw to be caught by the main download loop
    }
  }

  /** Downloads a file directly from a given URL */
  private downloadFileFromUrl(url: string, targetPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!url) {
        reject(new Error("Download URL is missing"));
        return;
      }
      if (this.isCancelled) {
        reject(new Error("Download cancelled"));
        return;
      }

      const parsedUrl = new URL(url);

      const request = https.get(parsedUrl, (response) => {
        if (this.isCancelled) {
          reject(new Error("Download cancelled"));
          return;
        }

        if (response.statusCode === 200) {
          const file = fs.createWriteStream(targetPath);

          response.pipe(file);

          file.on("finish", () => {
            file.close();
            resolve();
          });

          file.on("error", (error) => {
            fs.unlink(targetPath, () => {
              reject(error);
            });
          });
        } else if (response.statusCode === 302 || response.statusCode === 301) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            // Recursively call with the new URL
            this.downloadFileFromUrl(redirectUrl, targetPath)
              .then(resolve)
              .catch(reject);
          } else {
            reject(
              new Error(
                `Redirect without location header: ${response.statusCode}`,
              ),
            );
          }
        } else {
          reject(new Error(`Failed to download file: ${response.statusCode}`));
        }
      });

      request.on("error", (error) => {
        reject(error);
      });

      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error("Download timeout"));
      });
    });
  }
}
