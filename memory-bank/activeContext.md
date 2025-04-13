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
- [2025-04-13]: **Refactored repository content fetching**: Replaced previous recursive `contents` API calls with a single, efficient call to the GitHub Git Trees API (`GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1`) in `github.ts`. This fetches the entire repository structure in one request.
- [2025-04-13]: **Refactored recursive selection**: Implemented *local* recursive selection/deselection logic in `SelectionService` and `ExplorerTreeProvider`. When a directory checkbox is toggled, the selection state of all its descendants is updated based on the already fetched tree data, without requiring further API calls. Removed previous progress indicators related to API-based recursive selection.

## Next Steps

1.  **Implement Recursive Download**:
    *   Modify `downloadSelectedFiles` in `explorerView.ts` and the `downloadFile` function in `src/services/download.ts`.
    *   Use `SelectionService.getSelection()` to get all selected items (including those selected recursively).
    *   For each selected item, if it's a file (`type === 'blob'`), download it using its path.
    *   Ensure the local directory structure is correctly created based on the item paths.
    *   Add progress indication for bulk downloads.
2.  **Test Git Trees & Local Selection**:
    *   Manually test the loading of various repositories (different sizes, structures, branches) using the Git Trees API.
    *   Verify the local recursive selection/deselection logic works correctly by toggling directory checkboxes and checking descendant states.
    *   Add unit tests for the tree transformation logic (flat Git Tree data to hierarchical `TreeItem` structure) if feasible.
3.  **Error Handling & Edge Cases**:
    *   Implement specific error handling for the `git/trees` API call (e.g., invalid SHA, repository not found, rate limits).
    *   Consider and potentially implement handling for the `truncated` flag in the `git/trees` response (e.g., notify the user, offer partial load).
4.  **Performance Monitoring**:
    *   Observe TreeView performance during initial load and rendering, especially with large repositories fetched via `git/trees`. Optimize if necessary (e.g., virtual scrolling, delayed rendering - though likely overkill initially).

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
- **Using the `git/trees?recursive=1` API is significantly more efficient for fetching full repository structures compared to recursive calls to the `contents` API.**
- **Performing recursive selection *locally* after the initial load avoids unnecessary API calls and improves responsiveness when toggling directory checkboxes.**

## Current Challenges

- **Recursive Directory Download**: The primary remaining implementation task. Requires updating download logic to iterate through the selection state provided by `SelectionService` and fetch individual files.
- **Handling Large Repositories**:
    - **Performance**: Processing and rendering the potentially large, flat dataset from the `git/trees` API into a TreeView.
    - **Truncation**: Handling the `truncated` flag from the `git/trees` API if encountered (though potentially rare).
- **Testing**: Ensuring the new Git Trees fetching and local recursive selection logic are robust across various scenarios.
- **Error Handling**: Implementing specific error handling for the Git Trees API and the download process.

## Open Questions

- How exactly should the recursive download logic iterate through the selection and fetch files? (**Answered in Next Steps**: Use `SelectionService.getSelection()`, filter for files, download using their paths).
- What is the best user experience if a `git/trees` response is `truncated`? (Notify? Offer partial download? Ignore initially?)
- Are further performance optimizations needed for TreeView rendering after the `git/trees` load? (Monitor first).

## Recent Discoveries

- VS Code's TreeDataProvider interface can be extended to support custom item states
- **GitHub's `git/trees` API with `recursive=1` is the standard and most efficient way to fetch a complete repository file listing.** (Supersedes previous discovery about `contents` endpoint limitations).
- VS Code's workspace API provides utilities for working with the file system

## Current Experiments

- **Custom TreeItem Icons**: Testing different approaches for representing checkbox states with custom icons
- **Caching Strategy**: Evaluating different caching approaches for GitHub API responses to minimize requests
- **Progress Reporting**: Exploring VS Code's progress API for providing feedback during long operations

## Notes

The initial implementation will focus on core functionality with a clean, maintainable architecture. Advanced features like authentication for private repositories will be considered for future versions once the basic functionality is solid.
