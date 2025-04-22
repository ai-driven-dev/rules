import * as vscode from "vscode";
import { GitHubApiService, type IGitHubApiService } from "./api/github";
import { registerCommands } from "./commands";
import { DownloadService, type IDownloadService } from "./services/download"; // Import IDownloadService
import {
  ExplorerStateService,
  type IExplorerStateService,
} from "./services/explorerStateService";
import { HttpClient, type IHttpClient } from "./services/httpClient";
import { type ILogger, Logger } from "./services/logger";
import {
  type IRateLimitManager,
  RateLimitManager,
} from "./services/rateLimitManager";
import { type ISelectionService, SelectionService } from "./services/selection";
import {
  type IStatusBarService,
  StatusBarService,
} from "./services/statusBarService";
import { type IStorageService, StorageService } from "./services/storage";
import {
  type IUpdateCheckService,
  UpdateCheckService,
} from "./services/updateCheckService";
import { ExplorerView } from "./views/explorer/explorerView";
// Removed import for UpdatesTreeProvider
import { WelcomeView } from "./views/welcome/welcomeView";

export function activate(context: vscode.ExtensionContext): void {
  const logger: ILogger = new Logger("AI-Driven Dev Rules", true);
  logger.info("AI-Driven Dev Rules extension is now active");

  const storageService: IStorageService = new StorageService(context);

  const config = vscode.workspace.getConfiguration("aidd");
  const showWelcomeOnStartup =
    config.get<boolean>("showWelcomeOnStartup") ?? true;
  const autoRefreshInterval = config.get<number | null>(
    "autoRefreshInterval",
    null,
  );

  const httpClient: IHttpClient = new HttpClient(logger);
  const rateLimitManager: IRateLimitManager = new RateLimitManager(logger);
  const explorerStateService: IExplorerStateService = new ExplorerStateService(
    logger,
  );

  const githubService: IGitHubApiService = new GitHubApiService(
    httpClient,
    rateLimitManager,
    logger,
  );

  // Instantiate DownloadService with context
  const downloadService: IDownloadService = new DownloadService(
    logger,
    httpClient,
    githubService,
    context, // Pass context
  );

  const selectionService: ISelectionService = new SelectionService(
    logger,
    explorerStateService,
  );

  // Instantiate UpdateCheckService
  const updateCheckService: IUpdateCheckService = new UpdateCheckService(
    logger,
    githubService,
    context,
  );

  // Instantiate StatusBarService
  const statusBarService: IStatusBarService = new StatusBarService(logger);
  context.subscriptions.push(statusBarService);

  // Removed instantiation of UpdatesTreeProvider

  const explorerView = new ExplorerView(
    context,
    githubService,
    logger,
    storageService,
    downloadService,
    selectionService,
    explorerStateService,
    updateCheckService,
    statusBarService,
  ); // Correctly removed updatesTreeProvider

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(WelcomeView.VIEW_ID, {
      resolveWebviewView(webviewView) {
        new WelcomeView(webviewView, storageService, logger);
      },
    }),
  );

  registerCommands({
    context,
    explorerView,
    githubService,
    logger,
    storageService,
    // updatesTreeProvider is no longer needed here
  });

  // Initial setup: Link repository changes from ExplorerView to UpdatesTreeProvider
  // This requires ExplorerView to expose an event or have a method called by registerCommands
  // Let's modify registerCommands to handle this linkage.

  if (showWelcomeOnStartup) {
    vscode.commands.executeCommand("aidd.welcomeView.focus");
  }

  setupAutoRefresh(context, autoRefreshInterval, logger);

  // Listen for configuration changes to refresh the view if includePaths changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("aidd.includePaths")) {
        logger.info(
          "Configuration 'aidd.includePaths' changed. Refreshing explorer view.",
        );
        // Refresh the main explorer view to apply the new filter
        explorerView.refreshView();
        // Optionally, refresh the updates view too, although filtering isn't applied there
        // updatesTreeProvider.refresh();
      }
    }),
  );
}

function setupAutoRefresh(
  context: vscode.ExtensionContext,
  autoRefreshInterval: number | null,
  logger: ILogger,
): void {
  if (typeof autoRefreshInterval !== "number" || autoRefreshInterval < 10) {
    return;
  }

  const intervalMs = autoRefreshInterval * 1000;
  const interval = setInterval(() => {
    logger.debug(
      `Auto-refreshing repository (interval: ${autoRefreshInterval}s)`,
    );

    vscode.commands.executeCommand("aidd.refresh");
  }, intervalMs);

  context.subscriptions.push({
    dispose: () => clearInterval(interval),
  });
}

export function deactivate(): void {}
