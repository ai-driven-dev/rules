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
- **Featured Repository**: The Quick Pick list for selecting repositories now always shows `ai-driven-dev/rules` as a "Featured" item at the top.

## Known Issues

- **Error Handling**: Specific error handling for `git/trees` API (including `truncated` flag) and enhanced download error handling are not yet implemented.
- **Potential Performance with Large Repos**: Displaying the TreeView after loading a very large repository structure via `git/trees` might be slow. Needs monitoring.

## Evolution of Decisions

- **Extension Structure**: Initial plan for complex folder structure → Simplified structure based on Yeoman generator, for better alignment with VS Code conventions
- **API Client**: Considered third-party GitHub API clients → Decided on native Node.js https module, to minimize dependencies
- **UI Approach**: Considered custom WebView → Decided on native TreeView, for better integration with VS Code
- **Token Handling**: Considered environment variables (`.env`, system) → Decided on standard VS Code configuration setting (`aidd.githubToken`) for security and user experience.
- **Selection State**: Initial approach with state in `TreeItem` → Refactored to central `SelectionService`.
- **Repository Fetching**: Recursive `contents` API calls → Single `git/trees?recursive=1` API call for efficiency.
- **Recursive Selection**: API calls on directory check → Local state update based on pre-fetched data for responsiveness.

## Performance Metrics

- **Not Yet Available**: Will be tracked once implementation begins

## Testing Status

- **Testing**: Required to validate end-to-end functionality, especially recursive download and UI interactions.

## Deployment History

- **No Deployments Yet**: Project is in planning phase

## Notes

The project is well-positioned to begin implementation with a clear understanding of requirements and architecture. The focus will be on creating a clean, maintainable codebase that follows VS Code extension best practices. The incremental development approach will allow for regular testing and refinement throughout the process.
