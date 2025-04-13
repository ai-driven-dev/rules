import * as vscode from 'vscode';
import { GitHubApiService } from "./api/github";
import { registerCommands } from "./commands";
import { DownloadService } from "./services/download";
import { Logger } from "./services/logger";
import { ISelectionService, SelectionService } from "./services/selection";
import { StorageService } from "./services/storage";
import { ExplorerView } from "./views/explorer/explorerView";
import { ExplorerTreeProvider } from "./views/explorer/treeProvider";
import { WelcomeView } from "./views/welcome/welcomeView";

export function activate(context: vscode.ExtensionContext): void {
  const logger = new Logger("GitHub Explorer", true);
  logger.info("GitHub Explorer extension is now active");

  const storageService = new StorageService(context);
  const settings = storageService.getSettings();

  const githubService = new GitHubApiService();
  const downloadService = new DownloadService(logger, settings);

  const dummySelectionService: ISelectionService = {
    onDidChangeSelection: new vscode.EventEmitter<void>().event,
    toggleSelection: () => {},
    toggleRecursiveSelection: async () => Promise.resolve(),
    isSelected: () => false,
    getSelectedItems: () => [],
    clearSelection: () => {},
    selectItems: () => {} // Add missing property
  };

  const treeProvider = new ExplorerTreeProvider(
    githubService,
    logger,
    context.extensionPath,
    dummySelectionService
  );

  const selectionService = new SelectionService(treeProvider, logger);

  const explorerView = new ExplorerView(
    context,
    githubService,
    logger,
    storageService,
    downloadService,
    selectionService
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(WelcomeView.VIEW_ID, {
      resolveWebviewView(webviewView) {
        new WelcomeView(webviewView, storageService, logger);
      },
    })
  );

  registerCommands(
    context,
    explorerView,
    githubService,
    logger,
    storageService,
    downloadService
  );

  if (settings.showWelcomeOnStartup) {
    vscode.commands.executeCommand("aidd.welcomeView.focus");
  }

  setupAutoRefresh(context, settings, explorerView, logger);
}

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

  context.subscriptions.push({
    dispose: () => clearInterval(interval),
  });
}

export function deactivate(): void {

}
