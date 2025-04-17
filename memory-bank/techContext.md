# Technical Context

## Purpose

This document outlines the technologies used, development setup, technical constraints, dependencies, and tool usage patterns.

## Technologies

- **TypeScript**: Latest stable, primary development language for VS Code extensions
- **Node.js**: Latest LTS, runtime environment
- **VS Code API**: Latest, for extension development and UI integration
- **GitHub REST API**: v3, specifically using the `repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1` endpoint for efficient structure fetching, and `repos/{owner}/{repo}/contents` for individual file downloads.

## Development Environment

- **Operating System**: macOS (primary), cross-platform compatible
- **IDE/Editor**: VS Code
- **Required Tools**:
  - Node.js and npm
  - Yeoman and VS Code Extension Generator
  - Git

## Setup Instructions

1. Install Node.js and npm
2. Install Yeoman and VS Code Extension Generator: `npm install -g yo generator-code`
3. Generate extension scaffold: `yo code`
4. Install dependencies: `npm install`
5. Open project in VS Code

## Build Process

```
1. Compile TypeScript: npm run compile
2. Watch mode for development: npm run watch
3. Package extension: npm run package (creates .vsix file)
```

## Deployment Process

```
1. Package extension: npm run package
2. Install from VSIX: code --install-extension your-extension.vsix
3. Publish to VS Code Marketplace (future consideration)
```

## Dependencies

### Frontend

- **VS Code API**: For UI integration and extension functionality
- **VS Code WebView API**: For custom views if needed

### Backend

- **Node.js https module**: For GitHub API requests
- **Node.js fs module**: For file system operations

### Development

- **TypeScript**: For type-safe development
- **ESLint**: For code quality (`eslint.config.mjs`, `npm run lint:fix`)
- **@types/***: Type definitions for dev dependencies

## API Integrations

- **GitHub REST API**:
  - Git Trees (`/repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1`): For fetching full repository structure efficiently. <https://docs.github.com/en/rest/git/trees#get-a-tree>
  - Repository Contents (`/repos/{owner}/{repo}/contents/{path}`): For downloading individual file content. <https://docs.github.com/en/rest/repos/contents#get-repository-content>
  - Branches (`/repos/{owner}/{repo}/branches/{branch}`): To get the SHA of the default branch head. <https://docs.github.com/en/rest/branches/branches#get-a-branch>
- **VS Code Extension API**: For integrating with VS Code, <https://code.visualstudio.com/api/references/vscode-api>

## Technical Constraints

- **GitHub API Rate Limiting**: Applies to all requests. Using the `git/trees` API reduces the *number* of requests for structure fetching but might return large responses. Authenticated requests (`aidd.githubToken`) have higher limits. Need to monitor usage.
- **GitHub API `truncated` Flag**: The `git/trees` API may return truncated results for extremely large repositories. Need a strategy if this occurs.
- **VS Code Extension Performance**: Handling potentially large datasets from the `git/trees` API in the TreeView requires efficient processing and rendering.
- **Cross-platform Compatibility**: Ensure file system operations and paths work correctly on Windows, macOS, and Linux.

## Monitoring and Logging

Extension will use VS Code's output channel for logging during development and debugging. Error reporting will be handled through VS Code's notification system for end users.
