import * as vscode from "vscode";

import type { IExplorerStateService } from "./explorerStateService";
import type { ILogger } from "./logger";

export interface ISelectionService {
  readonly onDidChangeSelection: vscode.Event<void>;

  toggleSelection(itemPath: string): void;

  toggleRecursiveSelection(itemPath: string): void;

  isSelected(itemPath: string): boolean;

  getSelectedItems(): string[];

  clearSelection(): void;

  selectItems(itemPaths: string[]): void;
}

export class SelectionService implements ISelectionService {
  private _onDidChangeSelection = new vscode.EventEmitter<void>();
  readonly onDidChangeSelection = this._onDidChangeSelection.event;

  private selectedPaths: Set<string> = new Set();

  private logger: ILogger;
  private stateService: IExplorerStateService;

  constructor(logger: ILogger, stateService: IExplorerStateService) {
    this.logger = logger;
    this.stateService = stateService;
  }

  toggleSelection(itemPath: string): void {
    if (this.selectedPaths.has(itemPath)) {
      this.selectedPaths.delete(itemPath);
    } else {
      this.selectedPaths.add(itemPath);
    }
    this._onDidChangeSelection.fire();
  }

  toggleRecursiveSelection(itemPath: string): void {
    let shouldBeSelected: boolean;
    const allItemsMap = this.stateService.getAllItems();

    if (itemPath === "") {
      const allActualPaths = Array.from(allItemsMap.keys());
      const allSelected = allActualPaths.every((path) =>
        this.selectedPaths.has(path),
      );
      shouldBeSelected = !allSelected;
      this.logger.debug(
        `Toggling root (""). All items currently selected: ${allSelected}. Target state: ${shouldBeSelected ? "Selected" : "Unselected"}`,
      );
    } else {
      shouldBeSelected = !this.isSelected(itemPath);
      this.logger.debug(
        `Toggling recursive selection for '${itemPath}'. Target state: ${shouldBeSelected ? "Selected" : "Unselected"}`,
      );
    }

    const itemsToToggle: string[] = [];
    if (itemPath !== "") {
      itemsToToggle.push(itemPath);
    }

    const prefix = itemPath === "" ? "" : `${itemPath}/`;

    for (const item of allItemsMap.values()) {
      if (
        item.content.path !== itemPath &&
        item.content.path.startsWith(prefix)
      ) {
        itemsToToggle.push(item.content.path);
      } else if (itemPath === "" && item.content.path !== "") {
        itemsToToggle.push(item.content.path);
      }
    }

    if (itemPath === "") {
      const allActualPathsSet = new Set(Array.from(allItemsMap.keys()));
      allActualPathsSet.delete("");
      itemsToToggle.push(...Array.from(allActualPathsSet));

      const uniqueItemsToToggle = [...new Set(itemsToToggle)];
      itemsToToggle.length = 0;
      itemsToToggle.push(...uniqueItemsToToggle);
    }

    this.logger.debug(
      `Found ${itemsToToggle.length} items (including self) to toggle for path '${itemPath}'`,
    );

    let changed = false;
    for (const path of itemsToToggle) {
      if (path === "" && shouldBeSelected) {
        continue;
      }
      const currentlySelected = this.selectedPaths.has(path);
      if (shouldBeSelected && !currentlySelected) {
        this.selectedPaths.add(path);
        changed = true;
      } else if (!shouldBeSelected && currentlySelected) {
        this.selectedPaths.delete(path);
        changed = true;
      }
    }

    if (changed) {
      this.logger.debug(
        `Selection state changed for recursive toggle of '${itemPath}'. Firing event.`,
      );
      this._onDidChangeSelection.fire();
    } else {
      this.logger.debug(
        `Selection state did not change for recursive toggle of '${itemPath}'. Not firing event.`,
      );
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
