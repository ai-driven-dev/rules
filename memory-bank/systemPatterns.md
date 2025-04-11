# System Patterns

## Purpose

This document outlines the system architecture, key technical decisions, design patterns in use, component relationships, and critical implementation paths.

## System Architecture

The GitHub Explorer VS Code extension follows a modular architecture with clear separation of concerns:

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
1. User enters GitHub repository URL
2. GitHub Service fetches repository structure
3. TreeView Provider transforms data into displayable format
4. User selects files via checkboxes
5. Download command collects selected files
6. File System Service downloads and saves files
```

## Critical Implementation Paths

1. **GitHub API Integration**
   - Implement HTTPS requests to GitHub API, including optional `Authorization` header using the token from VS Code settings.
   - Parse JSON responses into typed objects
   - Handle pagination for large repositories
   - Implement error handling and rate limit awareness

2. **TreeView Implementation**
   - Create TreeDataProvider implementation
   - Define TreeItem structure with checkboxes
   - Implement refresh and selection mechanisms
   - Handle user interactions with tree items

3. **File Download System**
   - Collect selected files from TreeView
   - Create local directory structure
   - Download files while preserving paths
   - Handle download errors and reporting

## Error Handling Strategy

- **API Errors**: Catch and display meaningful error messages for GitHub API issues
- **Rate Limiting**: Detect rate limit errors and inform user with clear instructions. Encourage users to provide a token via `aidd.githubToken` setting to increase limits.
- **Network Issues**: Graceful handling of network failures with retry options
- **File System Errors**: Proper error handling for file system operations with user feedback

## Performance Considerations

- **Lazy Loading**: Load repository contents progressively to handle large repositories
- **Caching**: Cache API responses to reduce redundant requests
- **Throttling**: Implement request throttling to avoid hitting API rate limits
- **Asynchronous Operations**: Ensure UI remains responsive during API calls and downloads

## Security Patterns

- **Input Validation**: Validate all user inputs before making API requests
- **Error Message Sanitization**: Ensure error messages don't expose sensitive information
- **Secure Credential Handling**: Utilize VS Code's secure configuration storage (`aidd.githubToken`) for the optional GitHub PAT. Avoid storing credentials directly in the extension's code or state.

## Scalability Approach

The extension is designed to handle repositories of various sizes through:

- Progressive loading of repository contents
- Efficient memory management for large file structures
- Pagination handling for GitHub API responses

## Technical Debt

- Initial version focuses on public repositories, but now supports authenticated requests via `aidd.githubToken`, potentially enabling access to private repositories if the token has sufficient permissions.
- Advanced filtering and search capabilities deferred to future versions
