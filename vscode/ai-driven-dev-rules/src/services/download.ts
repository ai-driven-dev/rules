import * as fs from "fs";
import * as https from "https";
import * as path from "path";
import { URL } from "url";
import * as vscode from "vscode";
import { ILogger } from "./logger";
import { Settings } from "./storage";

/**
 * Download file information
 */
export interface DownloadFile {
  url: string;
  targetPath: string;
  type: "file" | "dir";
  size?: number;
}

/**
 * Download file result
 */
export interface DownloadResult {
  file: DownloadFile;
  success: boolean;
  error?: Error;
}

/**
 * Download service interface
 */
export interface IDownloadService {
  downloadFiles(
    files: DownloadFile[],
    workspaceFolder: string
  ): Promise<DownloadResult[]>;
  cancelDownloads(): void;
  updateSettings(settings: Settings): void;
}

/**
 * Download service implementation
 */
export class DownloadService implements IDownloadService {
  private isCancelled = false;
  private activeDownloads = 0;
  private downloadQueue: DownloadFile[] = [];
  private settings: Settings;

  /**
   * Create a new download service
   * @param logger Logger service
   * @param settings Extension settings
   */
  constructor(private readonly logger: ILogger, settings: Settings) {
    this.settings = settings;
  }

  /**
   * Update settings
   * @param settings New settings
   */
  public updateSettings(settings: Settings): void {
    this.settings = settings;
  }

  /**
   * Download multiple files
   * @param files Files to download
   * @param workspaceFolder Workspace folder path
   * @returns Promise that resolves with download results
   */
  public async downloadFiles(
    files: DownloadFile[],
    workspaceFolder: string
  ): Promise<DownloadResult[]> {
    if (files.length === 0) {
      return [];
    }

    // Reset cancellation flag
    this.isCancelled = false;
    this.activeDownloads = 0;
    this.downloadQueue = [...files];

    // Count total items for progress
    const totalFiles = files.filter((f) => f.type === "file").length;
    let downloadedFiles = 0;
    const results: DownloadResult[] = [];

    // Show progress
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Downloading files from GitHub",
        cancellable: true,
      },
      async (progress, token) => {
        // Handle cancellation
        token.onCancellationRequested(() => {
          this.cancelDownloads();
          this.logger.info("Download cancelled by user");
        });

        // Create directories first
        for (const file of files.filter((f) => f.type === "dir")) {
          try {
            await this.createDirectory(
              path.join(workspaceFolder, file.targetPath)
            );
            results.push({ file, success: true });
          } catch (error) {
            this.logger.error(
              `Failed to create directory: ${file.targetPath}`,
              error
            );
            results.push({
              file,
              success: false,
              error: error instanceof Error ? error : new Error(String(error)),
            });
          }
        }

        // Start concurrent downloads up to the limit
        const fileDownloads = files.filter((f) => f.type === "file");

        // Process downloads with concurrency limit
        const downloadPromises: Promise<void>[] = [];

        // Helper to start next download
        const startNextDownload = async (): Promise<void> => {
          if (this.isCancelled || this.downloadQueue.length === 0) {
            return;
          }

          const file = this.downloadQueue.shift();
          if (!file || file.type !== "file") {
            return;
          }

          this.activeDownloads++;

          try {
            // Update progress
            progress.report({
              message: `Downloading ${
                file.targetPath
              } (${++downloadedFiles}/${totalFiles})`,
              increment: 100 / totalFiles,
            });

            // Create parent directory
            const targetPath = path.join(workspaceFolder, file.targetPath);
            const parentDir = path.dirname(targetPath);
            await this.createDirectory(parentDir);

            // Download file
            await this.downloadFile(file.url, targetPath);
            results.push({ file, success: true });
            this.logger.debug(`Downloaded ${file.targetPath}`);
          } catch (error) {
            this.logger.error(`Failed to download ${file.targetPath}`, error);
            results.push({
              file,
              success: false,
              error: error instanceof Error ? error : new Error(String(error)),
            });
          } finally {
            this.activeDownloads--;

            // Start next download
            if (!this.isCancelled) {
              downloadPromises.push(startNextDownload());
            }
          }
        };

        // Start initial batch of downloads
        const initialBatch = Math.min(
          this.settings.maxConcurrentDownloads,
          fileDownloads.length
        );
        for (let i = 0; i < initialBatch; i++) {
          downloadPromises.push(startNextDownload());
        }

        // Wait for all downloads to complete
        await Promise.all(downloadPromises);

        // Return results
        return results;
      }
    );
  }

  /**
   * Cancel active downloads
   */
  public cancelDownloads(): void {
    this.isCancelled = true;
    this.downloadQueue = [];
  }

  /**
   * Create directory if it doesn't exist
   * @param dirPath Directory path
   */
  private async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      this.logger.error(`Error creating directory ${dirPath}`, error);
      throw error;
    }
  }

  /**
   * Download file from URL
   * @param url File URL
   * @param targetPath Target path
   */
  private downloadFile(url: string, targetPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
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
          // Handle redirects
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            this.downloadFile(redirectUrl, targetPath)
              .then(resolve)
              .catch(reject);
          } else {
            reject(
              new Error(
                `Redirect without location header: ${response.statusCode}`
              )
            );
          }
        } else {
          reject(new Error(`Failed to download file: ${response.statusCode}`));
        }
      });

      request.on("error", (error) => {
        reject(error);
      });

      // Set a timeout
      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error("Download timeout"));
      });
    });
  }
}
