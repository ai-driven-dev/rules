# Product Context

## Purpose

This document explains why the "AI-Driven Dev Rules" project exists, the problems it solves, how it should work, and the user experience goals, focusing on its role as a community-driven rule-sharing platform.

## Problem Statement

AI development tools require clear, structured rules to operate effectively. Maintaining and distributing these rules across different projects and teams is challenging. Developers need a standardized way to access, share, and update high-quality rule sets curated by experts within specific domains (e.g., React, Python).

## Target Users

- **AI Tool Users**: Developers using AI-assisted coding tools who need reliable rule sets for specific languages/frameworks.
- **Rule Contributors/Experts**: Experienced developers (e.g., strong React developers) who want to define and share best-practice rules for their domain.
- **Development Teams**: Teams looking to standardize AI tool usage and rules across their projects.

## User Needs

- **Access to Curated Rules**: Ability to easily find and download validated rule sets for various technologies.
- **Community Contribution**: A platform for experts to propose, review, and maintain rule sets.
- **Seamless Integration**: Effortless application of downloaded rules within their development environment (VS Code).
- **Update Mechanism**: Notification and easy updating when rule sets are improved by the community.
- **Flexibility**: Support for rules stored in different GitHub repositories (public main repo, other public/private repos).
- **Security**: Ability to use Personal Access Tokens (PAT) for accessing rules in private repositories.

## User Experience Goals

- **Discoverability**: Easy browsing and searching for relevant rule sets.
- **Trust**: Confidence in the quality and validation process of the rules provided.
- **Simplicity**: Straightforward process for selecting and downloading rules.
- **Transparency**: Clear information about rule sources, contributors, and update history.
- **Efficiency**: Quick application and updating of rules within the VS Code workflow.

## Key Features (Current & Planned)

- **Rule Repository Browser**: Interface within VS Code to browse rule sets available in configured GitHub repositories.
- **Repository Configuration**: Ability to specify the main rule repository and add other public/private repositories (using PAT for private).
- **Rule Selection**: Interface to select specific rule files or directories to download.
- **Rule Download**: Mechanism to download selected rules into the user's current workspace, preserving structure and storing file SHAs.
- **Update Status Check**: Manual check (via button/status bar) comparing local SHAs with remote SHAs. Status (🔄 Updated, ✅ New) indicated directly on files in the explorer view.
- **View Filtering**: Option (`aidd.includePaths`) to filter the displayed rules based on specified paths/names.
- **(V2 / Future) Update Application**: Functionality to actually download and apply updates to previously downloaded rules.
- **(V2 / Future) Automated Update Check/Notification**: System to automatically check for updates and inform users.


## User Flows

1. **Discovering and Downloading Rules**:
    - User opens the AI-Driven Dev Rules view in VS Code.
    - User configures the source repository (or uses default). Adds PAT if needed for private repos.
    - Extension displays available rule sets/files from the repository.
    - User selects desired rules.
    - User initiates download.
    - Rules are downloaded into the user's workspace.

2. **Contributing Rules (Conceptual)**:
    - Expert developer creates/updates rules in a designated GitHub repository.
    - (Future) Potential review/validation process within the community/platform.

3. **Checking Rule Status (Current)**:
    - User clicks the "Check for Rule Updates" button (`$(sync)`) or the status bar item.
    - Extension fetches the remote repository tree and compares SHAs with locally stored SHAs (from previous downloads).
    - Files in the explorer view are prefixed with an emoji (🔄 for updated, ✅ for new) if their status changed. Tooltips provide details.
    - Status bar indicates the result of the check.

4. **Applying Updates (Future - V2)**:
    - User identifies rules with updates (via emoji/tooltip).
    - (Future) User triggers an "Update Rule" action (e.g., from context menu).
    - Extension re-downloads the specific rule, overwriting the local version and updating the stored SHA.

## Success Metrics

- **Rule Set Availability**: Growing number of high-quality rule sets for popular technologies.
- **Community Engagement**: Active contributions and reviews of rule sets (future metric).
- **Adoption**: Number of developers actively using the extension to manage rules.
- **Update Check Usage**: Frequency of manual update checks.
- **User Satisfaction**: Positive feedback regarding the ease of finding, applying rules, and checking for updates.

## Future Considerations

- Formalized rule validation and review process.
- Advanced search and filtering for rules.
- Versioning support for rule sets.
- Integration with specific AI development tools beyond generic rule provisioning.
