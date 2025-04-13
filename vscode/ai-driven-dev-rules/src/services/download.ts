import * as fs from "fs";
import * as https from "https";
import * as path from "path";
import { URL } from "url";
import * as vscode from "vscode";
import { ILogger } from "./logger";
import { Settings } from "./storage";


export interface DownloadFile {
  url: string;
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
    workspaceFolder: string
  ): Promise<DownloadResult[]>;
  cancelDownloads(): void;
  updateSettings(settings: Settings): void;
}


export class DownloadService implements IDownloadService {
  private isCancelled = false;
  private activeDownloads = 0;
  private downloadQueue: DownloadFile[] = [];
  private settings: Settings;


  constructor(private readonly logger: ILogger, settings: Settings) {
    this.settings = settings;
  }


  public updateSettings(settings: Settings): void {
    this.settings = settings;
  }


  public async downloadFiles(
    files: DownloadFile[],
    workspaceFolder: string
  ): Promise<DownloadResult[]> {
    if (files.length === 0) {
      return [];
    }


    this.isCancelled = false;
    this.activeDownloads = 0;
    this.downloadQueue = [...files];


    const totalFiles = files.filter((f) => f.type === "file").length;
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


        const fileDownloads = files.filter((f) => f.type === "file");


        const downloadPromises: Promise<void>[] = [];


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

            progress.report({
              message: `Downloading ${
                file.targetPath
              } (${++downloadedFiles}/${totalFiles})`,
              increment: 100 / totalFiles,
            });


            const targetPath = path.join(workspaceFolder, file.targetPath);
            const parentDir = path.dirname(targetPath);
            await this.createDirectory(parentDir);


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


            if (!this.isCancelled) {
              downloadPromises.push(startNextDownload());
            }
          }
        };


        const initialBatch = Math.min(
          this.settings.maxConcurrentDownloads,
          fileDownloads.length
        );
        for (let i = 0; i < initialBatch; i++) {
          downloadPromises.push(startNextDownload());
        }


        await Promise.all(downloadPromises);


        return results;
      }
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


      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error("Download timeout"));
      });
    });
  }
}
