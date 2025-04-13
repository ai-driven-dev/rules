import * as vscode from "vscode";
import { GitHubApiService, IGitHubApiService } from "./api/github";
import { registerCommands } from "./commands";
import { DownloadService } from "./services/download";
import {
	ExplorerStateService,
	IExplorerStateService,
} from "./services/explorerStateService";
import { HttpClient, IHttpClient } from "./services/httpClient";
import { ILogger, Logger } from "./services/logger";
import {
	IRateLimitManager,
	RateLimitManager,
} from "./services/rateLimitManager";
import { SelectionService } from "./services/selection";
import { IStorageService, StorageService } from "./services/storage";
import { ExplorerView } from "./views/explorer/explorerView";
import { ExplorerTreeProvider } from "./views/explorer/treeProvider";
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
	const downloadService = new DownloadService(logger, settings);

	// Inject explorerStateService into SelectionService constructor
	const selectionService = new SelectionService(logger, explorerStateService);

	const treeProvider = new ExplorerTreeProvider(
		githubService,
		logger,
		selectionService,
		explorerStateService,
		context.extensionPath,
	);

	// Removed selectionService.setTreeProvider(treeProvider);

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

	setupAutoRefresh(context, settings, explorerView, logger);
}

function setupAutoRefresh(
	context: vscode.ExtensionContext,
	settings: { autoRefreshInterval?: number },
	explorerView: ExplorerView,
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
