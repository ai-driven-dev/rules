import { GithubRepository } from "../api/types";

/**
 * Parses a GitHub repository URL into its components.
 * Handles various URL formats.
 * @param url The GitHub repository URL string.
 * @returns A GithubRepository object or null if parsing fails.
 */
export function parseRepositoryUrl(url: string): GithubRepository | null {
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
		console.error("Error parsing repository URL:", error);
		return null;
	}
}
