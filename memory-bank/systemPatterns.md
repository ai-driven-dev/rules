# System Patterns

## Purpose

This document outlines the system architecture, key technical decisions, design patterns in use, component relationships, and critical implementation paths.

## System Architecture

The AI-Driven Dev Rules VS Code extension follows a modular architecture with clear separation of concerns:

1. **Extension Core**: Central module that initializes the extension and registers commands
2. **GitHub API Service**: Module for interacting with GitHub's REST API, handling optional authentication via a token provided through VS Code settings (`aidd.githubToken`).
3. **Tree View Provider (`ExplorerTreeProvider`)**: Module for displaying repository content (potentially filtered) in VS Code's explorer, indicating update status.
4. **Download Service (`DownloadService`)**: Module for downloading and saving files locally, storing downloaded file SHAs in `workspaceState`.
5. **Update Check Service (`UpdateCheckService`)**: Module for comparing local SHAs with remote SHAs fetched via GitHub API.
6. **Status Bar Service (`StatusBarService`)**: Module for managing a status bar item indicating update check status.
7. **Selection Service (`SelectionService`)**: Module for managing the selection state of items in the TreeView.
8. **State Service (`ExplorerStateService`)**: Module for managing the internal state of the explorer view (loaded items, repository info).

## Key Technical Decisions

- **Native Node.js https module**: Using built-in Node.js modules instead of third-party libraries to minimize dependencies and bundle size.
- **VS Code TreeView API**: Leveraging VS Code's native TreeView API for displaying repository structure.
- **VS Code Configuration API**: Utilizing VS Code's configuration system for securely handling optional authentication tokens (PAT).
- **Modular Architecture**: Separating concerns into distinct modules (Services, API, Views, etc.) for better maintainability.
- **TypeScript Interfaces**: Using TypeScript interfaces for clear contracts between components.

## Design Patterns

- **Provider Pattern**: For TreeView data provider implementation
- **Service Pattern**: For GitHub API, download, update check, status bar, selection, and state management operations.
- **Command Pattern**: For handling user actions through VS Code commands.
- **Factory Pattern**: For creating tree items (`ExplorerTreeItem`) with appropriate properties.

## Component Relationships

```
Extension Core (`extension.ts`)
  ├── Initializes Services (Logger, HttpClient, RateLimitManager, GitHubApi, Storage, State, Selection, Download, UpdateCheck, StatusBar)
  ├── Initializes Views (`ExplorerView`, `WelcomeView`)
  │   └── ExplorerView initializes `ExplorerTreeProvider` (passing services)
  ├── Registers Tree Data Providers (`ExplorerTreeProvider`, `WelcomeView`)
  ├── Registers Commands (`registerCommands`)
  │   └── Commands interact with Views and Services
  └── Registers Event Listeners (e.g., `onDidChangeConfiguration`)
```

## Data Flow (Simplified)

1.  **Load/Refresh View**:
    *   `ExplorerTreeProvider` requests repository content (recursive tree) via `GitHubApiService`.
    *   `ExplorerTreeProvider` reads include filters from configuration (`aidd.includePaths`).
    *   `ExplorerTreeProvider` processes fetched content:
        *   Applies include filters.
        *   Checks `updateStatusMap` (populated by `refreshAndUpdateStatus`) for each item's status.
        *   Skips remotely deleted items.
        *   Creates `ExplorerTreeItem` instances (with status emoji prefix if needed).
    *   TreeView displays the filtered items.
2.  **Download**:
    *   User selects items via checkboxes (`SelectionService` tracks state).
    *   User triggers "Download" command.
    *   `ExplorerView` gets selected items, maps them to `DownloadFile` objects (including SHA).
    *   `DownloadService` downloads files via `GitHubApiService` or uses base64 content.
    *   On success, `DownloadService` stores the file path and SHA in `workspaceState`.
3.  **Check Update Status**:
    *   User triggers "Check Updates" command (`aidd.refreshRuleStatus`).
    *   `StatusBarService` shows "Checking...".
    *   `ExplorerTreeProvider` calls `UpdateCheckService.checkUpdates`.
    *   `UpdateCheckService` reads local SHAs from `workspaceState`.
    *   `UpdateCheckService` fetches remote tree via `GitHubApiService`.
    *   `UpdateCheckService` compares SHAs, determines status (`up-to-date`, `update-available`, `remote-new`, `remote-deleted`).
    *   `ExplorerTreeProvider` updates its internal `updateStatusMap` with results.
    *   `ExplorerTreeProvider` fires `_onDidChangeTreeData` to refresh the view (applying new emojis/tooltips).
    *   `StatusBarService` shows the result (Success/Fail).
```

## Critical Implementation Paths

1.  **GitHub API Integration (Structure Fetching)**
    *   Implement efficient fetching of the entire repository structure using appropriate GitHub API endpoints (details in `techContext.md`).
    *   Handle potential API limitations (e.g., truncation) for very large repositories.
    *   Implement robust error handling specific to the GitHub API interactions.
    *   Utilize optional authentication tokens passed via VS Code settings.

2.  **TreeView Implementation & Local Selection**
    *   Transform the flat data from Git Trees API into a hierarchical `TreeItem` structure.
    *   Implement checkbox state management via `SelectionService`.
    *   Handle user interactions (checkbox toggles) to trigger *local* recursive selection/deselection logic within `SelectionService`.
    *   Ensure efficient TreeView updates after initial load, selection changes, and status updates.
    *   Apply `aidd.includePaths` filter during item processing.

3.  **File Download & SHA Storage**
    *   Ensure `DownloadService` correctly receives the file SHA from `ExplorerView`.
    *   Implement robust storage of file path and SHA in `workspaceState` upon successful download.

4.  **Update Status Check & Display**
    *   Implement `UpdateCheckService` to accurately compare local `workspaceState` SHAs with remote SHAs from the Git Tree API.
    *   Correctly identify `up-to-date`, `update-available`, `remote-new`, and `remote-deleted` states.
    *   Ensure `ExplorerTreeProvider` uses the status results to update `ExplorerTreeItem` labels (emojis) and tooltips.
    *   Provide clear feedback via `StatusBarService`.

## Error Handling Strategy

- **API Errors**: Catch and display meaningful error messages for GitHub API issues
- **Rate Limiting**: Detect rate limit errors and inform user with clear instructions. Encourage users to provide an authentication token via settings to increase limits.
- **Network Issues**: Graceful handling of network failures with retry options.
- **File System Errors**: Proper error handling for file system operations with user feedback.
- **Update Check Errors**: Handle errors during the update check process gracefully (e.g., API errors, state reading errors) and report via status bar/notifications.

## Performance Considerations

- **Efficient Fetching**: Utilizing efficient GitHub API endpoints (like Git Trees) reduces the number of API calls for structure fetching.
- **Initial Load Processing**: Processing and displaying potentially large datasets from the API might be a bottleneck. Monitor and optimize TreeView rendering if needed.
- **Local Selection**: Recursive selection/deselection is performed locally, making it fast and responsive without additional API calls.
- **Caching**: Caching API responses (especially the Git Tree) can improve performance for subsequent views and status checks. (Currently relies on VS Code/GitHub HTTP caching).
- **Truncated Responses**: Need a strategy for handling potential API response truncation for extremely large repositories (Git Trees API).
- **Status Check Performance**: Fetching and comparing the entire tree for status checks might be slow for very large repositories. Consider optimizations if needed (e.g., checking only tracked files via individual API calls - potentially slower due to many calls).
- **Asynchronous Operations**: Ensure UI remains responsive during API calls, download processes, and status checks.

## Security Patterns

- **Input Validation**: Validate all user inputs before making API requests.
- **Error Message Sanitization**: Ensure error messages don't expose sensitive information.
- **Secure Credential Handling**: Utilize VS Code's secure configuration storage for optional authentication tokens (PAT). Avoid storing credentials directly in the extension's code or state.
- **Workspace State**: Store non-sensitive operational data like downloaded file SHAs in `workspaceState`.

## Scalability Approach

The extension's scalability for large repositories is improved by:

- **Efficient API Fetching**: Using appropriate API endpoints (like Git Trees) fetches the structure efficiently.
- **Local State Management**: Selection state is managed locally, avoiding API calls during interaction.
- **Potential Bottlenecks**: Handling large datasets for TreeView rendering, processing large Git Trees API responses, and comparing large numbers of files during status checks.

## Technical Debt

- **Truncated API Response Handling**: No specific handling for potential API response truncation (e.g., `truncated` flag in Git Trees) is implemented yet. Needs investigation if encountered.
- **Advanced Filtering/Search**: Basic path filtering implemented (`includePaths`). More advanced filtering/search deferred.
- **Private Repositories**: While authentication is supported via settings, explicit testing and potential UI adjustments for private repositories haven't been prioritized.
- **Update Application**: Only status checking is implemented; actually applying the updates is deferred.
- **Status Check Optimization**: Current status check fetches the full remote tree. For very large repos with few tracked files, this might be inefficient.
