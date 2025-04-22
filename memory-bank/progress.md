# Progress

## Purpose

This document tracks what works, what's left to build, current status, known issues, and the evolution of project decisions.

## Current Status

Core functionality (browsing, selection, download) is implemented. **Update status checking** and **view filtering** based on configuration are also implemented. Focus is now on testing these features.

## What Works

- **Project Planning**: Complete, with clear requirements and architecture defined
- **Memory Bank**: Initialized and updated with latest changes
- **Technical Research**: Completed research on VS Code extension development and GitHub API
- **GitHub API Authentication**: Implemented optional token authentication via VS Code setting (`aidd.githubToken`).
- **Basic Error Handling**: Improved error feedback in `explorerView.ts` for repository loading and clarified message for directory-only selection.
- **Repository Browsing**: TreeView displays repository structure.
- **Repository Fetching**: Uses efficient `git/trees?recursive=1` API (`github.ts`).
- **Selection Logic**: Centralized in `SelectionService`, handles local recursive selection/deselection.
- **Download Logic & SHA Storage**: `explorerView.ts` maps selected items (including SHA) to `DownloadFile`. `DownloadService` downloads files and stores their SHAs in `workspaceState`.
- **Update Status Check**: Manual check via `aidd.refreshRuleStatus` command compares local and remote SHAs using `UpdateCheckService`.
- **Update Status Display**: Status (🔄 Updated, ✅ New) is shown via emoji prefixes in the main `ExplorerTreeProvider` view. Remotely deleted files are hidden.
- **Status Bar Feedback**: `StatusBarService` indicates the status of update checks.
- **View Filtering**: `ExplorerTreeProvider` filters displayed items based on the `aidd.includePaths` setting. View refreshes automatically when the setting changes.
- **Featured Repository**: Quick Pick list highlights the featured repository.

## Known Issues

- **Error Handling**: Specific error handling for `git/trees` API (including `truncated` flag) needs review. Error reporting for update checks relies on status bar and notifications.
- **Potential Performance with Large Repos**:
    - Displaying the TreeView after loading a very large repository structure might be slow.
    - **Update Status Check**: Fetching the full remote tree for status checks might be slow for very large repositories.
- **Filtering Logic**: Basic path/prefix filtering implemented. More complex glob patterns or regex are not supported.

## Evolution of Decisions

- **Extension Structure**: Initial plan for complex folder structure → Simplified structure based on Yeoman generator, for better alignment with VS Code conventions
- **API Client**: Considered third-party GitHub API clients → Decided on native Node.js https module, to minimize dependencies
- **UI Approach**: Considered custom WebView → Decided on native TreeView, for better integration with VS Code
- **Token Handling**: Considered environment variables (`.env`, system) → Decided on standard VS Code configuration setting (`aidd.githubToken`) for security and user experience.
- **Selection State**: Initial approach with state in `TreeItem` → Refactored to central `SelectionService`.
- **Repository Fetching**: Recursive `contents` API calls → Single `git/trees?recursive=1` API call for efficiency (used for both browsing and update checks).
- **Recursive Selection**: API calls on directory check → Local state update based on pre-fetched data for responsiveness.
- **Update View**: Separate "Rule Updates" view → Integrated status display (emojis) into the main explorer view.

## Performance Metrics

- **Not Yet Available**: Will be tracked once implementation begins

## Testing Status

- **Testing**: Required to validate end-to-end functionality, especially download (with SHA storage), update status checking, and view filtering.

## Deployment History

- **No Deployments Yet**: Project is in planning phase

## Notes

Recent work focused on adding update status checking and view filtering. The update status is now integrated directly into the main explorer view using emojis. Key bug fixes related to SHA storage during download were implemented. Next steps involve thorough testing of these new features.
