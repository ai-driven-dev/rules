/**
 * Types for GitHub API
 */

/**
 * GitHub repository content item
 */
export interface GithubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: "file" | "dir" | "symlink" | "submodule";
  content?: string;
  encoding?: string;
}

/**
 * GitHub repository information
 */
export interface GithubRepository {
  owner: string;
  name: string;
  branch?: string;
}

/**
 * GitHub API error
 */
export interface GithubApiError {
  message: string;
  documentation_url?: string;
  status?: number;
}

/**
 * GitHub API rate limit information
 */
export interface GithubRateLimit {
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Result type for API operations
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: Error | GithubApiError };
