import * as vscode from "vscode";
// ExplorerTreeItem and ExplorerTreeProvider are no longer directly needed here
import { IExplorerStateService } from "./explorerStateService"; // Import state service
import { ILogger } from "./logger";

export interface ISelectionService {
	readonly onDidChangeSelection: vscode.Event<void>;

	toggleSelection(itemPath: string): void;

	// Removed depth parameter, now operates on full local data
	toggleRecursiveSelection(itemPath: string): void; // Now synchronous

	isSelected(itemPath: string): boolean;

	getSelectedItems(): string[];

	clearSelection(): void;

	selectItems(itemPaths: string[]): void;
}

export class SelectionService implements ISelectionService {
	private _onDidChangeSelection = new vscode.EventEmitter<void>();
	readonly onDidChangeSelection = this._onDidChangeSelection.event;

	private selectedPaths: Set<string> = new Set();
	// Removed treeProvider reference
	private logger: ILogger;
	private stateService: IExplorerStateService; // Add state service reference

	constructor(logger: ILogger, stateService: IExplorerStateService) {
		// Inject state service
		this.logger = logger;
		this.stateService = stateService; // Store state service
	}

	// Removed setTreeProvider method

	toggleSelection(itemPath: string): void {
		if (this.selectedPaths.has(itemPath)) {
			this.selectedPaths.delete(itemPath);
		} else {
			this.selectedPaths.add(itemPath);
		}
		this._onDidChangeSelection.fire();
	}

	toggleRecursiveSelection(itemPath: string): void {
		const shouldBeSelected = !this.isSelected(itemPath);
		this.logger.debug(
			`Toggling recursive selection for '${itemPath}'. Target state: ${shouldBeSelected ? "Selected" : "Unselected"}`,
		);

		const itemsToToggle: string[] = [itemPath];

		// Find all descendants using the stateService map
		const allItems = this.stateService.getAllItems();
		const prefix = itemPath === "" ? "" : itemPath + "/";

		for (const item of allItems.values()) {
			if (
				item.content.path !== itemPath &&
				item.content.path.startsWith(prefix)
			) {
				itemsToToggle.push(item.content.path);
			}
		}

		this.logger.debug(
			`Found ${itemsToToggle.length} items (including self) to toggle for path '${itemPath}'`,
		);

		let changed = false;
		for (const path of itemsToToggle) {
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
