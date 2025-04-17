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

- **Native Node.js https module**: Using built-in Node.js modules instead of third-party libraries to minimize dependencies and bundle size.
- **VS Code TreeView API**: Leveraging VS Code's native TreeView API for displaying repository structure.
- **VS Code Configuration API**: Utilizing VS Code's configuration system for securely handling optional authentication tokens (PAT).
- **Modular Architecture**: Separating concerns into distinct modules (Services, API, Views, etc.) for better maintainability.
- **TypeScript Interfaces**: Using TypeScript interfaces for clear contracts between components.

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

1.  **GitHub API Integration (Structure Fetching)**
    *   Implement efficient fetching of the entire repository structure using appropriate GitHub API endpoints (details in `techContext.md`).
    *   Handle potential API limitations (e.g., truncation) for very large repositories.
    *   Implement robust error handling specific to the GitHub API interactions.
    *   Utilize optional authentication tokens passed via VS Code settings.

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
- **Rate Limiting**: Detect rate limit errors and inform user with clear instructions. Encourage users to provide an authentication token via settings to increase limits.
- **Network Issues**: Graceful handling of network failures with retry options.
- **File System Errors**: Proper error handling for file system operations with user feedback.

## Performance Considerations

- **Efficient Fetching**: Utilizing efficient GitHub API endpoints (like Git Trees) reduces the number of API calls for structure fetching.
- **Initial Load Processing**: Processing and displaying potentially large datasets from the API might be a bottleneck. Monitor and optimize TreeView rendering if needed.
- **Local Selection**: Recursive selection/deselection is performed locally, making it fast and responsive without additional API calls.
- **Caching**: Caching API responses can improve performance for subsequent views of the same repository/branch.
- **Truncated Responses**: Need a strategy for handling potential API response truncation for extremely large repositories.
- **Asynchronous Operations**: Ensure UI remains responsive during API calls and download processes.

## Security Patterns

- **Input Validation**: Validate all user inputs before making API requests.
- **Error Message Sanitization**: Ensure error messages don't expose sensitive information.
- **Secure Credential Handling**: Utilize VS Code's secure configuration storage for optional authentication tokens (PAT). Avoid storing credentials directly in the extension's code or state.

## Scalability Approach

The extension's scalability for large repositories is improved by:

- **Efficient API Fetching**: Using appropriate API endpoints (like Git Trees) fetches the structure efficiently.
- **Local State Management**: Selection state is managed locally, avoiding API calls during interaction.
- **Potential Bottlenecks**: Focus shifts to handling potentially large datasets in memory for the TreeView and managing potential API response truncation if they occur.

## Technical Debt

- **Truncated API Response Handling**: No specific handling for potential API response truncation (e.g., `truncated` flag in Git Trees) is implemented yet. Needs investigation if encountered.
- **Advanced Filtering/Search**: Deferred to future versions. Could enhance rule discoverability.
- **Private Repositories**: While authentication is supported via settings, explicit testing and potential UI adjustments for private repositories haven't been prioritized.
