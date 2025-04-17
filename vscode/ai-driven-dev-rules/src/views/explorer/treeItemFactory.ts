import * as vscode from "vscode";
import type { GithubContent } from "../../api/types";
import type { ILogger } from "../../services/logger";
import { ExplorerTreeItem } from "./treeItem";

export class TreeItemFactory {
  constructor(
    private readonly extensionPath: string,
    private readonly logger: ILogger,
  ) {}

  public createItem(
    content: GithubContent,
    parent?: ExplorerTreeItem,
  ): ExplorerTreeItem {
    return new ExplorerTreeItem(content, parent, this.extensionPath);
  }

  public createLoadingPlaceholder(): ExplorerTreeItem {
    const loadingContent: GithubContent = {
      name: "Chargement...",
      path: "__loading__",
      sha: "",
      size: 0,
      url: "",
      html_url: "",
      git_url: "",
      download_url: null,
      type: "file",
    };
    const item = this.createItem(loadingContent);
    item.collapsibleState = vscode.TreeItemCollapsibleState.None;
    item.description = "Récupération des données...";
    item.iconPath = new vscode.ThemeIcon("loading~spin");
    return item;
  }

  public createErrorPlaceholder(error: unknown): ExplorerTreeItem {
    const errorContent: GithubContent = {
      name: "Erreur de chargement",
      path: "__error__",
      sha: "",
      size: 0,
      url: "",
      html_url: "",
      git_url: "",
      download_url: null,
      type: "file",
    };
    const item = this.createItem(errorContent);
    item.collapsibleState = vscode.TreeItemCollapsibleState.None;
    const errorMessage = error instanceof Error ? error.message : String(error);
    item.description = errorMessage;
    item.iconPath = new vscode.ThemeIcon("error");
    item.tooltip = `Erreur: ${errorMessage}`;
    this.logger.warn(`Created error placeholder: ${errorMessage}`);
    return item;
  }
}
