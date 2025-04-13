import * as http from "http";
import * as https from "https";
import { URL } from "url";
import * as vscode from "vscode";
import {
  GithubApiError,
  GithubContent,
  GithubRateLimit,
  GithubRepository,
  Result,
} from "./types";


export interface IGitHubApiService {
  parseRepositoryUrl(url: string): GithubRepository | null;
  fetchRepositoryContent(
    repository: GithubRepository,
    path?: string
  ): Promise<Result<GithubContent[]>>;
  fetchRepositoryContentRecursive(
    repository: GithubRepository,
    path: string,
    maxDepth: number
  ): Promise<Result<GithubContent[]>>;
  fetchFileContent(downloadUrl: string): Promise<Result<string>>;
  getRateLimit(): GithubRateLimit | null;
}


export class GitHubApiService implements IGitHubApiService {

  constructor(
    private readonly outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel(
      "GitHub Explorer"
    )
  ) {}

  private rateLimit: GithubRateLimit | null = null;


  public parseRepositoryUrl(url: string): GithubRepository | null {
    try {


      let cleanUrl = url.replace(/^(https?:\/\/)?(www\.)?/i, "");


      if (!cleanUrl.startsWith("github.com/")) {
        return null;
      }


      cleanUrl = cleanUrl.substring("github.com/".length);


      const parts = cleanUrl.split("/");

      if (parts.length < 2) {
        return null;
      }

      const owner = parts[0];
      const name = parts[1];


      let branch: string | undefined;
      if (parts.length > 3 && parts[2] === "tree") {
        branch = parts[3];
      }

      return { owner, name, branch };
    } catch (error) {
      this.logError("Error parsing repository URL", error);
      return null;
    }
  }


  public async fetchRepositoryContent(
    repository: GithubRepository,
    path: string = ""
  ): Promise<Result<GithubContent[]>> {
    const { owner, name, branch } = repository;
    let apiUrl = `https://api.github.com/repos/${owner}/${name}/contents/${path}`;


    if (branch) {
      apiUrl += `?ref=${branch}`;
    }

    try {
      const response = await this.makeRequest<GithubContent | GithubContent[]>(
        apiUrl
      );

      if (!response.success) {
        return response;
      }


      const data = Array.isArray(response.data)
        ? response.data
        : [response.data];
      return { success: true, data };
    } catch (error) {
      this.logError(`Error fetching repository content for ${path}`, error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }


  public async fetchRepositoryContentRecursive(
    repository: GithubRepository,
    path: string = "",
    maxDepth: number
  ): Promise<Result<GithubContent[]>> {
    const allContents: GithubContent[] = [];
    const visitedPaths = new Set<string>(); // To avoid potential infinite loops with symlinks, though less common via API

    const fetchLevel = async (
      currentPath: string,
      currentDepth: number
    ): Promise<Result<void>> => {
      if (currentDepth > maxDepth || visitedPaths.has(currentPath)) {
        return { success: true, data: undefined }; // Stop recursion
      }
      visitedPaths.add(currentPath);

      this.log(
        `Fetching recursive: Path='${currentPath}', Depth=${currentDepth}/${maxDepth}`
      );
      const result = await this.fetchRepositoryContent(repository, currentPath);

      if (!result.success) {

        this.logError(
          `Recursive fetch failed at path '${currentPath}', depth ${currentDepth}`,
          result.error
        );
        return { success: false, error: result.error };
      }

      const contents = result.data;
      allContents.push(...contents); // Add contents of the current level


      const subDirPromises: Promise<Result<void>>[] = [];
      for (const item of contents) {
        if (item.type === "dir") {
          subDirPromises.push(fetchLevel(item.path, currentDepth + 1));
        }
      }


      const subDirResults = await Promise.all(subDirPromises);


      const firstError = subDirResults.find((res) => !res.success);
      if (firstError) {
        return { success: false, error: firstError.error }; // Propagate the first error found
      }

      return { success: true, data: undefined };
    };


    const finalResult = await fetchLevel(path, 1); // Start at depth 1

    if (!finalResult.success) {

      return { success: false, error: finalResult.error };
    }


    this.log(
      `Recursive fetch complete for path '${path}' up to depth ${maxDepth}. Found ${allContents.length} items.`
    );
    return { success: true, data: allContents };
  }


  public async fetchFileContent(downloadUrl: string): Promise<Result<string>> {
    try {
      return await this.makeRequest<string>(downloadUrl, true);
    } catch (error) {
      this.logError(`Error fetching file content from ${downloadUrl}`, error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }


  private makeRequest<T>(
    url: string,
    isRawContent: boolean = false
  ): Promise<Result<T>> {
    return new Promise((resolve) => {
      const parsedUrl = new URL(url);


      const configuration = vscode.workspace.getConfiguration("aidd");
      const token = configuration.get<string>("githubToken");

      const options: https.RequestOptions = { // Explicitly type options
        headers: {
          "User-Agent": "VS-Code-AIDD-Extension", // Keep User-Agent
          Accept: isRawContent
            ? "application/vnd.github.raw"
            : "application/vnd.github.v3+json",

          ...(token ? { Authorization: `token ${token}` } : {}),
        },
      };

      if (token) {
        this.log(`Making authenticated request to: ${url}`);
      } else {
        this.log(`Making unauthenticated request to: ${url}`);
      }

      https
        .get(parsedUrl, options, (res) => {
          let data = "";


          this.updateRateLimitInfo(res);

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            try {
              if (res.statusCode === 200) {
                if (isRawContent) {
                  resolve({ success: true, data: data as unknown as T });
                } else {
                  const parsedData = JSON.parse(data);
                  resolve({ success: true, data: parsedData });
                }
              } else if (
                res.statusCode === 403 &&
                this.isRateLimitExceeded(res)
              ) {
                const resetTime = new Date(
                  this.rateLimit?.reset ? this.rateLimit.reset * 1000 : 0
                );
                resolve({
                  success: false,
                  error: new Error(
                    `GitHub API rate limit exceeded. Reset at ${resetTime.toLocaleTimeString()}`
                  ),
                });
              } else {
                try {
                  const errorData = JSON.parse(data) as GithubApiError;
                  errorData.status = res.statusCode || 500;
                  resolve({ success: false, error: errorData });
                } catch (e) {
                  resolve({
                    success: false,
                    error: new Error(
                      `GitHub API responded with status code ${res.statusCode}: ${data}`
                    ),
                  });
                }
              }
            } catch (error) {
              resolve({
                success: false,
                error:
                  error instanceof Error ? error : new Error(String(error)),
              });
            }
          });
        })
        .on("error", (error) => {
          resolve({
            success: false,
            error,
          });
        });
    });
  }


  private updateRateLimitInfo(res: http.IncomingMessage): void {
    const limit = res.headers["x-ratelimit-limit"];
    const remaining = res.headers["x-ratelimit-remaining"];
    const reset = res.headers["x-ratelimit-reset"];

    if (limit && remaining && reset) {
      this.rateLimit = {
        limit: parseInt(Array.isArray(limit) ? limit[0] : limit, 10),
        remaining: parseInt(
          Array.isArray(remaining) ? remaining[0] : remaining,
          10
        ),
        reset: parseInt(Array.isArray(reset) ? reset[0] : reset, 10),
      };

      this.log(
        `Rate limit: ${this.rateLimit.remaining}/${
          this.rateLimit.limit
        }, reset at ${new Date(
          this.rateLimit.reset * 1000
        ).toLocaleTimeString()}`
      );
    }
  }


  private isRateLimitExceeded(res: http.IncomingMessage): boolean {
    return res.headers["x-ratelimit-remaining"] === "0";
  }


  public getRateLimit(): GithubRateLimit | null {
    return this.rateLimit;
  }


  private log(message: string): void {
    this.outputChannel.appendLine(
      `[${new Date().toLocaleTimeString()}] ${message}`
    );
  }


  private logError(message: string, error: unknown): void {
    this.outputChannel.appendLine(
      `[${new Date().toLocaleTimeString()}] ERROR: ${message}`
    );
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
