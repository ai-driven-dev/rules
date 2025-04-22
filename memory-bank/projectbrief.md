# Project Brief

## Overview

This document serves as the foundation for the project, defining core requirements and goals. It is the source of truth for the high-level project scope. For detailed product context, user needs, and features, refer to `productContext.md`.

## Project Name

AI-Driven Dev Rules VS Code Extension (aidd)

## Project Description

A VS Code extension enabling developers to discover, download, and manage community-curated rule sets for AI-assisted development tools directly within their IDE. It facilitates the sharing and consumption of best-practice rules stored in GitHub repositories.

## Core Requirements

- Connect to specified GitHub repositories (public or private via PAT) containing rule sets.
- Display the structure (files/directories) of rule sets within a VS Code view.
- Allow users to select specific rules or rule directories for download.
- Download selected rules into the user's current workspace, preserving structure.
- Provide a mechanism for configuring source repositories and authentication (PAT).

## Goals

- **Simplify Rule Access**: Make it easy for developers to find and use high-quality rules for AI tools.
- **Facilitate Rule Sharing**: Provide a platform for the community to distribute and maintain rule sets.
- **Seamless Integration**: Integrate rule management smoothly into the VS Code workflow.
- **Maintainable Extension**: Build a robust and well-structured VS Code extension.

## Scope

### In Scope

- Browsing rule sets in configured GitHub repositories (public/private with PAT).
- Displaying rule file/directory structure in a VS Code TreeView.
- Selection mechanism for rules/directories.
- Downloading selected rules to the local workspace.
- Configuration of source repositories and GitHub PAT via VS Code settings.
- Basic error handling for API access and downloads.
- Local recursive selection logic in the UI.
- **Update Status Check**: Mechanism to check for updates to downloaded rules by comparing local and remote SHAs. Status indicated in the explorer view.
- **View Filtering**: Ability to filter the explorer view based on a configured list of included paths (`aidd.includePaths` setting).
- **Status Bar Indicator**: Displaying the status of update checks in the VS Code status bar.

### Out of Scope

- Direct editing or creation of rules within the extension.
- Advanced rule validation or linting features.
- Real-time collaboration features for rule editing.
- Integration with specific AI tools beyond providing the rules.
- Complex community management features (voting, detailed contributor profiles, etc.).
- Automated *application* of rule updates (Manual check is now in scope).
- Advanced diffing view for updates.

## Timeline (Initial Estimate - Subject to Revision)

- Core Setup & API Integration: 3 days
- UI Implementation (TreeView, Selection): 2 days
- Download & Configuration Functionality: 2 days
- Refinement: 2 days

## Stakeholders

- **Rule Consumers**: Developers using AI tools needing rules.
- **Rule Contributors**: Experts defining and sharing rules via GitHub.
- **Project Maintainer**: Responsible for extension development and maintenance.

## Success Criteria

- Extension successfully connects to configured repositories and displays rule structures.
- Users can select and download rules as expected.
- Configuration of repositories and PAT functions correctly.
- The extension is stable and performs reasonably well.
- Codebase is maintainable and follows good practices.
