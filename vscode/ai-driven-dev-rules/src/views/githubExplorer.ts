import * as vscode from 'vscode';
import { GithubExplorerProvider } from './treeDataProvider';
import { GithubExplorerItem } from './treeItem';
import { GitHubApiService } from '../github/api';
import { FileSystemService } from '../utils/fileSystem';

/**
 * GitHub Explorer view
 */
export class GithubExplorer {
    private treeDataProvider: GithubExplorerProvider;
    private treeView: vscode.TreeView<GithubExplorerItem>;
    private githubService: GitHubApiService;
    private fileSystemService: FileSystemService;

    constructor(context: vscode.ExtensionContext) {
        this.githubService = GitHubApiService.getInstance();
        this.fileSystemService = FileSystemService.getInstance();
        this.treeDataProvider = new GithubExplorerProvider();
        
        // Create tree view
        this.treeView = vscode.window.createTreeView('githubExplorer', {
            treeDataProvider: this.treeDataProvider,
            showCollapseAll: true,
            canSelectMany: false
        });
        
        // Register commands
        this.registerCommands(context);
    }

    /**
     * Register commands
     * @param context Extension context
     */
    private registerCommands(context: vscode.ExtensionContext): void {
        // Command to set repository
        context.subscriptions.push(
            vscode.commands.registerCommand('githubExplorer.setRepository', async () => {
                await this.promptForRepository();
            })
        );
        
        // Command to refresh view
        context.subscriptions.push(
            vscode.commands.registerCommand('githubExplorer.refresh', () => {
                this.treeDataProvider.refresh();
            })
        );
        
        // Command to toggle selection
        context.subscriptions.push(
            vscode.commands.registerCommand('githubExplorer.toggleSelection', (item: GithubExplorerItem) => {
                item.toggleSelection();
                this.treeDataProvider.refresh(item);
            })
        );
        
        // Command to download selected files
        context.subscriptions.push(
            vscode.commands.registerCommand('githubExplorer.downloadSelected', async () => {
                await this.downloadSelectedFiles();
            })
        );
    }

    /**
     * Prompt user for repository URL
     */
    private async promptForRepository(): Promise<void> {
        const repoUrl = await vscode.window.showInputBox({
            prompt: 'Enter GitHub repository URL',
            placeHolder: 'https://github.com/owner/repo',
            value: 'https://github.com/ai-driven-dev/rules',
            validateInput: (value) => {
                if (!value) {
                    return 'Repository URL is required';
                }
                
                const repo = this.githubService.parseRepositoryUrl(value);
                if (!repo) {
                    return 'Invalid GitHub repository URL';
                }
                
                return null;
            }
        });
        
        if (!repoUrl) {
            return;
        }
        
        const repo = this.githubService.parseRepositoryUrl(repoUrl);
        if (repo) {
            try {
                // Set repository and refresh view
                this.treeDataProvider.setRepository(repo);
                
                // Update tree view title
                this.treeView.title = `GitHub: ${repo.owner}/${repo.name}${repo.branch ? ` (${repo.branch})` : ''}`;
                
                // Show information message
                vscode.window.showInformationMessage(`Connected to GitHub repository: ${repo.owner}/${repo.name}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Error connecting to repository: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    /**
     * Download selected files
     */
    private async downloadSelectedFiles(): Promise<void> {
        const selectedItems = this.treeDataProvider.getSelectedItems();
        
        if (selectedItems.length === 0) {
            vscode.window.showInformationMessage('No files selected. Use the checkbox to select files to download.');
            return;
        }
        
        try {
            await this.fileSystemService.downloadFiles(selectedItems);
        } catch (error) {
            vscode.window.showErrorMessage(`Error downloading files: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
