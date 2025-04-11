import * as vscode from 'vscode';

/**
 * Interface for the selection service.
 * Manages the selection state of items in the explorer view.
 */
export interface ISelectionService {
  /** Event emitted when the selection changes. */
  readonly onDidChangeSelection: vscode.Event<void>;

  /**
   * Toggles the selection state of an item.
   * @param itemPath The unique path identifier of the item.
   */
  toggleSelection(itemPath: string): void;

  /**
   * Checks if an item is currently selected.
   * @param itemPath The unique path identifier of the item.
   * @returns True if the item is selected, false otherwise.
   */
  isSelected(itemPath: string): boolean;

  /**
   * Gets the paths of all currently selected items.
   * @returns An array of selected item paths.
   */
  getSelectedItems(): string[];

  /**
   * Clears the current selection.
   */
  clearSelection(): void;
}

/**
 * Implementation of the selection service.
 */
export class SelectionService implements ISelectionService {
  private _onDidChangeSelection = new vscode.EventEmitter<void>();
  readonly onDidChangeSelection = this._onDidChangeSelection.event;

  private selectedPaths: Set<string> = new Set();

  /**
   * Toggles the selection state of an item.
   * @param itemPath The unique path identifier of the item.
   */
  toggleSelection(itemPath: string): void {
    if (this.selectedPaths.has(itemPath)) {
      this.selectedPaths.delete(itemPath);
    } else {
      this.selectedPaths.add(itemPath);
    }
    this._onDidChangeSelection.fire();
  }

  /**
   * Checks if an item is currently selected.
   * @param itemPath The unique path identifier of the item.
   * @returns True if the item is selected, false otherwise.
   */
  isSelected(itemPath: string): boolean {
    return this.selectedPaths.has(itemPath);
  }

  /**
   * Gets the paths of all currently selected items.
   * @returns An array of selected item paths.
   */
  getSelectedItems(): string[] {
    return Array.from(this.selectedPaths);
  }

  /**
   * Clears the current selection.
   */
  clearSelection(): void {
    if (this.selectedPaths.size > 0) {
      this.selectedPaths.clear();
      this._onDidChangeSelection.fire();
    }
  }
}
