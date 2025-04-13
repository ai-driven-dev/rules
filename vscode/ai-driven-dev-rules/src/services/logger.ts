import * as vscode from "vscode";

export interface ILogger {
	log(message: string): void;
	error(message: string, error?: unknown): void;
	info(message: string): void;
	warn(message: string): void;
	debug(message: string): void;
	show(): void;
}

export class Logger implements ILogger {
	private outputChannel: vscode.OutputChannel;
	private debugMode: boolean;

	constructor(channelName: string, debugMode = false) {
		this.outputChannel = vscode.window.createOutputChannel(channelName);
		this.debugMode = debugMode;
	}

	private getTimestamp(): string {
		return `[${new Date().toLocaleTimeString()}]`;
	}

	public log(message: string): void {
		this.outputChannel.appendLine(`${this.getTimestamp()} ${message}`);
	}

	public error(message: string, error?: unknown): void {
		this.outputChannel.appendLine(`${this.getTimestamp()} ERROR: ${message}`);

		if (error) {
			if (error instanceof Error) {
				this.outputChannel.appendLine(`${error.message}`);
				if (error.stack) {
					this.outputChannel.appendLine(error.stack);
				}
			} else if (typeof error === "object" && error !== null) {
				this.outputChannel.appendLine(JSON.stringify(error, null, 2));
			} else {
				this.outputChannel.appendLine(String(error));
			}
		}
	}

	public info(message: string): void {
		this.outputChannel.appendLine(`${this.getTimestamp()} INFO: ${message}`);
	}

	public warn(message: string): void {
		this.outputChannel.appendLine(`${this.getTimestamp()} WARNING: ${message}`);
	}

	public debug(message: string): void {
		if (this.debugMode) {
			this.outputChannel.appendLine(`${this.getTimestamp()} DEBUG: ${message}`);
		}
	}

	public show(): void {
		this.outputChannel.show();
	}

	public dispose(): void {
		this.outputChannel.dispose();
	}
}
