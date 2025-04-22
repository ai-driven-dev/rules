# Active Context

## Purpose

This document tracks the current work focus, recent changes, next steps, active decisions and considerations, important patterns and preferences, and learnings and project insights.

## Current Focus

Testing and refining the newly implemented update status check and view filtering features. Ensuring robustness and clear user feedback.

## Recent Changes

- [2025-04-22]: **Corrected Update Status Bug**: Fixed an issue where newly downloaded files were incorrectly marked as "new" (✅) after a status refresh. Ensured the file SHA is correctly passed from `ExplorerView` to `DownloadService` so it can be stored in `workspaceState`. (`ExplorerView.downloadSelectedFiles`)
- [2025-04-22]: **Merged Update View**: Removed the separate "Rule Updates" view. Integrated update status directly into the main "Repository Explorer" view using emoji prefixes (🔄 for updated, ✅ for new) on the item labels. Items deleted remotely are now hidden. (`ExplorerTreeItem`, `ExplorerTreeProvider`, `package.json`, `extension.ts`, `commands/index.ts`)
- [2025-04-22]: **Corrected Filtering Logic**: Refined the path filtering logic in `ExplorerTreeProvider.matchesIncludeFilters` to correctly match exact paths and directory prefixes based on the `aidd.includePaths` setting.
- [2025-04-22]: **Added View Filtering**: Implemented filtering in `ExplorerTreeProvider` based on the new `aidd.includePaths` configuration setting. Added listener in `extension.ts` to refresh the view when the setting changes. (`ExplorerTreeProvider`, `package.json`, `extension.ts`)
- [2025-04-22]: **Added Update Status Check**: Implemented manual update checking (`aidd.refreshRuleStatus` command, button, status bar item). Compares local SHAs (stored during download via modified `DownloadService`) with remote SHAs fetched via `UpdateCheckService`. (`DownloadService`, `UpdateCheckService`, `ExplorerTreeProvider`, `ExplorerTreeItem`, `StatusBarService`, `package.json`, `extension.ts`, `commands/index.ts`)
- [2025-04-18]: **Featured Repository**: Modified `explorerView.ts` (`promptForRepository`) to always display `ai-driven-dev/rules` as a "Featured repository" (`$(star-full)` icon). Other stored repositories use `$(history)`. Updated related settings descriptions.
- [2025-04-15]: Reviewed Memory Bank files.
- [2025-04-13]: **Implemented Recursive Download**: Modified `explorerView.ts` (`downloadSelectedFiles`) to correctly map selected items for `DownloadService`.
- [2025-04-13]: **Refactored recursive selection**: Implemented *local* recursive selection/deselection logic in `SelectionService` and `ExplorerTreeProvider`. When a directory checkbox is toggled, the selection state of all its descendants is updated based on the already fetched tree data, without requiring further API calls. Removed previous progress indicators related to API-based recursive selection.
- [2025-04-13]: **Refactored repository content fetching**: Replaced previous recursive `contents` API calls with a single, efficient call to the GitHub Git Trees API (`GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1`) in `github.ts`. This fetches the entire repository structure in one request.
- [2025-04-12]: Renamed extension to "AI-Driven Dev Rules" (aidd)
  - Updated package.json, README.md, and CHANGELOG.md
  - Modified command titles in package.json
  - Updated documentation references
- [2025-04-11]: Corrected ESLint warnings (missing curly braces). Added `lint:fix` script to `package.json`.
- [2025-04-11]: Updated `ExplorerView`, `ExplorerTreeProvider`, and `ExplorerTreeItem` to use `SelectionService`.
- [2025-04-11]: Refactored selection logic into a dedicated `SelectionService` (`src/services/selection.ts`).
- [2025-04-11]: Clarified "No files selected" message in `explorerView.ts` when only directories are selected for download.
- [2025-04-11]: Fixed TypeScript error in `explorerView.ts` related to `ExplorerTreeProvider` constructor arguments.
- [2025-04-11]: Improved error handling in `explorerView.ts` by adding specific `try...catch` for recent repository selection to prevent silent failures.
- [2025-04-11]: Implemented optional GitHub token authentication via VS Code setting (`aidd.githubToken`) to mitigate rate limits.
- [2025-04-03]: Researched VS Code extension development best practices
- [2025-04-03]: Defined project requirements and architecture
- [2025-04-03]: Initialized memory bank with project documentation

## Next Steps

1. **Testing**:
    - Thoroughly test the **update status check** functionality (correct status detection, emoji display, status bar feedback).
    - Thoroughly test the **view filtering** (`aidd.includePaths`) with various path combinations.
    - Thoroughly test the **download functionality** (including SHA storage) with various scenarios.
2. **Refinement**: Improve UI/UX based on testing (e.g., clarity of tooltips, status bar messages).

## Active Decisions

- **TreeView Implementation**: Using VS Code's built-in TreeView with custom checkboxes via `SelectionService`.
- **GitHub API Approach**: Using native Node.js https module with optional PAT for authentication. Utilizing efficient API calls for structure and content fetching.
- **Error Handling Strategy**: Implementing comprehensive error handling with user-friendly messages, especially for API limits, download issues, and update checks. Using status bar for persistent feedback on checks.
- **Update Indication**: Using emoji prefixes (🔄, ✅) directly in the main explorer view label instead of a separate view. Hiding remotely deleted files.
- **Filtering**: Applying include path filters directly during item processing in the TreeProvider.

## Important Patterns and Preferences

- Modular code organization (Services, Views, Utils, API)
- Strong typing with TypeScript
- Async/await for asynchronous operations
- Descriptive naming
- Comprehensive error handling

## Learnings and Insights

- Centralizing selection state in `SelectionService` simplifies management.
- Utilizing efficient GitHub API endpoints (like Git Trees) is crucial for performance when fetching repository structure.
- Local recursive selection improves UI responsiveness.
- Storing state (like downloaded file SHAs) in `workspaceState` allows for persistence between sessions.
- Separating concerns into services (`DownloadService`, `UpdateCheckService`, `StatusBarService`, etc.) improves maintainability.
- Testing remains crucial for validating end-to-end flows and UI interactions, especially with state management and API interactions.

## Current Challenges

- **Handling Large Repositories**:
  - **Performance**: Potential bottleneck in processing/rendering large datasets from `git/trees`. Needs monitoring.
  - **User Experience**: For repositories resulting in >50 files selected for download, implement a confirmation dialog asking the user to proceed.
  - **Truncation**: Handling the `truncated` flag from the `git/trees` API is not yet implemented (low priority until observed).
- **Scalability of Status Check**: For repositories with thousands of files, comparing local state with the full remote tree might become slow. Needs monitoring.

## Open Questions

*(This section is intentionally left blank as per recent review)*

## Recent Discoveries

- GitHub's Git Trees API is highly effective for fetching complete file listings efficiently.
- VS Code's `onDidChangeCheckboxState` (if applicable/used) simplifies checkbox handling.

## Current Experiments

- Refining error messages for clarity.
- Evaluating progress reporting mechanisms for downloads.

## Notes

Focus is now shifting towards testing and refining the update check and filtering features alongside the core download functionality.
