import * as vscode from "vscode";
import type { GithubContent } from "../../api/types";

export class ExplorerTreeItem extends vscode.TreeItem {
  public children: ExplorerTreeItem[] = [];

  private _isSelected = false;

  public readonly content: GithubContent;

  private readonly extensionPath?: string;

  constructor(
    content: GithubContent,
    public readonly parent?: ExplorerTreeItem,
    extensionPath?: string,
  ) {
    super(
      content.name,
      content.type === "dir"
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );

    this.content = content;
    this.extensionPath = extensionPath;

    this.tooltip = content.path;

    this.contextValue = content.type === "dir" ? "directory" : "file";

    if (content.type === "file" && content.size) {
      this.description = this.formatFileSize(content.size);
    }

    this.updateIcon();

    this.setupCheckbox(this._isSelected);
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
