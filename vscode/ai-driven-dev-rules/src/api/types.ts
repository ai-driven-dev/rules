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


export interface GithubRepository {
  owner: string;
  name: string;
  branch?: string;
}


export interface GithubApiError {
  message: string;
  documentation_url?: string;
  status?: number;
}


export interface GithubRateLimit {
  limit: number;
  remaining: number;
  reset: number;
}


export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: Error | GithubApiError };
