import * as vscode from "vscode";
import { WelcomeView } from "./welcomeView";

/**
 * Provider for the Welcome WebView
 */
export class WelcomeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = WelcomeView.ID;

  constructor(private readonly _context: vscode.ExtensionContext) {}

  /**
   * Called when a view is first instantiated
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    // Create the welcome view
    new WelcomeView(this._context, webviewView);
  }
}
