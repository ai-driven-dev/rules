import * as vscode from "vscode";
import { ILogger } from "../../services/logger";
import { IStorageService } from "../../services/storage";
import { getWelcomeViewContent } from "./getStarted";

export class WelcomeView {
	public static readonly VIEW_ID = "aidd.welcomeView";

	constructor(
		private readonly webviewView: vscode.WebviewView,
		private readonly storageService: IStorageService,
		private readonly logger: ILogger,
	) {
		this.configureWebview();

		this.setWebviewContent();

		this.setupMessageHandling();
	}

	private configureWebview(): void {
		this.webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [],
		};
	}

	private setWebviewContent(): void {
		this.webviewView.webview.html = getWelcomeViewContent();
	}

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

	private sendRecentRepositories(): void {
		const repositories = this.storageService.getRecentRepositories();

		this.webviewView.webview.postMessage({
			type: "recentRepositories",
			repositories,
		});
	}

	private openDocumentation(): void {
		vscode.env.openExternal(
			vscode.Uri.parse("https://github.com/ai-driven-dev/rules"),
		);
	}

	private openRepository(repository: {
		owner: string;
		name: string;
		branch?: string;
	}): void {
		try {
			vscode.commands.executeCommand("aidd.setRepository").then(() => {});
		} catch (error) {
			this.logger.error("Error opening repository", error);
		}
	}
}
