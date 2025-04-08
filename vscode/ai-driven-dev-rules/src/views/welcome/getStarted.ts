/**
 * Get HTML content for the welcome view
 * @returns HTML content
 */
export function getWelcomeViewContent(): string {
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>GitHub Explorer</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    padding: 20px;
                    line-height: 1.5;
                    font-size: var(--vscode-font-size);
                }
                h1 {
                    font-size: 1.5em;
                    margin-bottom: 1em;
                    font-weight: 600;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 10px;
                    color: var(--vscode-editor-foreground);
                }
                h2 {
                    font-size: 1.2em;
                    margin-top: 1.5em;
                    margin-bottom: 0.5em;
                    font-weight: 600;
                    color: var(--vscode-editor-foreground);
                }
                .description {
                    margin-bottom: 20px;
                    color: var(--vscode-descriptionForeground);
                }
                .action-container {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-top: 20px;
                }
                .action-button {
                    display: flex;
                    padding: 8px 12px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    text-align: center;
                    justify-content: center;
                    align-items: center;
                }
                .action-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .secondary-button {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                .secondary-button:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                .section {
                    margin-bottom: 30px;
                }
                .info-item {
                    display: flex;
                    align-items: flex-start;
                    margin-bottom: 15px;
                }
                .info-item .number {
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    margin-right: 10px;
                    flex-shrink: 0;
                }
                .info-item .content {
                    flex: 1;
                }
                a {
                    color: var(--vscode-textLink-foreground);
                    text-decoration: none;
                }
                a:hover {
                    text-decoration: underline;
                    color: var(--vscode-textLink-activeForeground);
                }
                .icon {
                    margin-right: 6px;
                }
                .recent-repos {
                    margin-top: 20px;
                    border-top: 1px solid var(--vscode-panel-border);
                    padding-top: 10px;
                }
                .recent-repos-list {
                    margin-top: 10px;
                }
                .recent-repo-item {
                    display: flex;
                    align-items: center;
                    padding: 5px 0;
                    cursor: pointer;
                    border-radius: 3px;
                    padding-left: 3px;
                }
                .recent-repo-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .recent-repo-item .icon {
                    color: var(--vscode-icon-foreground);
                }
            </style>
        </head>
        <body>
            <h1>GitHub Explorer</h1>
            
            <div class="section">
                <div class="description">
                    Browse and download files from GitHub repositories directly within VS Code.
                </div>
                
                <div class="action-container">
                    <button class="action-button" onclick="setRepository()">
                        <span class="icon">$(repo)</span>Connect to Repository
                    </button>
                    <button class="action-button secondary-button" onclick="showDocumentation()">
                        <span class="icon">$(book)</span>View Documentation
                    </button>
                </div>
            </div>
            
            <div class="section">
                <h2>Getting Started</h2>
                <div class="info-item">
                    <div class="number">1</div>
                    <div class="content">Click on <strong>Connect to Repository</strong> to connect to a GitHub repository</div>
                </div>
                <div class="info-item">
                    <div class="number">2</div>
                    <div class="content">Browse through the repository file structure</div>
                </div>
                <div class="info-item">
                    <div class="number">3</div>
                    <div class="content">Select files you want to download by using the checkbox</div>
                </div>
                <div class="info-item">
                    <div class="number">4</div>
                    <div class="content">Click the download button in the view title to save files to your local workspace</div>
                </div>
            </div>
            
            <div class="recent-repos" id="recentRepos" style="display: none;">
                <h2>Recent Repositories</h2>
                <div class="recent-repos-list" id="recentReposList">
                    <!-- Recent repositories will be inserted here -->
                </div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function setRepository() {
                    vscode.postMessage({
                        command: 'setRepository'
                    });
                }
                
                function showDocumentation() {
                    vscode.postMessage({
                        command: 'showDocumentation'
                    });
                }
                
                function openRepository(owner, name, branch) {
                    vscode.postMessage({
                        command: 'openRepository',
                        repository: { owner, name, branch }
                    });
                }
                
                // Listen for messages from the extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    if (message.type === 'recentRepositories') {
                        updateRecentRepos(message.repositories);
                    }
                });
                
                function updateRecentRepos(repositories) {
                    const reposList = document.getElementById('recentReposList');
                    const reposSection = document.getElementById('recentRepos');
                    
                    if (!repositories || repositories.length === 0) {
                        reposSection.style.display = 'none';
                        return;
                    }
                    
                    reposSection.style.display = 'block';
                    reposList.innerHTML = '';
                    
                    repositories.forEach(repo => {
                        const item = document.createElement('div');
                        item.className = 'recent-repo-item';
                        item.innerHTML = \`
                            <span class="icon">$(github)</span>
                            <span>\${repo.owner}/\${repo.name}\${repo.branch ? \` (\${repo.branch})\` : ''}</span>
                        \`;
                        item.addEventListener('click', () => {
                            openRepository(repo.owner, repo.name, repo.branch);
                        });
                        reposList.appendChild(item);
                    });
                }
                
                // Tell the extension we're ready to receive data
                vscode.postMessage({ command: 'ready' });
            </script>
        </body>
        </html>`;
} 
