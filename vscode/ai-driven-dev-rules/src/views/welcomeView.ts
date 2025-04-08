import * as vscode from "vscode";

/**
 * Welcome View for GitHub Explorer
 * Displays a welcome message with instructions and action buttons
 */
export class WelcomeView {
  public static readonly ID = "githubExplorer.welcomeView";
  public static readonly LABEL = "Get Started";

  private readonly _view: vscode.WebviewView;

  constructor(
    private readonly _context: vscode.ExtensionContext,
    webviewView: vscode.WebviewView
  ) {
    this._view = webviewView;
    this._view.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(_context.extensionUri, "resources"),
      ],
    };

    this._view.webview.html = this._getWebviewContent();

    // Handle messages from the webview
    this._view.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "setRepository":
          vscode.commands.executeCommand("githubExplorer.setRepository");
          break;
        case "showDocumentation":
          vscode.env.openExternal(
            vscode.Uri.parse("https://github.com/ai-driven-dev/rules")
          );
          break;
      }
    });
  }

  /**
   * Generate the HTML content for the welcome view
   */
  private _getWebviewContent(): string {
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
                }
                h1 {
                    font-size: 1.5em;
                    margin-bottom: 1em;
                    font-weight: 600;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 10px;
                }
                .description {
                    margin-bottom: 20px;
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
                }
                .action-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .section {
                    margin-bottom: 30px;
                }
                .info-item {
                    display: flex;
                    align-items: flex-start;
                    margin-bottom: 15px;
                }
                .info-item span {
                    margin-right: 10px;
                }
                a {
                    color: var(--vscode-textLink-foreground);
                    text-decoration: none;
                }
                a:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <h1>Welcome to GitHub Explorer</h1>
            
            <div class="section">
                <div class="description">
                    Browse and download files from GitHub repositories directly within VS Code.
                </div>
                
                <div class="action-container">
                    <button class="action-button" onclick="setRepository()">Set Repository</button>
                    <button class="action-button" onclick="showDocumentation()">View Documentation</button>
                </div>
            </div>
            
            <div class="section">
                <h2>Getting Started</h2>
                <div class="info-item">
                    <span>1.</span> 
                    <div>Click on <strong>Set Repository</strong> to connect to a GitHub repository</div>
                </div>
                <div class="info-item">
                    <span>2.</span> 
                    <div>Browse through the repository file structure</div>
                </div>
                <div class="info-item">
                    <span>3.</span> 
                    <div>Select files you want to download by using the checkbox</div>
                </div>
                <div class="info-item">
                    <span>4.</span> 
                    <div>Click the download button to save files to your local workspace</div>
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
            </script>
        </body>
        </html>`;
  }
}
