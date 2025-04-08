import * as vscode from "vscode";
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
   * Whether the item is selected
   */
  public selected = false;

  /**
   * Original GitHub content
   */
  public readonly content: GithubContent;

  /**
   * Create a tree item
   * @param content GitHub content
   * @param parent Parent item
   */
  constructor(
    content: GithubContent,
    public readonly parent?: ExplorerTreeItem
  ) {
    // Create tree item with appropriate label and collapsible state
    super(
      content.name,
      content.type === "dir"
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    this.content = content;

    // Set tooltip to show the full path
    this.tooltip = content.path;

    // Set context value for command enablement
    this.contextValue = content.type === "dir" ? "directory" : "file";

    // Set description to show file size for files
    if (content.type === "file" && content.size) {
      this.description = this.formatFileSize(content.size);
    }

    // Set appropriate icon
    this.updateIcon();

    // Add checkbox support if available (VS Code 1.72+)
    this.setupCheckbox();
  }

  /**
   * Setup checkbox for the tree item
   * This uses the newer TreeItem2 API if available
   */
  private setupCheckbox(): void {
    try {
      // Access the TreeItem2 API which supports checkboxes
      // This is a type assertion to access the experimental API
      const item = this as any;

      // Set checkbox state if the API is available
      if (typeof item.checkboxState !== "undefined") {
        item.checkboxState = this.selected
          ? vscode.TreeItemCheckboxState.Checked
          : vscode.TreeItemCheckboxState.Unchecked;
      }
    } catch (e) {
      // Fallback to icon-based selection if TreeItem2 API is not available
      // No action needed as updateIcon() already handles this
    }
  }

  /**
   * Update icon based on item type and selection state
   */
  public updateIcon(): void {
    if (this.content.type === "dir") {
      // Directory icon
      this.iconPath = new vscode.ThemeIcon(this.getFolderIconId());
    } else {
      // File icon
      this.iconPath = new vscode.ThemeIcon(this.getFileIconId());
    }

    // Update checkbox state if available
    this.setupCheckbox();
  }

  /**
   * Get folder icon ID based on selection state
   */
  private getFolderIconId(): string {
    if (this.selected) {
      return "folder-active";
    } else if (this.hasSelectedChild()) {
      return "folder-opened";
    } else {
      return "folder";
    }
  }

  /**
   * Get file icon ID based on selection state
   */
  private getFileIconId(): string {
    if (this.selected) {
      return "check";
    } else {
      return "file";
    }
  }

  /**
   * Toggle selection state
   */
  public toggleSelection(): void {
    this.selected = !this.selected;

    // Update icon
    this.updateIcon();
  }

  /**
   * Check if this item has any selected children
   */
  private hasSelectedChild(): boolean {
    return this.children.some(
      (child) => child.selected || child.hasSelectedChild()
    );
  }

  /**
   * Update selection state of all children
   */
  public updateChildrenSelection(selected: boolean): void {
    this.selected = selected;
    this.updateIcon();

    for (const child of this.children) {
      child.updateChildrenSelection(selected);
    }
  }

  /**
   * Update parent selection state
   */
  public updateParentSelection(): void {
    if (!this.parent) {
      return;
    }

    const allSelected = this.parent.children.every((child) => child.selected);
    const someSelected = this.parent.children.some(
      (child) => child.selected || child.hasSelectedChild()
    );

    if (allSelected) {
      this.parent.selected = true;
    } else if (someSelected) {
      // Keep parent not fully selected, but update its icon
      this.parent.selected = false;
    } else {
      this.parent.selected = false;
    }

    this.parent.updateIcon();
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

/**
 * Get all selected items from a list of tree items
 * @param items Tree items
 * @returns Selected items
 */
export function getSelectedItems(
  items: ExplorerTreeItem[]
): ExplorerTreeItem[] {
  const selectedItems: ExplorerTreeItem[] = [];

  // Recursively collect selected items
  const collectSelectedItems = (nodes: ExplorerTreeItem[]) => {
    for (const node of nodes) {
      if (node.selected) {
        selectedItems.push(node);
      }

      if (node.children.length > 0) {
        collectSelectedItems(node.children);
      }
    }
  };

  collectSelectedItems(items);
  return selectedItems;
}
