import * as vscode from 'vscode';
import { GithubExplorer } from './views/githubExplorer';
import { WelcomeViewProvider } from "./views/welcomeViewProvider";

/**
 * Activate the extension
 * @param context Extension context
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("GitHub Explorer extension is now active!");

  // Initialize GitHub Explorer
  new GithubExplorer(context);

  // Register welcome view provider
  const welcomeViewProvider = new WelcomeViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      WelcomeViewProvider.viewType,
      welcomeViewProvider
    )
  );

  // Register welcome command
  const welcomeCommand = vscode.commands.registerCommand(
    "githubExplorer.welcome",
    () => {
      vscode.window.showInformationMessage(
        "Welcome to GitHub Explorer! Use the GitHub Explorer view to browse and download files from GitHub repositories."
      );
    }
  );

  context.subscriptions.push(welcomeCommand);
}

/**
 * Deactivate the extension
 */
export function deactivate() {
    // Clean up resources
}
