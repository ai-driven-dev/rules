import type { GithubApiError, Result } from "../api/types";
import type { HttpResponse } from "../services/httpClient";
import type { ILogger } from "../services/logger";
import type { IRateLimitManager } from "../services/rateLimitManager";

export class GitHubApiResponseHandler {
  constructor(
    private readonly rateLimitManager: IRateLimitManager,
    private readonly logger: ILogger,
  ) {}

  public handleResponse<T>(
    response: HttpResponse,
    isRawContent = false,
  ): Result<T> {
    this.rateLimitManager.updateFromHeaders(response.headers);

    if (response.statusCode === 200) {
      try {
        if (isRawContent) {
          if (typeof response.body === "string") {
            return { success: true, data: response.body as unknown as T };
          }
          this.logger.error("Raw content response body is not a string.");
          return {
            success: false,
            error: new Error("Invalid raw content response format"),
          };
        }
        const parsedData = JSON.parse(response.body);
        return { success: true, data: parsedData as T };
      } catch (error) {
        this.logger.error("Failed to parse GitHub API response JSON", error);
        return {
          success: false,
          error: new Error(
            `Failed to parse response JSON: ${error instanceof Error ? error.message : String(error)}`,
          ),
        };
      }
    } else if (
      response.statusCode === 403 &&
      this.rateLimitManager.isLimitExceeded()
    ) {
      const resetTime = this.rateLimitManager.getResetTime();
      const errorMessage = `GitHub API rate limit exceeded.${resetTime ? ` Reset at ${resetTime.toLocaleTimeString()}` : ""}`;
      this.logger.warn(errorMessage);
      return { success: false, error: new Error(errorMessage) };
    } else {
      let errorData: GithubApiError = {
        message: `GitHub API Error: ${response.statusCode}`,
      };
      try {
        const parsedError = JSON.parse(response.body);
        if (parsedError && typeof parsedError.message === "string") {
          errorData = parsedError as GithubApiError;
        }
      } catch (e) {
        this.logger.debug(
          `Could not parse error response body: ${e instanceof Error ? e.message : String(e)}`,
        );
        errorData.message = `${errorData.message} - ${response.body}`;
      }
      errorData.status = response.statusCode;
      this.logger.error(
        `GitHub API Error: ${errorData.status} - ${errorData.message}`,
      );
      return { success: false, error: errorData };
    }
  }
}
