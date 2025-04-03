# Active Context

## Purpose

This document tracks the current work focus, recent changes, next steps, active decisions and considerations, important patterns and preferences, and learnings and project insights.

## Current Focus

Setting up the initial VS Code extension project structure and implementing the core functionality for GitHub repository exploration.

## Recent Changes

- [2025-04-03]: Initialized memory bank with project documentation
- [2025-04-03]: Defined project requirements and architecture
- [2025-04-03]: Researched VS Code extension development best practices

## Next Steps

1. Initialize VS Code extension project using Yeoman generator
2. Implement GitHub API service for fetching repository content
3. Create TreeView provider with checkbox support
4. Implement file download functionality
5. Add error handling and user feedback
6. Test with various GitHub repositories

## Active Decisions

- **TreeView Implementation**: Deciding between using VS Code's built-in TreeView with custom checkboxes vs. a WebView implementation. Current preference is for native TreeView for better integration.
- **GitHub API Approach**: Using native Node.js https module instead of third-party libraries to minimize dependencies.
- **Error Handling Strategy**: Implementing comprehensive error handling with user-friendly messages for common GitHub API issues.

## Important Patterns and Preferences

- Modular code organization with clear separation of concerns
- Strong typing with TypeScript interfaces
- Asynchronous programming with async/await
- Descriptive naming conventions for better readability
- Comprehensive error handling

## Learnings and Insights

- VS Code extension API provides robust support for custom views in the explorer
- GitHub API has rate limiting that needs to be handled for unauthenticated requests
- TreeView implementation requires careful state management for checkboxes

## Current Challenges

- **Checkbox Implementation**: VS Code's TreeView doesn't natively support checkboxes; need to implement custom solution using TreeItem icons or states
- **Recursive Directory Fetching**: GitHub API requires separate requests for each directory, making recursive fetching complex
- **Rate Limiting**: GitHub API limits unauthenticated requests to 60 per hour, which may be insufficient for large repositories

## Open Questions

- What's the best approach for implementing checkboxes in TreeView items?
- How should we handle very large repositories with many files and directories?
- What's the optimal way to preserve directory structure during download?

## Recent Discoveries

- VS Code's TreeDataProvider interface can be extended to support custom item states
- GitHub API provides a recursive parameter for the contents endpoint, but it has limitations
- VS Code's workspace API provides utilities for working with the file system

## Current Experiments

- **Custom TreeItem Icons**: Testing different approaches for representing checkbox states with custom icons
- **Caching Strategy**: Evaluating different caching approaches for GitHub API responses to minimize requests
- **Progress Reporting**: Exploring VS Code's progress API for providing feedback during long operations

## Notes

The initial implementation will focus on core functionality with a clean, maintainable architecture. Advanced features like authentication for private repositories will be considered for future versions once the basic functionality is solid.
