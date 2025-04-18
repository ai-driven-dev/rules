import * as pathUtils from "node:path";
import * as vscode from "vscode";
import type { HttpResponse, IHttpClient } from "../services/httpClient";
import type { ILogger } from "../services/logger";

import type { IRateLimitManager } from "../services/rateLimitManager";
import { GitHubApiResponseHandler } from "../utils/githubApiResponseHandler";
import type { GithubContent, GithubRepository, Result } from "./types";

interface GithubBranchResponse {
  name: string;
  commit: {
    sha: string;
    commit: {
      tree: {
        sha: string;
      };
    };
  };
}

interface GitTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
  url?: string;
}

interface GitTreeResponse {
  sha: string;
  url: string;
  tree: GitTreeItem[];
  truncated: boolean;
}

export interface IGitHubApiService {
  fetchRepositoryContent(
    repository: GithubRepository,
    path?: string,
  ): Promise<Result<GithubContent[]>>;
  fetchRepositoryContentRecursive(
    repository: GithubRepository,

    _path?: string,
    _maxDepth?: number,
  ): Promise<Result<GithubContent[]>>;
  fetchFileContent(downloadUrl: string): Promise<Result<string>>;
}

function mapGitTypeToContentType(
  gitType: "blob" | "tree" | "commit",
): GithubContent["type"] {
  switch (gitType) {
    case "blob":
      return "file";
    case "tree":
      return "dir";
    case "commit":
      return "submodule";
    default:
      return "file";
  }
}

export class GitHubApiService implements IGitHubApiService {
  private readonly responseHandler: GitHubApiResponseHandler;
  private readonly baseApiUrl = "https://api.github.com";

  constructor(
    private readonly httpClient: IHttpClient,
    private readonly rateLimitManager: IRateLimitManager,
    private readonly logger: ILogger,
  ) {
    this.responseHandler = new GitHubApiResponseHandler(
      this.rateLimitManager,
      this.logger,
    );
  }

  private async makeApiRequest<T>(
    apiUrl: string,
    isRawContent = false,
  ): Promise<Result<T>> {
    const headers: Record<string, string> = {
      "User-Agent": "VS-Code-AIDD-Extension",
      Accept: isRawContent
        ? "application/vnd.github.raw"
        : "application/vnd.github.v3+json",
    };

    const configuration = vscode.workspace.getConfiguration("aidd");
    const token = configuration.get<string>("githubToken");
    if (token) {
      headers.Authorization = `token ${token}`;
      this.logger.debug(`GitHub API Request (Auth): ${apiUrl}`);
    } else {
      this.logger.debug(`GitHub API Request (No Auth): ${apiUrl}`);
    }

    try {
      const httpResponse: HttpResponse = await this.httpClient.get(
        apiUrl,
        headers,
      );
      return this.responseHandler.handleResponse<T>(httpResponse, isRawContent);
    } catch (error) {
      this.logger.error(`HTTP Client error for ${apiUrl}`, error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error(`HTTP request failed: ${String(error)}`),
      };
    }
  }

  public async fetchRepositoryContent(
    repository: GithubRepository,
    path = "",
  ): Promise<Result<GithubContent[]>> {
    const { owner, name, branch } = repository;
    let apiUrl = `${this.baseApiUrl}/repos/${owner}/${name}/contents/${path}`;
    if (branch) {
      apiUrl += `?ref=${branch}`;
    }

    const result = await this.makeApiRequest<GithubContent | GithubContent[]>(
      apiUrl,
    );

    if (!result.success) {
      return result;
    }

    const data = Array.isArray(result.data) ? result.data : [result.data];
    return { success: true, data };
  }

  public async fetchRepositoryContentRecursive(
    repository: GithubRepository,
    _path = "",
    _maxDepth: number = Number.POSITIVE_INFINITY,
  ): Promise<Result<GithubContent[]>> {
    const { owner, name, branch = "main" } = repository;
    this.logger.info(
      `Fetching recursive tree for ${owner}/${name}, branch: ${branch}`,
    );

    const branchApiUrl = `${this.baseApiUrl}/repos/${owner}/${name}/branches/${branch || "main"}`;
    const branchResult =
      await this.makeApiRequest<GithubBranchResponse>(branchApiUrl);

    if (!branchResult.success) {
      this.logger.error(
        `Failed to fetch branch details for ${branch}`,
        branchResult.error,
      );
      return {
        success: false,
        error: new Error(
          `Failed to get branch details: ${branchResult.error.message}`,
        ),
      };
    }

    const treeSha = branchResult.data.commit?.commit?.tree?.sha;
    if (!treeSha) {
      this.logger.error(
        `Could not find tree SHA for branch ${branch}`,
        branchResult.data,
      );
      return {
        success: false,
        error: new Error("Could not find root tree SHA for the branch."),
      };
    }
    this.logger.debug(`Found root tree SHA: ${treeSha} for branch ${branch}`);

    const treeApiUrl = `${this.baseApiUrl}/repos/${owner}/${name}/git/trees/${treeSha}?recursive=1`;
    const treeResult = await this.makeApiRequest<GitTreeResponse>(treeApiUrl);

    if (!treeResult.success) {
      this.logger.error(
        `Failed to fetch recursive tree ${treeSha}`,
        treeResult.error,
      );
      return {
        success: false,
        error: new Error(
          `Failed to get recursive tree: ${treeResult.error.message}`,
        ),
      };
    }

    const { tree, truncated } = treeResult.data;

    if (truncated) {
      this.logger.warn(
        `GitHub API response for recursive tree was truncated for ${owner}/${name}. Results may be incomplete.`,
      );
    }

    const allContents: GithubContent[] = tree.map(
      (item: GitTreeItem): GithubContent => {
        const contentType = mapGitTypeToContentType(item.type);
        const itemName = pathUtils.basename(item.path);

        const itemHtmlUrl = `https://github.com/${owner}/${name}/${
          contentType === "file" ? "blob" : "tree"
        }/${branch}/${item.path}`;

        return {
          name: itemName,
          path: item.path,
          sha: item.sha,
          size: item.size ?? 0,
          url: `${this.baseApiUrl}/repos/${owner}/${name}/contents/${item.path}?ref=${branch}`,
          html_url: itemHtmlUrl,
          git_url: item.url ?? "",
          download_url:
            contentType === "file"
              ? `${this.baseApiUrl}/repos/${owner}/${name}/contents/${item.path}?ref=${branch}`
              : null,
          type: contentType,
        };
      },
    );

    this.logger.info(
      `Recursive tree fetch complete for ${owner}/${name}. Found ${allContents.length} items. Truncated: ${truncated}`,
    );
    return { success: true, data: allContents };
  }

  public async fetchFileContent(downloadUrl: string): Promise<Result<string>> {
    return this.makeApiRequest<string>(downloadUrl, true);
  }
}
