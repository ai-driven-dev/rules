# Progress

## Purpose

This document tracks what works, what's left to build, current status, known issues, and the evolution of project decisions.

## Current Status

Core functionality is implemented, including repository browsing via Git Trees API, local recursive selection, and **recursive download**. The download command now correctly processes files within selected directories. Testing and enhanced error handling are the next major steps.

## What Works

- **Project Planning**: Complete, with clear requirements and architecture defined
- **Memory Bank**: Initialized and updated with latest changes
- **Technical Research**: Completed research on VS Code extension development and GitHub API
- **GitHub API Authentication**: Implemented optional token authentication via VS Code setting (`aidd.githubToken`).
- **Basic Error Handling**: Improved error feedback in `explorerView.ts` for repository loading and clarified message for directory-only selection.
- **Repository Browsing**: TreeView displays repository structure.
- **Repository Fetching**: Uses efficient `git/trees?recursive=1` API (`github.ts`).
- **Selection Logic**: Centralized in `SelectionService`, handles local recursive selection/deselection.
- **Download Logic**: `explorerView.ts` correctly maps selected items (files & dirs) and passes them to `DownloadService`, enabling recursive download. `DownloadService` handles directory creation and file fetching.
- **Unit Testing Setup**: Mocha, Chai, Sinon configured. Tests exist for `SelectionService`.

## What's Left to Build

1.  **Testing**:
    *   **Manual Testing**: Thoroughly test recursive download, Git Trees loading, and local recursive selection. Verify file integrity and directory structure post-download.
    *   **Automated Testing**: Add unit tests for tree transformation logic and download mapping logic.
2.  **Error Handling**:
    *   Implement specific error handling for the `git/trees` API call (rate limits, `truncated` flag, invalid SHA).
    *   Enhance error handling for the download process (network issues, file system errors).
3.  **Performance Monitoring**: Observe TreeView performance with large repositories loaded via `git/trees`.

## Known Issues

- **Testing Coverage**: Manual testing is needed to confirm the recursive download works correctly in various scenarios. Automated tests for new logic (tree transformation, download mapping) are pending.
- **Error Handling**: Specific error handling for `git/trees` API (including `truncated` flag) and enhanced download error handling are not yet implemented.
- **Potential Performance with Large Repos**: Displaying the TreeView after loading a very large repository structure via `git/trees` might be slow. Needs monitoring.

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
- [2025-04-13]: Refactored repository fetching to use Git Trees API (`git/trees?recursive=1`).
- [2025-04-13]: Implemented local recursive selection/deselection logic.
- [2025-04-13]: Implemented recursive download functionality by updating `explorerView.ts`.

## Upcoming Milestones

- [Target: Next Session]: Thoroughly test recursive download and core features manually.
- [Target: Next Session]: Implement basic error handling for Git Trees API and download process.
- [Target: Following Sessions]: Add unit tests for new logic, monitor performance, address `truncated` flag if necessary.

## Evolution of Decisions

- **Extension Structure**: Initial plan for complex folder structure → Simplified structure based on Yeoman generator, for better alignment with VS Code conventions
- **API Client**: Considered third-party GitHub API clients → Decided on native Node.js https module, to minimize dependencies
- **UI Approach**: Considered custom WebView → Decided on native TreeView, for better integration with VS Code
- **Token Handling**: Considered environment variables (`.env`, system) → Decided on standard VS Code configuration setting (`aidd.githubToken`) for security and user experience.
- **Selection State**: Initial approach with state in `TreeItem` → Refactored to central `SelectionService`.
- **Testing Framework**: Confirmed Mocha + Chai + Sinon for unit tests. Removed `vscode-test`.
- **Repository Fetching**: Recursive `contents` API calls → Single `git/trees?recursive=1` API call for efficiency.
- **Recursive Selection**: API calls on directory check → Local state update based on pre-fetched data for responsiveness.

## Performance Metrics

- **Not Yet Available**: Will be tracked once implementation begins

## Testing Status

- **Unit Tests**: Exist for `SelectionService`. Need expansion for tree transformation and download mapping logic. Runnable via `npm run test:unit`.
- **Integration Tests**: Removed.
- **Manual Testing**: **Crucial next step** to verify recursive download, Git Trees loading, and local recursive selection UI.

## Deployment History

- **No Deployments Yet**: Project is in planning phase

## Notes

The project is well-positioned to begin implementation with a clear understanding of requirements and architecture. The focus will be on creating a clean, maintainable codebase that follows VS Code extension best practices. The incremental development approach will allow for regular testing and refinement throughout the process.
