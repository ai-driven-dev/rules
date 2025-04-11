// src/test/vscode-mock.js
// This file mocks the 'vscode' module for unit tests running outside the VS Code extension host.

const Module = require('module');
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
                }
            };
        };
    }

    fire(data) {
        // Call all registered listeners with the data
        [...this._listeners].forEach(listener => listener(data));
    }

    dispose() {
        // Clear listeners
        this._listeners = [];
    }
}

// Intercept require calls for the 'vscode' module
Module.prototype.require = function(id) {
  if (id === 'vscode') {
    // Return our mock vscode API object
    // Add other vscode APIs here if needed by other tests in the future
    return {
      EventEmitter: MockEventEmitter,
      // --- Mock other VS Code APIs below if needed ---
      // e.g., window: { showInformationMessage: () => {} },
      //       commands: { executeCommand: () => {} },
    };
  }
  // For any other module, use the original require
  return originalRequire.apply(this, arguments);
};

// Note: This is a simple mock. For more complex scenarios,
// consider using dedicated mocking libraries or more elaborate setups.
