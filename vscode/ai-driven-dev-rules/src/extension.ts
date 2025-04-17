import * as vscode from "vscode";
import { GitHubApiService, type IGitHubApiService } from "./api/github";
import { registerCommands } from "./commands";
import { DownloadService } from "./services/download";
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
import { SelectionService } from "./services/selection";
import { type IStorageService, StorageService } from "./services/storage";
import { ExplorerView } from "./views/explorer/explorerView";
import { WelcomeView } from "./views/welcome/welcomeView";

export function activate(context: vscode.ExtensionContext): void {
  const logger: ILogger = new Logger("GitHub Explorer", true);
  logger.info("GitHub Explorer extension is now active");

  const storageService: IStorageService = new StorageService(context);
  const settings = storageService.getSettings();

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
  // Inject githubService into DownloadService constructor
  const downloadService = new DownloadService(logger, settings, githubService);

  // Inject explorerStateService into SelectionService constructor
  const selectionService = new SelectionService(logger, explorerStateService);

  const explorerView = new ExplorerView(
    context,
    githubService,
    logger,
    storageService,
    downloadService,
    selectionService,
    explorerStateService,
  );

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
    downloadService,
  });

  if (settings.showWelcomeOnStartup) {
    vscode.commands.executeCommand("aidd.welcomeView.focus");
  }

  setupAutoRefresh(context, settings, logger);
}

function setupAutoRefresh(
  context: vscode.ExtensionContext,
  settings: { autoRefreshInterval?: number },
  logger: ILogger,
): void {
  if (!settings.autoRefreshInterval) {
    return;
  }

  const intervalMs = settings.autoRefreshInterval * 1000;
  const interval = setInterval(() => {
    logger.debug(
      `Auto-refreshing repository (interval: ${settings.autoRefreshInterval}s)`,
    );

    vscode.commands.executeCommand("aidd.refresh");
  }, intervalMs);

  context.subscriptions.push({
    dispose: () => clearInterval(interval),
  });
}

export function deactivate(): void {}
