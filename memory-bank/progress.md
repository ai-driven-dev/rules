# Progress

## Purpose

This document tracks what works, what's left to build, current status, known issues, and the evolution of project decisions.

## Current Status

Core functionality (repository browsing, file selection, basic download) is implemented. Refactoring for selection logic is complete, and initial unit tests are in place.

## What Works

- **Project Planning**: Complete, with clear requirements and architecture defined
- **Memory Bank**: Initialized and updated with latest changes
- **Technical Research**: Completed research on VS Code extension development and GitHub API
- **GitHub API Authentication**: Implemented optional token authentication via VS Code setting (`aidd.githubToken`).
- **Basic Error Handling**: Improved error feedback in `explorerView.ts` for repository loading and clarified message for directory-only selection.
- **Repository Browsing**: TreeView displays repository structure.
- **Selection Logic**: Refactored into `SelectionService` with state managed centrally. Checkbox interaction via VS Code API (when available) or fallback command.
- **Unit Testing Setup**: Mocha, Chai, Sinon, ts-node installed and configured. Initial tests for `SelectionService` added and runnable via `npm run test:unit`. Mock for `vscode` API created.

## What's Left to Build

- **Download Mechanism**: Review and potentially enhance directory download behavior (e.g., recursive download).
- **Error Handling**: Add more specific error handling for download process and file system operations.
- **Testing**: Test with more complex scenarios/repositories using unit tests. (Integration tests removed).
- **Performance**: Investigate TreeView refresh performance for large repositories if necessary.
- **Recursive Fetching**: Implement recursive fetching for directory contents if needed (e.g., for recursive download).

## Known Issues

- **Initial Bugs Addressed**:
  - "Bad credentials" error clarified.
  - Silent failure on recent repo click resolved.
  - "No files selected" message clarified (now indicates directory-only selection).
- **Potential Issues**:
  - Downloading selected directories currently doesn't download their contents.
  - TreeView refresh performance might degrade with very large repositories due to full refresh on selection change.

## Recent Milestones

- [2025-04-12]: Renamed extension to "AI-Driven Dev Rules" (aidd)
  - Updated package.json, README.md, and CHANGELOG.md
  - Modified command titles in package.json
  - Updated documentation references

- [2025-04-03]: Project requirements and architecture defined
- [2025-04-03]: Memory bank initialized with comprehensive documentation
- [2025-04-11]: Implemented optional GitHub token authentication via VS Code setting.
- [2025-04-11]: Improved error handling for repository loading and fixed related bug in `explorerView.ts`.
- [2025-04-11]: Refactored selection logic into `SelectionService`.
- [2025-04-11]: Added unit tests for `SelectionService`.
- [2025-04-11]: Configured and fixed unit test execution environment.
- [2025-04-11]: Removed integration test setup (`vscode-test`).

## Upcoming Milestones

- [Target: TBD]: Enhance download functionality (recursive directory download?).
- [Target: TBD]: Improve error handling coverage.
// - [Target: TBD]: Add integration tests. // Removed

## Evolution of Decisions

- **Extension Structure**: Initial plan for complex folder structure → Simplified structure based on Yeoman generator, for better alignment with VS Code conventions
- **API Client**: Considered third-party GitHub API clients → Decided on native Node.js https module, to minimize dependencies
- **UI Approach**: Considered custom WebView → Decided on native TreeView, for better integration with VS Code
- **Token Handling**: Considered environment variables (`.env`, system) → Decided on standard VS Code configuration setting (`aidd.githubToken`) for security and user experience.
- **Selection State**: Initial approach with state in `TreeItem` → Refactored to central `SelectionService` for better separation of concerns and easier testing.
- **Testing Framework**: Confirmed Mocha + Chai + Sinon for unit tests. Removed `vscode-test` for integration tests.

## Performance Metrics

- **Not Yet Available**: Will be tracked once implementation begins

## Testing Status

- **Unit Tests**: Added for `SelectionService` and runnable.
- **Integration Tests**: Removed.

## Deployment History

- **No Deployments Yet**: Project is in planning phase

## Notes

The project is well-positioned to begin implementation with a clear understanding of requirements and architecture. The focus will be on creating a clean, maintainable codebase that follows VS Code extension best practices. The incremental development approach will allow for regular testing and refinement throughout the process.
