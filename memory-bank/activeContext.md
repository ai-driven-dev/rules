# Active Context

## Purpose

This document tracks the current work focus, recent changes, next steps, active decisions and considerations, important patterns and preferences, and learnings and project insights.

## Current Focus

Refining core functionality, improving code structure through refactoring, and ensuring robustness with tests.

## Recent Changes

- [2025-04-12]: Renamed extension to "AI-Driven Dev Rules" (aidd)
  - Updated package.json, README.md, and CHANGELOG.md
  - Modified command titles in package.json
  - Updated documentation references

- [2025-04-03]: Initialized memory bank with project documentation
- [2025-04-03]: Defined project requirements and architecture
- [2025-04-03]: Researched VS Code extension development best practices
- [2025-04-11]: Implemented optional GitHub token authentication via VS Code setting (`aidd.githubToken`) to mitigate rate limits.
- [2025-04-11]: Improved error handling in `explorerView.ts` by adding specific `try...catch` for recent repository selection to prevent silent failures.
- [2025-04-11]: Fixed TypeScript error in `explorerView.ts` related to `ExplorerTreeProvider` constructor arguments.
- [2025-04-11]: Clarified "No files selected" message in `explorerView.ts` when only directories are selected for download.
- [2025-04-11]: Refactored selection logic into a dedicated `SelectionService` (`src/services/selection.ts`).
- [2025-04-11]: Updated `ExplorerView`, `ExplorerTreeProvider`, and `ExplorerTreeItem` to use `SelectionService`.
- [2025-04-11]: Added unit tests for `SelectionService` (`src/test/selection.test.ts`) using Mocha, Chai, and Sinon.
- [2025-04-11]: Installed `chai`, `sinon`, `mocha`, `ts-node`, `@types/chai`, `@types/sinon` as dev dependencies.
- [2025-04-11]: Configured unit test execution via `npm run test:unit` using `ts-node` and a mock for the `vscode` module.
- [2025-04-11]: Corrected ESLint warnings (missing curly braces). Added `lint:fix` script to `package.json`.
- [2025-04-11]: Removed integration test setup (`vscode-test` scripts and dependencies, `extension.test.ts` file, `.vscode-test` directory) as requested.
- [2025-04-13]: Implemented initial recursive loading (depth 3) on repository load (`github.ts`, `treeProvider.ts`).
- [2025-04-13]: Implemented recursive expansion (depth 5) and selection when checking a directory checkbox (`github.ts`, `treeProvider.ts`, `selection.ts`, `explorerView.ts`).
- [2025-04-13]: Added progress indicator for recursive directory loading/selection.

## Next Steps

1. **Test Recursive Features**: Thoroughly test the new recursive loading and selection features with various repository structures and sizes. Pay close attention to performance and API rate limit handling.
2. **Implement Recursive Download**: Enhance the download functionality (`downloadSelectedFiles` in `explorerView.ts` and potentially `download.ts`) to handle the download of recursively selected directory contents.
3. **Error Handling**: Add more specific error handling, especially around the recursive API calls and potential rate limit issues during expansion/selection.
4. **Performance Optimization**: Monitor TreeView refresh performance, especially after recursive expansion, and optimize if necessary (e.g., partial refresh instead of full refresh).

## Active Decisions

- **TreeView Implementation**: Deciding between using VS Code's built-in TreeView with custom checkboxes vs. a WebView implementation. Current preference is for native TreeView for better integration.
- **GitHub API Approach**: Using native Node.js https module instead of third-party libraries to minimize dependencies. Utilizing VS Code's configuration API (`aidd.githubToken`) for optional, secure handling of GitHub PAT.
- **Error Handling Strategy**: Implementing comprehensive error handling with user-friendly messages for common GitHub API issues, including rate limit notifications.

## Important Patterns and Preferences

- Modular code organization with clear separation of concerns
- Strong typing with TypeScript interfaces
- Asynchronous programming with async/await
- Descriptive naming conventions for better readability
- Comprehensive error handling

## Learnings and Insights

- VS Code extension API provides robust support for custom views in the explorer and secure configuration storage.
- GitHub API rate limiting for unauthenticated requests can be mitigated by using a PAT provided via the `aidd.githubToken` setting.
- TreeView implementation requires careful state management for checkboxes. **(Addressed by centralizing state in SelectionService)**.
- Confirmed GitHub API authentication logic in `github.ts` correctly handles the optional token. "Bad credentials" errors likely stem from invalid tokens or other API issues already caught by existing error handlers.
- Added specific error handling for recent repository selection in `explorerView.ts` to improve user feedback.
- Centralizing selection state in a dedicated service (`SelectionService`) simplifies state management across different components (`TreeProvider`, `TreeItem`, `ExplorerView`).
- Using VS Code's `onDidChangeCheckboxState` event (when available) provides a more native way to handle checkbox interactions compared to relying solely on custom commands or icon clicks.
- Unit testing services like `SelectionService` is straightforward with Mocha/Chai/Sinon, once the execution environment (Node.js vs VS Code host) and module incompatibilities (CJS vs ESM) are handled (using mocks and potentially dynamic imports or `ts-node`).
- Integration tests (`vscode-test`) are valuable for testing interactions with the VS Code API but have been removed for now.

## Current Challenges

- **Checkbox Implementation**: **(Largely addressed)** State management is now handled by `SelectionService`. UI updates rely on `TreeItem.checkboxState` (when available) or icon changes. Fallback command (`aidd.toggleSelection`) added for older VS Code versions without the checkbox API.
- **Recursive Directory Fetching/Selection**: Implemented fetching and selection up to depth 5 when a directory is checked. UI shows progress.
- **Recursive Directory *Download***: Still pending. The download logic needs to be updated to handle the recursively selected items.
- **Rate Limiting**: Now a more significant challenge due to potentially numerous API calls during initial load (depth 3) and recursive expansion (depth 5). Use of `aidd.githubToken` is highly recommended. Error handling for rate limits exists but needs testing under load.
- **Performance**: Initial load (depth 3) and recursive expansion (depth 5) can be slow for large/deep repositories. Full tree refresh on selection change might exacerbate this. Needs monitoring and potential optimization.

## Open Questions

- What's the best approach for implementing checkboxes in TreeView items? **(Partially answered: Use `TreeItem.checkboxState` API when available, fallback to command/icons. State managed by service.)**
- How should we handle downloading the contents of selected *directories*? (**Partially addressed**: Selection is recursive now. Need to implement recursive *download* logic based on the selection.)
- How should we handle very large repositories (performance for fetching, display, selection refresh)? (**More critical now**: Sequential recursive calls increase load. Caching in `itemMap` helps display, but API calls remain a bottleneck. Optimization might be needed.)
- What's the optimal way to preserve directory structure during download? **(Current implementation seems correct, creating parent dirs)**

## Recent Discoveries

- VS Code's TreeDataProvider interface can be extended to support custom item states
- GitHub API provides a recursive parameter for the contents endpoint, but it has limitations
- VS Code's workspace API provides utilities for working with the file system

## Current Experiments

- **Custom TreeItem Icons**: Testing different approaches for representing checkbox states with custom icons
- **Caching Strategy**: Evaluating different caching approaches for GitHub API responses to minimize requests
- **Progress Reporting**: Exploring VS Code's progress API for providing feedback during long operations

## Notes

The initial implementation will focus on core functionality with a clean, maintainable architecture. Advanced features like authentication for private repositories will be considered for future versions once the basic functionality is solid.
