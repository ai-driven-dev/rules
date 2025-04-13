# Progress

## Purpose

This document tracks what works, what's left to build, current status, known issues, and the evolution of project decisions.

## Current Status

Core functionality is implemented, including repository browsing via the efficient Git Trees API and local recursive selection. The main remaining piece is implementing the recursive download functionality. Unit tests cover the selection service, but need expansion for new logic.

## What Works

- **Project Planning**: Complete, with clear requirements and architecture defined
- **Memory Bank**: Initialized and updated with latest changes
- **Technical Research**: Completed research on VS Code extension development and GitHub API
- **GitHub API Authentication**: Implemented optional token authentication via VS Code setting (`aidd.githubToken`).
- **Basic Error Handling**: Improved error feedback in `explorerView.ts` for repository loading and clarified message for directory-only selection.
- **Repository Browsing**: TreeView displays repository structure.
- **Repository Fetching**: Refactored to use the efficient `git/trees?recursive=1` API, fetching the entire structure in one call (`github.ts`).
- **Selection Logic**: Refactored into `SelectionService`. Handles *local* recursive selection/deselection when directory checkboxes are toggled (`SelectionService`, `ExplorerTreeProvider`). Checkbox interaction via VS Code API (when available) or fallback command.
- **Unit Testing Setup**: Mocha, Chai, Sinon, ts-node installed and configured. Initial tests for `SelectionService` added (`selection.test.ts`) and runnable via `npm run test:unit`. Mock for `vscode` API created (`vscode-mock.js`).

## What's Left to Build

1. **Recursive Download**: Implement the logic to download all files marked as selected in `SelectionService`, including those selected implicitly via directory checks. This involves updating `explorerView.ts` and `download.ts`.
2. **Testing**:
    - Manually test the Git Trees loading and local recursive selection thoroughly.
    - Add unit tests for tree transformation logic (Git Trees data -> TreeItems).
    - Test the recursive download implementation once built.
3. **Error Handling**:
    - Implement specific error handling for the `git/trees` API call (rate limits, `truncated` flag, invalid SHA).
    - Enhance error handling for the download process.
4. **Performance Monitoring**: Observe TreeView performance with large repositories loaded via `git/trees`.

## Known Issues

- **Recursive Download Not Implemented**: Selecting a directory checkbox correctly updates the selection state recursively, but the download command currently only downloads explicitly selected *files*. It does not yet download the contents of selected directories based on the recursive selection.
- **Potential Performance with Large Repos**: Displaying the TreeView after loading a very large repository structure via `git/trees` might be slow, although fetching itself is efficient. Needs monitoring.
- **`truncated` Git Trees Response**: No specific handling is implemented for the case where the `git/trees` API returns a `truncated` response for extremely large repositories.

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

## Upcoming Milestones

- [Target: Next Session]: Implement recursive download functionality.
- [Target: Next Session]: Add basic error handling for Git Trees API and download.
- [Target: Following Sessions]: Thoroughly test new features, add more unit tests, monitor performance.

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

- **Unit Tests**: Exist for `SelectionService` (`selection.test.ts`). Need expansion for tree transformation logic and download service logic. Runnable via `npm run test:unit`.
- **Integration Tests**: Removed.
- **Manual Testing**: Required for verifying Git Trees loading, local recursive selection UI, and the upcoming recursive download feature.

## Deployment History

- **No Deployments Yet**: Project is in planning phase

## Notes

The project is well-positioned to begin implementation with a clear understanding of requirements and architecture. The focus will be on creating a clean, maintainable codebase that follows VS Code extension best practices. The incremental development approach will allow for regular testing and refinement throughout the process.
