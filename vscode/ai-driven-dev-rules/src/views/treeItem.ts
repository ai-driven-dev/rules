import * as vscode from 'vscode';
import * as path from 'path';
import { GithubContent } from '../github/types';

/**
 * Selection state for tree items
 */
export enum SelectionState {
    Unselected,
    Selected,
    Indeterminate
}

/**
 * Tree item representing a GitHub repository item
 */
export class GithubExplorerItem extends vscode.TreeItem {
    /**
     * Children of this item
     */
    public children: GithubExplorerItem[] = [];
    
    /**
     * Selection state
     */
    public selectionState: SelectionState = SelectionState.Unselected;
    
    /**
     * Original GitHub content
     */
    public readonly content: GithubContent;
    
    /**
     * Parent item
     */
    public parent: GithubExplorerItem | undefined;

    constructor(
        content: GithubContent,
        parent?: GithubExplorerItem
    ) {
        // Create tree item with appropriate label and collapsible state
        super(
            content.name,
            content.type === 'dir' 
                ? vscode.TreeItemCollapsibleState.Collapsed 
                : vscode.TreeItemCollapsibleState.None
        );
        
        this.content = content;
        this.parent = parent;
        
        // Set tooltip to show the full path
        this.tooltip = content.path;
        
        // Set context value for command enablement
        this.contextValue = content.type === 'dir' ? 'directory' : 'file';
        
        // Set description to show file size for files
        if (content.type === 'file' && content.size) {
            this.description = this.formatFileSize(content.size);
        }
        
        // Update icon based on item type and selection state
        this.updateIcon();
        
        // Add command to toggle selection when clicked
        this.command = {
            command: 'githubExplorer.toggleSelection',
            title: 'Toggle Selection',
            arguments: [this]
        };
    }

    /**
     * Update icon based on item type and selection state
     */
    public updateIcon(): void {
        // Use built-in VS Code icons
        if (this.content.type === 'dir') {
            // Directory icon
            this.iconPath = new vscode.ThemeIcon(this.getFolderIconId());
        } else {
            // File icon
            this.iconPath = new vscode.ThemeIcon(this.getFileIconId());
        }
    }

    /**
     * Get folder icon ID based on selection state
     */
    private getFolderIconId(): string {
        switch (this.selectionState) {
            case SelectionState.Selected:
                return 'folder-active';
            case SelectionState.Indeterminate:
                return 'folder-opened';
            default:
                return 'folder';
        }
    }

    /**
     * Get file icon ID based on selection state
     */
    private getFileIconId(): string {
        switch (this.selectionState) {
            case SelectionState.Selected:
                return 'file-added';
            case SelectionState.Indeterminate:
                return 'file-modified';
            default:
                return 'file';
        }
    }

    /**
     * Toggle selection state
     */
    public toggleSelection(): void {
        // Toggle between selected and unselected
        this.selectionState = this.selectionState === SelectionState.Selected 
            ? SelectionState.Unselected 
            : SelectionState.Selected;
        
        // Update icon
        this.updateIcon();
        
        // Update children if this is a directory
        if (this.content.type === 'dir') {
            this.updateChildrenSelection();
        }
        
        // Update parent selection state
        this.updateParentSelection();
    }

    /**
     * Update selection state of children
     */
    private updateChildrenSelection(): void {
        for (const child of this.children) {
            child.selectionState = this.selectionState;
            child.updateIcon();
            
            // Recursively update children
            if (child.content.type === 'dir') {
                child.updateChildrenSelection();
            }
        }
    }

    /**
     * Update selection state of parent
     */
    private updateParentSelection(): void {
        if (!this.parent) {
            return;
        }
        
        // Count selected and total children
        const childStates = this.parent.children.map(child => child.selectionState);
        const selectedCount = childStates.filter(state => state === SelectionState.Selected).length;
        const indeterminateCount = childStates.filter(state => state === SelectionState.Indeterminate).length;
        
        // Update parent selection state
        if (selectedCount === 0 && indeterminateCount === 0) {
            this.parent.selectionState = SelectionState.Unselected;
        } else if (selectedCount === this.parent.children.length) {
            this.parent.selectionState = SelectionState.Selected;
        } else {
            this.parent.selectionState = SelectionState.Indeterminate;
        }
        
        // Update parent icon
        this.parent.updateIcon();
        
        // Recursively update parent's parent
        this.parent.updateParentSelection();
    }

    /**
     * Format file size for display
     * @param size File size in bytes
     * @returns Formatted file size
     */
    private formatFileSize(size: number): string {
        if (size < 1024) {
            return `${size} B`;
        } else if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(1)} KB`;
        } else if (size < 1024 * 1024 * 1024) {
            return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        } else {
            return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
        }
    }
}
