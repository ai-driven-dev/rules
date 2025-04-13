# System Patterns

## Purpose

This document outlines the system architecture, key technical decisions, design patterns in use, component relationships, and critical implementation paths.

## System Architecture

The AI-Driven Dev Rules VS Code extension follows a modular architecture with clear separation of concerns:

1. **Extension Core**: Central module that initializes the extension and registers commands
2. **GitHub API Service**: Module for interacting with GitHub's REST API, handling optional authentication via a token provided through VS Code settings (`aidd.githubToken`).
3. **Tree View Provider**: Module for displaying repository content in VS Code's explorer
4. **File System Service**: Module for downloading and saving files locally

## Key Technical Decisions

- **Native Node.js https module**: Using built-in Node.js modules instead of third-party libraries to minimize dependencies and bundle size
- **VS Code TreeView API**: Leveraging VS Code's native TreeView API for displaying repository structure
- **VS Code Configuration API**: Using VS Code's configuration system (`aidd.githubToken`) for securely handling the optional GitHub PAT.
- **Modular Architecture**: Separating concerns into distinct modules for better maintainability
- **TypeScript Interfaces**: Using TypeScript interfaces for clear contracts between components

## Design Patterns

- **Provider Pattern**: For TreeView data provider implementation
- **Service Pattern**: For GitHub API and file system operations
- **Command Pattern**: For handling user actions through VS Code commands
- **Factory Pattern**: For creating tree items with appropriate properties

## Component Relationships

```
Extension Core
  ├── Registers commands
  ├── Initializes GitHub Service
  └── Initializes TreeView Provider
      └── Uses GitHub Service to fetch data
          └── Displays data in TreeView
              └── User interactions trigger commands
                  └── Commands use File System Service for downloads
```

## Data Flow

```
1. User enters GitHub repository URL and branch (or default is fetched).
2. GitHub Service fetches the entire repository file tree using the Git Trees API (`/git/trees/{sha}?recursive=1`).
3. TreeView Provider transforms the flat tree data into a hierarchical structure for display.
4. User selects/deselects files or directories via checkboxes. Directory selection triggers local recursive selection/deselection of descendants.
5. Download command collects selected files (including those selected recursively).
6. File System Service downloads and saves files, preserving structure.
```

## Critical Implementation Paths

1.  **GitHub API Integration (Git Trees)**
    *   Implement efficient fetching of the entire repository structure using the `git/trees?recursive=1` API endpoint.
    *   Handle potential `truncated` responses for very large repositories.
    *   Implement robust error handling specific to the Git Trees API (e.g., invalid SHA, repo not found).
    *   Continue using optional `Authorization` header via `aidd.githubToken`.

2.  **TreeView Implementation & Local Selection**
    *   Transform the flat data from Git Trees API into a hierarchical `TreeItem` structure.
    *   Implement checkbox state management via `SelectionService`.
    *   Handle user interactions (checkbox toggles) to trigger *local* recursive selection/deselection logic within `SelectionService`.
    *   Ensure efficient TreeView updates after initial load and selection changes.

3.  **Recursive File Download System**
    *   Enhance the download command to correctly identify all selected files, including those selected implicitly via recursive directory selection.
    *   Implement the download process to fetch content for all selected files.
    *   Preserve directory structure accurately during download.
    *   Provide clear progress indication and error reporting for bulk downloads.

## Error Handling Strategy

- **API Errors**: Catch and display meaningful error messages for GitHub API issues
- **Rate Limiting**: Detect rate limit errors and inform user with clear instructions. Encourage users to provide a token via `aidd.githubToken` setting to increase limits.
- **Network Issues**: Graceful handling of network failures with retry options
- **File System Errors**: Proper error handling for file system operations with user feedback

## Performance Considerations

- **Efficient Fetching**: Using the `git/trees?recursive=1` API significantly reduces the number of API calls compared to recursive `contents` calls.
- **Initial Load Processing**: Processing and displaying the potentially large dataset from `git/trees` might be a bottleneck. Monitor and optimize TreeView rendering if needed.
- **Local Selection**: Recursive selection/deselection is performed locally, making it fast and responsive without additional API calls.
- **Caching**: Caching the `git/trees` response can improve performance for subsequent views of the same repository/branch.
- **Truncated Responses**: Need a strategy for handling the `truncated` flag in `git/trees` responses for extremely large repositories (though this is rare).
- **Asynchronous Operations**: Ensure UI remains responsive during the initial API call and download process.

## Security Patterns

- **Input Validation**: Validate all user inputs before making API requests
- **Error Message Sanitization**: Ensure error messages don't expose sensitive information
- **Secure Credential Handling**: Utilize VS Code's secure configuration storage (`aidd.githubToken`) for the optional GitHub PAT. Avoid storing credentials directly in the extension's code or state.

## Scalability Approach

The extension's scalability for large repositories is improved by:

- **Single API Call Fetching**: Using `git/trees?recursive=1` fetches the structure efficiently.
- **Local State Management**: Selection state is managed locally, avoiding API calls during interaction.
- **Potential Bottlenecks**: Focus shifts to handling potentially large datasets in memory for the TreeView and managing `truncated` API responses if they occur.

## Technical Debt

- **Recursive Download**: The logic for downloading files selected via recursive directory checks is not yet implemented.
- **Truncated Tree Handling**: No specific handling for the `truncated` flag in the `git/trees` API response is implemented yet.
- **Advanced Filtering/Search**: Deferred to future versions.
- **Private Repositories**: While authentication is supported via `aidd.githubToken`, explicit testing and potential UI adjustments for private repositories haven't been prioritized.
