// src/test/vscode-mock.js
// This file mocks the 'vscode' module for unit tests running outside the VS Code extension host.

const Module = require("module");
const originalRequire = Module.prototype.require;

// Basic mock for vscode.EventEmitter
class MockEventEmitter {
	constructor() {
		this._listeners = [];
		// The 'event' property is a function that registers listeners
		this.event = (listener) => {
			this._listeners.push(listener);
			// Return a mock disposable
			return {
				dispose: () => {
					const index = this._listeners.indexOf(listener);
					if (index > -1) {
						this._listeners.splice(index, 1);
					}
				},
			};
		};
	}

	fire(data) {
		// Call all registered listeners with the data
		[...this._listeners].forEach((listener) => listener(data));
	}

	dispose() {
		// Clear listeners
		this._listeners = [];
	}
}

// Basic mock for vscode.TreeItem
class MockTreeItem {
	constructor(label, collapsibleState) {
		this.label = label;
		this.collapsibleState = collapsibleState;
		// Add other properties used by your ExplorerTreeItem if needed
		this.contextValue = undefined;
		this.resourceUri = undefined;
		this.checkboxState = undefined; // Mock CheckboxState if used
		this.command = undefined;
		this.iconPath = undefined;
	}
}

// Intercept require calls for the 'vscode' module
Module.prototype.require = function (id) {
	if (id === "vscode") {
		// Return our mock vscode API object
		// Add other vscode APIs here if needed by other tests in the future
		return {
			EventEmitter: MockEventEmitter,
			TreeItem: MockTreeItem, // Add the mocked TreeItem
			// Define constants used by TreeItem (like TreeItemCollapsibleState)
			TreeItemCollapsibleState: {
				None: 0,
				Collapsed: 1,
				Expanded: 2,
			},
			// Mock CheckboxState if it's used by your code
			// CheckboxState: { Unchecked: 0, Checked: 1 },
			// --- Mock other VS Code APIs below if needed ---
			// e.g., window: { showInformationMessage: () => {} },
			//       commands: { executeCommand: () => {} },
			//       Uri: { parse: (str) => ({ fsPath: str }) } // Basic Uri mock if needed
		};
	}
	// For any other module, use the original require
	return originalRequire.apply(this, arguments);
};

// Note: This is a simple mock. For more complex scenarios,
// consider using dedicated mocking libraries or more elaborate setups.
