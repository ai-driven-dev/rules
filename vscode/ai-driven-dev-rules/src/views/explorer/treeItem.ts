import * as vscode from "vscode"; // Revert to standard import
import type { GithubContent } from "../../api/types";
import type { FileUpdateStatus } from "../../services/updateCheckService"; // Import status type

export class ExplorerTreeItem extends vscode.TreeItem {
  public children: ExplorerTreeItem[] = [];

  private _isSelected = false;

  public readonly content: GithubContent;
  public updateStatus?: FileUpdateStatus["status"]; // Added update status property

  private readonly extensionPath?: string;

  constructor(
    content: GithubContent,
    public readonly parent?: ExplorerTreeItem,
    extensionPath?: string,
    initialStatus?: FileUpdateStatus["status"], // Allow passing initial status
  ) {
    // Initial label without emoji, will be updated by setUpdateStatus
    super(
      content.name,
      content.type === "dir"
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );

    this.content = content;
    this.extensionPath = extensionPath;
    this.updateStatus = initialStatus; // Set initial status if provided

    this.updateLabelAndTooltip(); // Use a combined method

    this.contextValue = content.type === "dir" ? "directory" : "file";

    if (content.type === "file" && content.size) {
      this.description = this.formatFileSize(content.size);
    }

    this.updateIcon();

    this.setupCheckbox(this._isSelected);
  }

  public setUpdateStatus(status: FileUpdateStatus["status"] | undefined): void {
    const newStatus = status ?? "unknown"; // Default to unknown if undefined
    if (this.updateStatus !== newStatus) {
      this.updateStatus = newStatus;
      this.updateLabelAndTooltip();
      // Optionally update icon here as well if desired
      // this.updateIcon();
    }
  }

  private updateLabelAndTooltip(): void {
    const statusPrefix = this.getStatusPrefix(this.updateStatus);
    this.label = statusPrefix + this.content.name; // Update the label with prefix (avoid template literal)

    let tooltipContent = this.content.path; // Use simple string assignment
    if (
      this.updateStatus &&
      this.updateStatus !== "unknown" &&
      this.updateStatus !== "up-to-date"
    ) {
      // Only add status to tooltip if it's notable (not unknown or up-to-date)
      tooltipContent += `\nStatus: ${this.formatUpdateStatus(this.updateStatus)}`;
    }
    if (this.updateStatus === "remote-deleted") {
      tooltipContent += "\n(File deleted in remote repository)";
    }
    this.tooltip = new vscode.MarkdownString(tooltipContent);
  }

  private getStatusPrefix(
    status: FileUpdateStatus["status"] | undefined,
  ): string {
    switch (status) {
      case "update-available":
        return "🔄 "; // Refresh emoji for updated
      case "remote-new":
        return "✅ "; // Check mark for new
      // case "remote-deleted": return "❌ "; // Optional: Mark deleted? Might be confusing.
      default:
        return ""; // No prefix for up-to-date, unknown, or deleted (unless marked above)
    }
  }

  private formatUpdateStatus(status: FileUpdateStatus["status"]): string {
    switch (status) {
      case "up-to-date":
        return "Up to date";
      case "update-available":
        return "Update available";
      case "remote-deleted":
        return "Deleted remotely";
      case "remote-new":
        return "New remote file";
      default:
        return "Unknown";
    }
  }

  private setupCheckbox(isSelected: boolean): void {
    try {
      const item = this as any;
      if (typeof item.checkboxState !== "undefined") {
        item.checkboxState = isSelected
          ? vscode.TreeItemCheckboxState.Checked
          : vscode.TreeItemCheckboxState.Unchecked;
      }
    } catch (e) {
      console.error("Checkbox state not supported", e);
    }
  }

  private updateIcon(): void {
    if (this.content.type === "dir") {
      this.iconPath = new vscode.ThemeIcon(this.getFolderIconId());
    } else {
      if (this.extensionPath) {
        const iconName = this._isSelected ? "check.svg" : "file_icon.svg";
        const lightIconPath = vscode.Uri.joinPath(
          vscode.Uri.file(this.extensionPath),
          "resources",
          "light",
          iconName,
        );
        const darkIconPath = vscode.Uri.joinPath(
          vscode.Uri.file(this.extensionPath),
          "resources",
          "dark",
          iconName,
        );
        if (this._isSelected) {
          this.iconPath = new vscode.ThemeIcon("check");
        } else {
          this.iconPath = { light: lightIconPath, dark: darkIconPath };
        }
      } else {
        this.iconPath = new vscode.ThemeIcon(this.getFileIconId());
      }
    }
  }

  private getFolderIconId(): string {
    return this._isSelected ? "folder-active" : "folder";
  }

  private getFileIconId(): string {
    return this._isSelected ? "check" : "file";
  }

  public updateSelectionState(isSelected: boolean): void {
    if (this._isSelected === isSelected) {
      return;
    }
    this._isSelected = isSelected;
    // Note: updateIcon might need adjustment if icons depend on updateStatus too
    this.updateIcon();
    this.setupCheckbox(isSelected);
  }

  private formatFileSize(size: number): string {
    if (size < 1024) {
      return `${size} B`;
    }
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }
    if (size < 1024 * 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}
