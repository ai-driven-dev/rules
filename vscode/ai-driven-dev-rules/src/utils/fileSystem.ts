import * as fs from "fs";
import * as https from "https";
import * as path from "path";
import { URL } from "url";
import * as vscode from "vscode";
import { ExplorerTreeItem } from "../views/explorer/treeItem";

export class FileSystemService {
	private static instance: FileSystemService;
	private outputChannel: vscode.OutputChannel;

	private constructor() {
		this.outputChannel = vscode.window.createOutputChannel(
			"GitHub Explorer File System",
		);
	}

	public static getInstance(): FileSystemService {
		if (!FileSystemService.instance) {
			FileSystemService.instance = new FileSystemService();
		}
		return FileSystemService.instance;
	}

	public async downloadFiles(items: ExplorerTreeItem[]): Promise<void> {
		if (items.length === 0) {
			vscode.window.showInformationMessage("No files selected for download");
			return;
		}

		const workspaceFolder = this.getWorkspaceFolder();
		if (!workspaceFolder) {
			vscode.window.showErrorMessage(
				"No workspace folder open. Please open a folder to download files.",
			);
			return;
		}

		return vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: "Downloading files from GitHub",
				cancellable: true,
			},
			async (progress, token) => {
				const totalFiles = this.countFiles(items);
				let downloadedFiles = 0;

				token.onCancellationRequested(() => {
					this.log("Download cancelled by user");
				});

				try {
					for (const item of items) {
						if (token.isCancellationRequested) {
							break;
						}

						await this.downloadItem(
							item,
							workspaceFolder,
							progress,
							token,
							totalFiles,
							downloadedFiles,
						);
						downloadedFiles++;
					}

					if (!token.isCancellationRequested) {
						vscode.window.showInformationMessage(
							`Successfully downloaded ${downloadedFiles} files`,
						);
					}
				} catch (error) {
					this.logError("Error downloading files", error);
					vscode.window.showErrorMessage(
						`Error downloading files: ${
							error instanceof Error ? error.message : String(error)
						}`,
					);
				}
			},
		);
	}

	private async downloadItem(
		item: ExplorerTreeItem,
		workspaceFolder: string,
		progress: vscode.Progress<{ message?: string; increment?: number }>,
		token: vscode.CancellationToken,
		totalFiles: number,
		downloadedFiles: number,
	): Promise<void> {
		if (token.isCancellationRequested) {
			return;
		}

		const relativePath = item.content.path;
		const targetPath = path.join(workspaceFolder, relativePath);

		if (item.content.type === "dir") {
			await this.createDirectory(targetPath);

			for (const child of item.children) {
				if (token.isCancellationRequested) {
					break;
				}

				await this.downloadItem(
					child,
					workspaceFolder,
					progress,
					token,
					totalFiles,
					downloadedFiles,
				);
				downloadedFiles++;
			}
		} else if (item.content.type === "file") {
			progress.report({
				message: `Downloading ${relativePath}`,
				increment: 100 / totalFiles,
			});

			const parentDir = path.dirname(targetPath);
			await this.createDirectory(parentDir);

			if (item.content.download_url) {
				await this.downloadFile(item.content.download_url, targetPath);
				this.log(`Downloaded ${relativePath}`);
			} else {
				this.log(`No download URL for ${relativePath}`);
			}
		}
	}

	private async createDirectory(dirPath: string): Promise<void> {
		try {
			await fs.promises.mkdir(dirPath, { recursive: true });
		} catch (error) {
			this.logError(`Error creating directory ${dirPath}`, error);
			throw error;
		}
	}

	private downloadFile(url: string, targetPath: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const parsedUrl = new URL(url);

			https
				.get(parsedUrl, (response) => {
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
					} else if (
						response.statusCode === 302 ||
						response.statusCode === 301
					) {
						const redirectUrl = response.headers.location;
						if (redirectUrl) {
							this.downloadFile(redirectUrl, targetPath)
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
						reject(
							new Error(`Failed to download file: ${response.statusCode}`),
						);
					}
				})
				.on("error", (error) => {
					reject(error);
				});
		});
	}

	private getWorkspaceFolder(): string | undefined {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return undefined;
		}

		return workspaceFolders[0].uri.fsPath;
	}

	private countFiles(items: ExplorerTreeItem[]): number {
		let count = 0;

		for (const item of items) {
			if (item.content.type === "file") {
				count++;
			} else if (item.content.type === "dir") {
				count += this.countFiles(item.children);
			}
		}

		return count;
	}

	private log(message: string): void {
		this.outputChannel.appendLine(
			`[${new Date().toLocaleTimeString()}] ${message}`,
		);
	}

	private logError(message: string, error: any): void {
		this.outputChannel.appendLine(
			`[${new Date().toLocaleTimeString()}] ERROR: ${message}`,
		);
		if (error instanceof Error) {
			this.outputChannel.appendLine(`${error.message}`);
			if (error.stack) {
				this.outputChannel.appendLine(error.stack);
			}
		} else if (typeof error === "object") {
			this.outputChannel.appendLine(JSON.stringify(error, null, 2));
		} else {
			this.outputChannel.appendLine(String(error));
		}
	}
}
