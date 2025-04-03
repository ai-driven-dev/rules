import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { URL } from 'url';
import { GithubExplorerItem } from '../views/treeItem';

/**
 * Service for file system operations
 */
export class FileSystemService {
    private static instance: FileSystemService;
    private outputChannel: vscode.OutputChannel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('GitHub Explorer File System');
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): FileSystemService {
        if (!FileSystemService.instance) {
            FileSystemService.instance = new FileSystemService();
        }
        return FileSystemService.instance;
    }

    /**
     * Download selected files
     * @param items Selected items to download
     * @returns Promise that resolves when all files are downloaded
     */
    public async downloadFiles(items: GithubExplorerItem[]): Promise<void> {
        if (items.length === 0) {
            vscode.window.showInformationMessage('No files selected for download');
            return;
        }

        // Get workspace folder
        const workspaceFolder = this.getWorkspaceFolder();
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open. Please open a folder to download files.');
            return;
        }

        // Show progress
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Downloading files from GitHub',
            cancellable: true
        }, async (progress, token) => {
            // Count total files to download
            const totalFiles = this.countFiles(items);
            let downloadedFiles = 0;

            // Create a cancellation token
            token.onCancellationRequested(() => {
                this.log('Download cancelled by user');
            });

            try {
                // Download each item
                for (const item of items) {
                    if (token.isCancellationRequested) {
                        break;
                    }

                    await this.downloadItem(item, workspaceFolder, progress, token, totalFiles, downloadedFiles);
                    downloadedFiles++;
                }

                if (!token.isCancellationRequested) {
                    vscode.window.showInformationMessage(`Successfully downloaded ${downloadedFiles} files`);
                }
            } catch (error) {
                this.logError('Error downloading files', error);
                vscode.window.showErrorMessage(`Error downloading files: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }

    /**
     * Download a single item
     * @param item Item to download
     * @param workspaceFolder Workspace folder
     * @param progress Progress reporter
     * @param token Cancellation token
     * @param totalFiles Total number of files
     * @param downloadedFiles Number of files downloaded so far
     */
    private async downloadItem(
        item: GithubExplorerItem,
        workspaceFolder: string,
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        token: vscode.CancellationToken,
        totalFiles: number,
        downloadedFiles: number
    ): Promise<void> {
        if (token.isCancellationRequested) {
            return;
        }

        const relativePath = item.content.path;
        const targetPath = path.join(workspaceFolder, relativePath);

        if (item.content.type === 'dir') {
            // Create directory
            await this.createDirectory(targetPath);

            // Download children
            for (const child of item.children) {
                if (token.isCancellationRequested) {
                    break;
                }

                await this.downloadItem(child, workspaceFolder, progress, token, totalFiles, downloadedFiles);
                downloadedFiles++;
            }
        } else if (item.content.type === 'file') {
            // Update progress
            progress.report({
                message: `Downloading ${relativePath}`,
                increment: 100 / totalFiles
            });

            // Create parent directory if it doesn't exist
            const parentDir = path.dirname(targetPath);
            await this.createDirectory(parentDir);

            // Download file
            if (item.content.download_url) {
                await this.downloadFile(item.content.download_url, targetPath);
                this.log(`Downloaded ${relativePath}`);
            } else {
                this.log(`No download URL for ${relativePath}`);
            }
        }
    }

    /**
     * Create directory if it doesn't exist
     * @param dirPath Directory path
     */
    private async createDirectory(dirPath: string): Promise<void> {
        try {
            await fs.promises.mkdir(dirPath, { recursive: true });
        } catch (error) {
            this.logError(`Error creating directory ${dirPath}`, error);
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
            const parsedUrl = new URL(url);
            
            https.get(parsedUrl, (response) => {
                if (response.statusCode === 200) {
                    const file = fs.createWriteStream(targetPath);
                    
                    response.pipe(file);
                    
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                    
                    file.on('error', (error) => {
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
                        reject(new Error(`Redirect without location header: ${response.statusCode}`));
                    }
                } else {
                    reject(new Error(`Failed to download file: ${response.statusCode}`));
                }
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Get workspace folder
     * @returns Workspace folder path
     */
    private getWorkspaceFolder(): string | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }
        
        return workspaceFolders[0].uri.fsPath;
    }

    /**
     * Count total number of files in items
     * @param items Items to count
     * @returns Total number of files
     */
    private countFiles(items: GithubExplorerItem[]): number {
        let count = 0;
        
        for (const item of items) {
            if (item.content.type === 'file') {
                count++;
            } else if (item.content.type === 'dir') {
                count += this.countFiles(item.children);
            }
        }
        
        return count;
    }

    /**
     * Log message to output channel
     * @param message Message to log
     */
    private log(message: string): void {
        this.outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ${message}`);
    }

    /**
     * Log error to output channel
     * @param message Error message
     * @param error Error object
     */
    private logError(message: string, error: any): void {
        this.outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ERROR: ${message}`);
        if (error instanceof Error) {
            this.outputChannel.appendLine(`${error.message}`);
            if (error.stack) {
                this.outputChannel.appendLine(error.stack);
            }
        } else if (typeof error === 'object') {
            this.outputChannel.appendLine(JSON.stringify(error, null, 2));
        } else {
            this.outputChannel.appendLine(String(error));
        }
    }
}
