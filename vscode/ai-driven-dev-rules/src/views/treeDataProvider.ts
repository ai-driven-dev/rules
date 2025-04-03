import * as vscode from 'vscode';
import { GitHubApiService } from '../github/api';
import { GithubRepository } from '../github/types';
import { GithubExplorerItem } from './treeItem';

/**
 * Tree data provider for GitHub repository explorer
 */
export class GithubExplorerProvider implements vscode.TreeDataProvider<GithubExplorerItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<GithubExplorerItem | undefined | null | void> = new vscode.EventEmitter<GithubExplorerItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<GithubExplorerItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private githubService: GitHubApiService;
    private repository: GithubRepository | null = null;
    private rootItems: GithubExplorerItem[] = [];
    private loadingItems: Map<string, Promise<GithubExplorerItem[]>> = new Map();

    constructor() {
        this.githubService = GitHubApiService.getInstance();
    }

    /**
     * Refresh the tree view
     * @param item Item to refresh, or undefined to refresh entire tree
     */
    public refresh(item?: GithubExplorerItem): void {
        if (item) {
            // Clear cached children for this item
            this.loadingItems.delete(item.content.path);
        } else {
            // Clear all cached items
            this.loadingItems.clear();
            this.rootItems = [];
        }
        
        this._onDidChangeTreeData.fire(item);
    }

    /**
     * Set repository to display
     * @param repository Repository information
     */
    public setRepository(repository: GithubRepository): void {
        this.repository = repository;
        this.refresh();
    }

    /**
     * Get all selected items
     * @returns Array of selected items
     */
    public getSelectedItems(): GithubExplorerItem[] {
        const selectedItems: GithubExplorerItem[] = [];
        
        // Helper function to recursively collect selected items
        const collectSelectedItems = (items: GithubExplorerItem[]) => {
            for (const item of items) {
                if (item.selectionState === 1) { // Selected
                    selectedItems.push(item);
                }
                
                if (item.children.length > 0) {
                    collectSelectedItems(item.children);
                }
            }
        };
        
        collectSelectedItems(this.rootItems);
        return selectedItems;
    }

    /**
     * Get tree item for element
     * @param element Tree item
     * @returns Tree item
     */
    public getTreeItem(element: GithubExplorerItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get children of element
     * @param element Parent element, or undefined for root
     * @returns Array of child elements
     */
    public async getChildren(element?: GithubExplorerItem): Promise<GithubExplorerItem[]> {
        // If no repository is set, return empty array
        if (!this.repository) {
            return [];
        }
        
        try {
            if (!element) {
                // Root level - fetch repository contents
                return this.getRootItems();
            } else if (element.content.type === 'dir') {
                // Directory - fetch contents
                return this.getDirectoryItems(element);
            } else {
                // File - no children
                return [];
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error fetching repository contents: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }

    /**
     * Get root items
     * @returns Array of root items
     */
    private async getRootItems(): Promise<GithubExplorerItem[]> {
        if (this.rootItems.length > 0) {
            return this.rootItems;
        }
        
        if (!this.repository) {
            return [];
        }
        
        try {
            const contents = await this.githubService.fetchRepositoryContent(this.repository);
            this.rootItems = contents.map(content => new GithubExplorerItem(content));
            return this.rootItems;
        } catch (error) {
            vscode.window.showErrorMessage(`Error fetching repository contents: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }

    /**
     * Get directory items
     * @param parent Parent directory item
     * @returns Array of child items
     */
    private async getDirectoryItems(parent: GithubExplorerItem): Promise<GithubExplorerItem[]> {
        const path = parent.content.path;
        
        // Check if we're already loading this directory
        if (this.loadingItems.has(path)) {
            return this.loadingItems.get(path)!;
        }
        
        // If children are already loaded, return them
        if (parent.children.length > 0) {
            return parent.children;
        }
        
        if (!this.repository) {
            return [];
        }
        
        // Start loading children
        const loadingPromise = (async () => {
            try {
                const contents = await this.githubService.fetchRepositoryContent(this.repository!, path);
                
                // Create tree items for each content item
                const items = contents.map(content => {
                    const item = new GithubExplorerItem(content, parent);
                    
                    // Inherit selection state from parent
                    if (parent.selectionState !== 0) { // Not unselected
                        item.selectionState = parent.selectionState;
                        item.updateIcon();
                    }
                    
                    return item;
                });
                
                // Store children in parent
                parent.children = items;
                
                return items;
            } catch (error) {
                vscode.window.showErrorMessage(`Error fetching directory contents: ${error instanceof Error ? error.message : String(error)}`);
                return [];
            } finally {
                // Remove from loading map
                this.loadingItems.delete(path);
            }
        })();
        
        // Store loading promise
        this.loadingItems.set(path, loadingPromise);
        
        return loadingPromise;
    }

    /**
     * Get parent of element
     * @param element Element to get parent of
     * @returns Parent element, or null if no parent
     */
    public getParent(element: GithubExplorerItem): vscode.ProviderResult<GithubExplorerItem> {
        return element.parent;
    }
}
