// src/test/vscode-mock.js
// This file mocks the 'vscode' module for unit tests running outside the VS Code extension host.

const Module = require("node:module");
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
      // Add FileType enum mock
      FileType: {
        Unknown: 0,
        File: 1,
        Directory: 2,
        SymbolicLink: 64,
      },
      // Mock CheckboxState if it's used by your code
      // CheckboxState: { Unchecked: 0, Checked: 1 },
      // Mock workspace with getConfiguration
      workspace: {
        getConfiguration: (section) => {
          // Return a mock configuration object
          return {
            get: (key) => {
              // By default, don't return a token
              return undefined;
            },
            has: (key) => key === "githubToken", // Simulate having the githubToken setting
            inspect: (key) => undefined,
            update: (key, value) => Promise.resolve(),
          };
        },
      },
      // Mock window for progress API
      window: {
        withProgress: (options, task) => {
          // Simple mock that just calls the task with mock progress and token
          const progress = { report: () => {} };
          const token = {
            isCancellationRequested: false,
            onCancellationRequested: () => ({ dispose: () => {} }),
          };
          return task(progress, token);
        },
        showInformationMessage: () => Promise.resolve(),
        createOutputChannel: () => ({
          appendLine: () => {},
          append: () => {},
          show: () => {},
          clear: () => {},
          dispose: () => {},
        }),
      },
      // Mock ProgressLocation
      ProgressLocation: {
        Notification: 0,
        Window: 1,
        SourceControl: 2,
      },
      // Mock CancellationTokenSource
      CancellationTokenSource: class {
        constructor() {
          this.token = {
            isCancellationRequested: false,
            onCancellationRequested: () => ({ dispose: () => {} }),
          };
        }
        cancel() {
          this.token.isCancellationRequested = true;
        }
        dispose() {}
      },
      // Mock Uri
      Uri: { parse: (str) => ({ fsPath: str }) },
      // Mock commands
      commands: { executeCommand: () => Promise.resolve() },
      // Mock ThemeIcon
      ThemeIcon: class {
        constructor(id) {
          this.id = id;
        }
      },
    };
  }
  // For any other module, use the original require
  return originalRequire.apply(this, arguments);
};

// Note: This is a simple mock. For more complex scenarios,
// consider using dedicated mocking libraries or more elaborate setups.
