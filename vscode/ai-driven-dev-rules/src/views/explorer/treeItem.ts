import * as vscode from "vscode";
import * as path from "path"; // Import path module
import { GithubContent } from "../../api/types";

/**
 * Tree item representing a GitHub repository content item
 */
export class ExplorerTreeItem extends vscode.TreeItem {
  /**
   * Children of this item
   */
  public children: ExplorerTreeItem[] = [];

  /**
  // Remove local selected state, it will be managed by SelectionService
  // public selected = false;

  /**
   * Current selection state (used for UI updates)
   */
  private _isSelected = false;

  /**
   * Original GitHub content
   */
  public readonly content: GithubContent;

  /**
   * Path to the extension's directory
   */
  private readonly extensionPath?: string;

  /**
   * Create a tree item
   * @param content GitHub content
   * @param parent Parent item
   * @param extensionPath Path to the extension's directory (optional)
   */
  constructor(
    content: GithubContent,
    public readonly parent?: ExplorerTreeItem,
    extensionPath?: string
  ) {
    // Create tree item with appropriate label and collapsible state
    super(
      content.name,
      content.type === "dir"
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    this.content = content;
    this.extensionPath = extensionPath; // Store extension path

    // Set tooltip to show the full path
    this.tooltip = content.path;

    // Set context value for command enablement
    this.contextValue = content.type === "dir" ? "directory" : "file";

    // Set description to show file size for files
    if (content.type === "file" && content.size) {
      this.description = this.formatFileSize(content.size);
    }

    // Set initial icon (will be updated by updateSelectionState)
    this.updateIcon();

    // Add checkbox support if available (VS Code 1.72+)
    // The initial state will be set by updateSelectionState via getTreeItem
    this.setupCheckbox(this._isSelected);
  }

  /**
   * Setup checkbox for the tree item
   * @param isSelected The current selection state
   */
  private setupCheckbox(isSelected: boolean): void {
    try {
      const item = this as any;
      if (typeof item.checkboxState !== "undefined") {
        item.checkboxState = isSelected
          ? vscode.TreeItemCheckboxState.Checked
          : vscode.TreeItemCheckboxState.Unchecked;
      }
    } catch (e) {
      // Fallback to icon-based selection if TreeItem2 API is not available
      // No action needed as updateIcon() already handles this
    }
  }

  /**
   * Update icon based on item type and internal selection state
   */
  private updateIcon(): void {
    if (this.content.type === "dir") {
      this.iconPath = new vscode.ThemeIcon(this.getFolderIconId());
    } else {
      if (this.extensionPath) {
        const iconName = this._isSelected ? "check.svg" : "file_icon.svg";
        const lightIconPath = vscode.Uri.joinPath(vscode.Uri.file(this.extensionPath), 'resources', 'light', iconName);
        const darkIconPath = vscode.Uri.joinPath(vscode.Uri.file(this.extensionPath), 'resources', 'dark', iconName);
        if (this._isSelected) {
             this.iconPath = new vscode.ThemeIcon('check');
        } else {
             this.iconPath = { light: lightIconPath, dark: darkIconPath };
        }
      } else {
        this.iconPath = new vscode.ThemeIcon(this.getFileIconId());
      }
    }
  }

  /**
   * Get folder icon ID based on internal selection state
   * Note: hasSelectedChild logic is removed as state is centralized.
   * We might need a way to get this info from the service if needed for icons.
   */
  private getFolderIconId(): string {
    // Simplified: just show folder-active if selected, otherwise normal folder.
    // The "partially selected" state (folder-opened) is harder without traversing
    // the tree or getting info from the service.
    return this._isSelected ? "folder-active" : "folder";
  }

  /**
 * Get file icon ID based on internal selection state (Fallback if no custom SVG)
 */
private getFileIconId(): string {
  return this._isSelected ? "check" : "file";
}

  /**
   * Updates the visual state of the item based on the selection status
   * provided by the TreeProvider (which gets it from the SelectionService).
   * @param isSelected Whether the item is currently selected.
   */
  public updateSelectionState(isSelected: boolean): void {
    if (this._isSelected === isSelected) {
      return; // No change needed
    }
    this._isSelected = isSelected;
    this.updateIcon();
    this.setupCheckbox(isSelected);
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

// Removed getSelectedItems function - use SelectionService.getSelectedItems() instead.
