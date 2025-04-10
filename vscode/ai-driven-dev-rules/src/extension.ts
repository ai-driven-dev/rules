import * as vscode from 'vscode';
import { GitHubApiService } from "./api/github";
import { registerCommands } from "./commands";
import { DownloadService } from "./services/download";
import { Logger } from "./services/logger";
import { StorageService } from "./services/storage";
import { ExplorerView } from "./views/explorer/explorerView";
import { WelcomeView } from "./views/welcome/welcomeView";

/**
 * Activate the extension
 * @param context Extension context
 */
export function activate(context: vscode.ExtensionContext): void {
  // Initialize services
  const logger = new Logger("GitHub Explorer", true);
  logger.info("GitHub Explorer extension is now active");

  const storageService = new StorageService(context);
  const settings = storageService.getSettings();

  const githubService = new GitHubApiService();
  const downloadService = new DownloadService(logger, settings);

  // Initialize explorer view
  const explorerView = new ExplorerView(
    context,
    githubService,
    logger,
    storageService,
    downloadService
  );

  // Register welcome view provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(WelcomeView.VIEW_ID, {
      resolveWebviewView(webviewView) {
        new WelcomeView(webviewView, storageService, logger);
      },
    })
  );

  // Register commands
  registerCommands(
    context,
    explorerView,
    githubService,
    logger,
    storageService,
    downloadService
  );

  // Show welcome view on first launch
  if (settings.showWelcomeOnStartup) {
    vscode.commands.executeCommand("aidd.welcomeView.focus");
  }

  // Setup auto-refresh if enabled
  setupAutoRefresh(context, settings, explorerView, logger);
}

/**
 * Setup auto-refresh timer
 * @param context Extension context
 * @param settings Extension settings
 * @param explorerView Explorer view to refresh
 * @param logger Logger for logging
 */
function setupAutoRefresh(
  context: vscode.ExtensionContext,
  settings: { autoRefreshInterval?: number },
  explorerView: ExplorerView,
  logger: Logger
): void {
  if (!settings.autoRefreshInterval) {
    return;
  }

  const intervalMs = settings.autoRefreshInterval * 1000;
  const interval = setInterval(() => {
    logger.debug(
      `Auto-refreshing repository (interval: ${settings.autoRefreshInterval}s)`
    );
    vscode.commands.executeCommand("aidd.refresh");
  }, intervalMs);

  // Clean up interval on deactivation
  context.subscriptions.push({
    dispose: () => clearInterval(interval),
  });
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
  // All cleanup is handled by the disposables
}
