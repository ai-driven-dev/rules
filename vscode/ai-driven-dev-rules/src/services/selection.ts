import * as vscode from 'vscode';
import { ExplorerTreeProvider } from '../views/explorer/treeProvider';
import { ExplorerTreeItem } from '../views/explorer/treeItem';
import { ILogger } from './logger';


export interface ISelectionService {

  readonly onDidChangeSelection: vscode.Event<void>;


  toggleSelection(itemPath: string): void;


  toggleRecursiveSelection(itemPath: string, depth?: number): Promise<void>;


  isSelected(itemPath: string): boolean;


  getSelectedItems(): string[];


  clearSelection(): void;


  selectItems(itemPaths: string[]): void;
}


export class SelectionService implements ISelectionService {
  private _onDidChangeSelection = new vscode.EventEmitter<void>();
  readonly onDidChangeSelection = this._onDidChangeSelection.event;

  private selectedPaths: Set<string> = new Set();
  public treeProvider: ExplorerTreeProvider;

  private logger: ILogger;

  constructor(treeProvider: ExplorerTreeProvider, logger: ILogger) {
    this.treeProvider = treeProvider;
    this.logger = logger;
  }


  toggleSelection(itemPath: string): void {
    if (this.selectedPaths.has(itemPath)) {
      this.selectedPaths.delete(itemPath);
    } else {
      this.selectedPaths.add(itemPath);
    }
    this._onDidChangeSelection.fire();
  }


  async toggleRecursiveSelection(itemPath: string, depth: number = 5): Promise<void> {
    try {

      const isCurrentlySelected = this.isSelected(itemPath);


      if (isCurrentlySelected) {
        this.selectedPaths.delete(itemPath);
      } else {
        this.selectedPaths.add(itemPath);
      }


      if (depth <= 0) {
        this.logger.debug(`Maximum recursion depth reached for ${itemPath}`);
        this._onDidChangeSelection.fire();
        return;
      }


      const parentItem = new ExplorerTreeItem({
        path: itemPath,
        type: 'dir',
        name: itemPath.split('/').pop() || itemPath,
        sha: '',
        size: 0,
        url: '',
        html_url: '',
        download_url: null,
        git_url: ''
      });


      this.logger.debug(`Fetching children for directory: ${itemPath}`);
      let children: ExplorerTreeItem[] = [];

      try {
        children = await this.treeProvider.getChildren(parentItem);
      } catch (error) {
        this.logger.error(`Error fetching children for ${itemPath}`, error);
        this._onDidChangeSelection.fire();
        return;
      }

      if (!children || children.length === 0) {
        this.logger.debug(`No children found for directory: ${itemPath}`);
        this._onDidChangeSelection.fire();
        return;
      }

      this.logger.debug(`Found ${children.length} children for directory: ${itemPath}`);


      const childPromises = children.map(async (child) => {
        try {
          if (child.content.type === 'dir') {

            if (isCurrentlySelected) {
              this.selectedPaths.delete(child.content.path);
            } else {
              this.selectedPaths.add(child.content.path);
            }


            if (depth > 1) { // Only recurse if we have depth remaining
              await this.toggleRecursiveSelection(child.content.path, depth - 1);
            }
          } else {

            if (isCurrentlySelected) {
              this.selectedPaths.delete(child.content.path);
            } else {
              this.selectedPaths.add(child.content.path);
            }
          }
        } catch (error) {
          this.logger.error(`Error processing child ${child.content.path}`, error);
        }
      });


      await Promise.all(childPromises);


      this._onDidChangeSelection.fire();
    } catch (error) {
      this.logger.error(`Error in toggleRecursiveSelection for ${itemPath}`, error);
      this._onDidChangeSelection.fire();
    }
  }


  isSelected(itemPath: string): boolean {
    return this.selectedPaths.has(itemPath);
  }


  getSelectedItems(): string[] {
    return Array.from(this.selectedPaths);
  }


  clearSelection(): void {
    if (this.selectedPaths.size > 0) {
      this.selectedPaths.clear();
      this._onDidChangeSelection.fire();
    }
  }


  selectItems(itemPaths: string[]): void {
    let selectionChanged = false;
    for (const path of itemPaths) {
      if (!this.selectedPaths.has(path)) {
        this.selectedPaths.add(path);
        selectionChanged = true;
      }
    }
    if (selectionChanged) {
      this.logger.debug(`Selected ${itemPaths.length} items programmatically.`);
      this._onDidChangeSelection.fire();
    }
  }
}
