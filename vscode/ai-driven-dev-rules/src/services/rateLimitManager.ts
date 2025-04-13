import * as http from "http";
import { GithubRateLimit } from "../api/types";
import { ILogger } from "./logger";

export interface IRateLimitManager {
	updateFromHeaders(headers: http.IncomingHttpHeaders): void;
	isLimitExceeded(): boolean;
	getRateLimitInfo(): GithubRateLimit | null;
	getResetTime(): Date | null;
}

export class RateLimitManager implements IRateLimitManager {
	private currentRateLimit: GithubRateLimit | null = null;

	constructor(private readonly logger: ILogger) {}

	public updateFromHeaders(headers: http.IncomingHttpHeaders): void {
		const limit = headers["x-ratelimit-limit"];
		const remaining = headers["x-ratelimit-remaining"];
		const reset = headers["x-ratelimit-reset"];

		if (limit && remaining && reset) {
			const newLimit: GithubRateLimit = {
				limit: parseInt(Array.isArray(limit) ? limit[0] : limit, 10),
				remaining: parseInt(
					Array.isArray(remaining) ? remaining[0] : remaining,
					10,
				),
				reset: parseInt(Array.isArray(reset) ? reset[0] : reset, 10),
			};

			if (
				!this.currentRateLimit ||
				newLimit.remaining !== this.currentRateLimit.remaining ||
				newLimit.reset !== this.currentRateLimit.reset
			) {
				this.currentRateLimit = newLimit;
				this.logger.debug(
					`Rate limit updated: ${this.currentRateLimit.remaining}/${
						this.currentRateLimit.limit
					}, reset at ${this.getResetTime()?.toLocaleTimeString()}`,
				);
			}
		} else if (this.currentRateLimit) {
			this.logger.warn("Rate limit headers missing in response.");
		}
	}

	public isLimitExceeded(): boolean {
		if (this.currentRateLimit && this.currentRateLimit.remaining === 0) {
			const now = Math.floor(Date.now() / 1000);
			return now < this.currentRateLimit.reset;
		}
		return false;
	}

	public getRateLimitInfo(): GithubRateLimit | null {
		return this.currentRateLimit;
	}

	public getResetTime(): Date | null {
		if (this.currentRateLimit) {
			return new Date(this.currentRateLimit.reset * 1000);
		}
		return null;
	}
}
