# Active Context

## Purpose

This document tracks the current work focus, recent changes, next steps, active decisions and considerations, important patterns and preferences, and learnings and project insights.

## Current Focus

Refining core functionality, improving code structure through refactoring, particularly focusing on the download and selection mechanisms.

## Recent Changes

- [2025-04-18]: **Featured Repository**: Modified `explorerView.ts` (`promptForRepository`) to always display `ai-driven-dev/rules` as a "Featured repository" (using `$(star-full)` icon) at the top of the Quick Pick list when adding/selecting a repository. Other stored repositories are now shown with a `$(history)` icon. Updated the `placeHolder` text and the description for the `aidd.maxRecentRepositories` setting in `package.json` to reflect this change.
- [2025-04-15]: Reviewed Memory Bank files. No new development updates provided since [2025-04-13].
- [2025-04-13]: **Implemented Recursive Download**: Modified `explorerView.ts` (`downloadSelectedFiles`) to correctly map all selected items (files and directories, including recursively selected ones) and pass them to `DownloadService`. The service already handled creating directories and downloading files from the list. Fixed associated TypeScript errors during implementation.
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

1. **Testing**: Thoroughly test the download functionality with various scenarios (different repositories, selections, network conditions).

## Active Decisions

- **TreeView Implementation**: Using VS Code's built-in TreeView with custom checkboxes via `SelectionService`.
- **GitHub API Approach**: Using native Node.js https module with optional PAT for authentication. Utilizing efficient API calls for structure and content fetching.
- **Error Handling Strategy**: Implementing comprehensive error handling with user-friendly messages, especially for API limits and download issues.

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
- Testing remains crucial for validating end-to-end flows and UI interactions.

## Current Challenges

- **Handling Large Repositories**:
  - **Performance**: Potential bottleneck in processing/rendering large datasets from `git/trees`. Needs monitoring.
  - **User Experience**: For repositories resulting in >50 files selected for download, implement a confirmation dialog asking the user to proceed.
  - **Truncation**: Handling the `truncated` flag from the `git/trees` API is not yet implemented (low priority until observed).

## Open Questions

*(This section is intentionally left blank as per recent review)*

## Recent Discoveries

- GitHub's Git Trees API is highly effective for fetching complete file listings efficiently.
- VS Code's `onDidChangeCheckboxState` (if applicable/used) simplifies checkbox handling.

## Current Experiments

- Refining error messages for clarity.
- Evaluating progress reporting mechanisms for downloads.

## Notes

Focus is now shifting towards ensuring the reliability and robustness of the core download feature.
