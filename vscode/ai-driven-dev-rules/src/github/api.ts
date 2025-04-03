import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import * as vscode from 'vscode';
import { GithubContent, GithubRepository, GithubApiError, GithubRateLimit } from './types';

/**
 * Service for interacting with GitHub API
 */
export class GitHubApiService {
    private static instance: GitHubApiService;
    private outputChannel: vscode.OutputChannel;
    private rateLimit: GithubRateLimit | null = null;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('GitHub Explorer');
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): GitHubApiService {
        if (!GitHubApiService.instance) {
            GitHubApiService.instance = new GitHubApiService();
        }
        return GitHubApiService.instance;
    }

    /**
     * Parse GitHub repository URL
     * @param url GitHub repository URL
     * @returns Repository information
     */
    public parseRepositoryUrl(url: string): GithubRepository | null {
        try {
            // Handle different URL formats
            // https://github.com/owner/repo
            // https://github.com/owner/repo/tree/branch
            // github.com/owner/repo
            
            // Remove protocol if present
            let cleanUrl = url.replace(/^(https?:\/\/)?(www\.)?/i, '');
            
            // Check if it's a GitHub URL
            if (!cleanUrl.startsWith('github.com/')) {
                return null;
            }
            
            // Remove github.com/
            cleanUrl = cleanUrl.substring('github.com/'.length);
            
            // Split by /
            const parts = cleanUrl.split('/');
            
            if (parts.length < 2) {
                return null;
            }
            
            const owner = parts[0];
            const name = parts[1];
            
            // Check if branch is specified
            let branch: string | undefined;
            if (parts.length > 3 && parts[2] === 'tree') {
                branch = parts[3];
            }
            
            return { owner, name, branch };
        } catch (error) {
            this.logError('Error parsing repository URL', error);
            return null;
        }
    }

    /**
     * Fetch repository content
     * @param repository Repository information
     * @param path Path within repository
     * @returns Promise with content items
     */
    public async fetchRepositoryContent(
        repository: GithubRepository,
        path: string = ''
    ): Promise<GithubContent[]> {
        const { owner, name, branch } = repository;
        let apiUrl = `https://api.github.com/repos/${owner}/${name}/contents/${path}`;
        
        // Add branch parameter if specified
        if (branch) {
            apiUrl += `?ref=${branch}`;
        }
        
        try {
            const response = await this.makeRequest<GithubContent | GithubContent[]>(apiUrl);
            
            // Handle both single item and array responses
            return Array.isArray(response) ? response : [response];
        } catch (error) {
            this.logError(`Error fetching repository content for ${path}`, error);
            throw error;
        }
    }

    /**
     * Fetch file content
     * @param downloadUrl File download URL
     * @returns Promise with file content
     */
    public async fetchFileContent(downloadUrl: string): Promise<string> {
        try {
            return await this.makeRequest<string>(downloadUrl, true);
        } catch (error) {
            this.logError(`Error fetching file content from ${downloadUrl}`, error);
            throw error;
        }
    }

    /**
     * Make HTTP request to GitHub API
     * @param url API URL
     * @param isRawContent Whether to return raw content
     * @returns Promise with response data
     */
    private makeRequest<T>(url: string, isRawContent: boolean = false): Promise<T> {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            
            const options = {
                headers: {
                    'User-Agent': 'VS-Code-GitHub-Explorer-Extension',
                    'Accept': isRawContent ? 'application/vnd.github.raw' : 'application/vnd.github.v3+json'
                }
            };
            
            this.log(`Making request to: ${url}`);
            
            https.get(parsedUrl, options, (res) => {
                let data = '';
                
                // Check for rate limit headers
                this.updateRateLimitInfo(res);
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        if (res.statusCode === 200) {
                            if (isRawContent) {
                                resolve(data as unknown as T);
                            } else {
                                const parsedData = JSON.parse(data);
                                resolve(parsedData);
                            }
                        } else if (res.statusCode === 403 && this.isRateLimitExceeded(res)) {
                            const resetTime = new Date(this.rateLimit?.reset ? this.rateLimit.reset * 1000 : 0);
                            reject(new Error(`GitHub API rate limit exceeded. Reset at ${resetTime.toLocaleTimeString()}`));
                        } else {
                            try {
                                const errorData = JSON.parse(data) as GithubApiError;
                                errorData.status = res.statusCode || 500;
                                reject(errorData);
                            } catch (e) {
                                reject(new Error(`GitHub API responded with status code ${res.statusCode}: ${data}`));
                            }
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Update rate limit information from response headers
     * @param res HTTP response
     */
    private updateRateLimitInfo(res: http.IncomingMessage): void {
        const limit = res.headers['x-ratelimit-limit'];
        const remaining = res.headers['x-ratelimit-remaining'];
        const reset = res.headers['x-ratelimit-reset'];
        
        if (limit && remaining && reset) {
            this.rateLimit = {
                limit: parseInt(Array.isArray(limit) ? limit[0] : limit, 10),
                remaining: parseInt(Array.isArray(remaining) ? remaining[0] : remaining, 10),
                reset: parseInt(Array.isArray(reset) ? reset[0] : reset, 10)
            };
            
            this.log(`Rate limit: ${this.rateLimit.remaining}/${this.rateLimit.limit}, reset at ${new Date(this.rateLimit.reset * 1000).toLocaleTimeString()}`);
        }
    }

    /**
     * Check if rate limit is exceeded
     * @param res HTTP response
     * @returns Whether rate limit is exceeded
     */
    private isRateLimitExceeded(res: http.IncomingMessage): boolean {
        return res.headers['x-ratelimit-remaining'] === '0';
    }

    /**
     * Get current rate limit information
     * @returns Rate limit information
     */
    public getRateLimit(): GithubRateLimit | null {
        return this.rateLimit;
    }

    /**
     * Log message to output channel
     * @param message Message to log
     */
    private log(message: string): void {
        this.outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ${message}`);
    }

    /**
     * Log error to output channel
     * @param message Error message
     * @param error Error object
     */
    private logError(message: string, error: any): void {
        this.outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ERROR: ${message}`);
        if (error instanceof Error) {
            this.outputChannel.appendLine(`${error.message}`);
            if (error.stack) {
                this.outputChannel.appendLine(error.stack);
            }
        } else if (typeof error === 'object') {
            this.outputChannel.appendLine(JSON.stringify(error, null, 2));
        } else {
            this.outputChannel.appendLine(String(error));
        }
    }
}
