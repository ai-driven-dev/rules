import * as vscode from "vscode";
import { ILogger } from "../../services/logger";
import { IStorageService } from "../../services/storage";
import { getWelcomeViewContent } from "./getStarted";

/**
 * Welcome view for GitHub Explorer
 * Displays a welcome message with instructions and action buttons
 */
export class WelcomeView {
  public static readonly VIEW_ID = "aidd.welcomeView";

  /**
   * Create a welcome view
   * @param webviewView WebView view to render content in
   * @param storageService Storage service to access recent repositories
   * @param logger Logger service
   */
  constructor(
    private readonly webviewView: vscode.WebviewView,
    private readonly storageService: IStorageService,
    private readonly logger: ILogger
  ) {
    // Configure webview
    this.configureWebview();

    // Set initial content
    this.setWebviewContent();

    // Handle messages from webview
    this.setupMessageHandling();
  }

  /**
   * Configure webview options
   */
  private configureWebview(): void {
    this.webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };
  }

  /**
   * Set webview content
   */
  private setWebviewContent(): void {
    this.webviewView.webview.html = getWelcomeViewContent();
  }

  /**
   * Setup message handling for webview
   */
  private setupMessageHandling(): void {
    this.webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "ready":
          this.sendRecentRepositories();
          break;

        case "setRepository":
          vscode.commands.executeCommand("aidd.setRepository");
          break;

        case "showDocumentation":
          this.openDocumentation();
          break;

        case "openRepository":
          if (message.repository) {
            this.openRepository(message.repository);
          }
          break;

        default:
          this.logger.warn(`Unknown command from webview: ${message.command}`);
      }
    });
  }

  /**
   * Send recent repositories to webview
   */
  private sendRecentRepositories(): void {
    const repositories = this.storageService.getRecentRepositories();

    this.webviewView.webview.postMessage({
      type: "recentRepositories",
      repositories,
    });
  }

  /**
   * Open documentation
   */
  private openDocumentation(): void {
    vscode.env.openExternal(
      vscode.Uri.parse("https://github.com/ai-driven-dev/rules")
    );
  }

  /**
   * Open a repository
   * @param repository Repository to open
   */
  private openRepository(repository: {
    owner: string;
    name: string;
    branch?: string;
  }): void {
    try {
      vscode.commands.executeCommand("aidd.setRepository").then(() => {
        // This will show the repository picker, and the user can select the repository
        // Another approach would be to have a command that accepts a repository parameter
      });
    } catch (error) {
      this.logger.error("Error opening repository", error);
    }
  }
}
