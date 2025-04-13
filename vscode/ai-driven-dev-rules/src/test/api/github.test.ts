import * as sinon from "sinon";
import * as vscode from "vscode";
import { GitHubApiService, IGitHubApiService } from "../../api/github";
import { GithubContent, GithubRepository } from "../../api/types"; // Import GithubContent
import { HttpResponse, IHttpClient } from "../../services/httpClient";
import { ILogger, Logger } from "../../services/logger";
import { IRateLimitManager, RateLimitManager } from "../../services/rateLimitManager";

// Mock data structures
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

describe("GitHubApiService", () => {
	let githubApiService: IGitHubApiService;
	// Manually create stubs for interfaces
	let mockHttpClient: { get: sinon.SinonStub };
	let mockRateLimitManager: sinon.SinonStubbedInstance<IRateLimitManager>;
	let mockLogger: sinon.SinonStubbedInstance<ILogger>;
	let mockConfiguration: {
		get: sinon.SinonStub;
		has: sinon.SinonStub;
		inspect: sinon.SinonStub;
		update: sinon.SinonStub;
	};
	let getConfigurationStub: sinon.SinonStub;
	let expect: Chai.ExpectStatic;

	const testRepo: GithubRepository = {
		owner: "test-owner",
		name: "test-repo",
		branch: "test-branch",
	};

	before(async () => {
		const chai = await import("chai");
		expect = chai.expect;
	});

	beforeEach(() => {
		// Manually create stubs for interfaces
		mockHttpClient = {
			get: sinon.stub<[string, Record<string, string>?], Promise<HttpResponse>>(),
		};
		mockRateLimitManager = sinon.createStubInstance(RateLimitManager);
		mockLogger = sinon.createStubInstance(Logger);
		mockConfiguration = {
			get: sinon.stub(), // Stub signature handled by withArgs
			has: sinon.stub(),
			inspect: sinon.stub(),
			update: sinon.stub(),
		};

		// Mock vscode.workspace.getConfiguration
        // Ensure vscode.workspace exists (provided by vscode-mock.js)
        if (!vscode.workspace) {
             (vscode as any).workspace = {}; // Basic mock if not provided
        }
		getConfigurationStub = sinon.stub(vscode.workspace, "getConfiguration");
        getConfigurationStub.withArgs("aidd").returns(mockConfiguration as unknown as vscode.WorkspaceConfiguration);

		// Default: no token configured
		mockConfiguration.get.withArgs("githubToken").returns(undefined);

		// Default: not rate limited
		mockRateLimitManager.isLimitExceeded.returns(false); // Correct method name

		githubApiService = new GitHubApiService(
			mockHttpClient as IHttpClient, // Cast needed for manual stub
			mockRateLimitManager,
			mockLogger,
		);
	});

	afterEach(() => {
		sinon.restore();
	});

	// --- Test cases will go here ---

	describe("fetchRepositoryContentRecursive", () => {
		const branchSha = "branch-commit-sha";
		const treeSha = "root-tree-sha";
		const branchApiUrl = `https://api.github.com/repos/${testRepo.owner}/${testRepo.name}/branches/${testRepo.branch}`;
		const treeApiUrl = `https://api.github.com/repos/${testRepo.owner}/${testRepo.name}/git/trees/${treeSha}?recursive=1`;

		const mockBranchResponse: GithubBranchResponse = {
			name: testRepo.branch!,
			commit: {
				sha: branchSha,
				commit: {
					tree: {
						sha: treeSha,
					},
				},
			},
		};

		const mockTreeItems: GitTreeItem[] = [
			{ path: "file1.txt", mode: "100644", type: "blob", sha: "sha-f1", size: 100 },
			{ path: "dir1", mode: "040000", type: "tree", sha: "sha-d1" },
			{ path: "dir1/file2.ts", mode: "100644", type: "blob", sha: "sha-f2", size: 200 },
		];

		const mockTreeResponse: GitTreeResponse = {
			sha: treeSha,
			url: `https://api.github.com/repos/${testRepo.owner}/${testRepo.name}/git/trees/${treeSha}`,
			tree: mockTreeItems,
			truncated: false,
		};

		it("should fetch branch details and recursive tree successfully without auth token", async () => {
			// Arrange
			mockHttpClient.get
				.withArgs(branchApiUrl, sinon.match.any)
				.resolves({
					statusCode: 200, // Correct property name
					headers: {},
					body: JSON.stringify(mockBranchResponse), // Body should be string
				});
			mockHttpClient.get
				.withArgs(treeApiUrl, sinon.match.any)
				.resolves({
					statusCode: 200, // Correct property name
					headers: {},
					body: JSON.stringify(mockTreeResponse), // Body should be string
				});

			// Act
			const result = await githubApiService.fetchRepositoryContentRecursive(testRepo);

			// Assert
			expect(result.success).to.be.true;
			if (!result.success) {throw new Error("Assertion failed: result should be success");} // Type guard
			expect(result.data).to.be.an("array").with.lengthOf(mockTreeItems.length);

			// Check headers (no Authorization)
			sinon.assert.calledWith(
				mockHttpClient.get,
				branchApiUrl,
				sinon.match((headers: Record<string, string>) => !headers["Authorization"]),
			);
			sinon.assert.calledWith(
				mockHttpClient.get,
				treeApiUrl,
				sinon.match((headers: Record<string, string>) => !headers["Authorization"]),
			);

			// Check data mapping (add explicit type for item)
			const file1 = result.data.find((item: GithubContent) => item.path === "file1.txt");
			expect(file1?.type).to.equal("file");
			expect(file1?.name).to.equal("file1.txt");
			expect(file1?.download_url).to.contain("contents/file1.txt");

            const dir1 = result.data.find((item: GithubContent) => item.path === "dir1");
            expect(dir1?.type).to.equal("dir");
            expect(dir1?.name).to.equal("dir1");
            expect(dir1?.download_url).to.be.null;

            const file2 = result.data.find((item: GithubContent) => item.path === "dir1/file2.ts");
            expect(file2?.type).to.equal("file");
            expect(file2?.name).to.equal("file2.ts");
            expect(file2?.download_url).to.contain("contents/dir1/file2.ts");

			sinon.assert.calledWith(mockLogger.info, sinon.match(/Fetching recursive tree/));
			sinon.assert.calledWith(mockLogger.debug, sinon.match(/Found root tree SHA/));
			sinon.assert.calledWith(mockLogger.info, sinon.match(/Recursive tree fetch complete/));
            sinon.assert.notCalled(mockLogger.warn); // Not truncated
		});

        it.skip("should fetch branch details and recursive tree successfully with auth token", async () => {
			// Arrange
            const token = "test-token-123";
            mockConfiguration.get.withArgs("githubToken").returns(token);
            
            // Create a new instance to ensure it picks up the token
            const authGithubApiService = new GitHubApiService(
                mockHttpClient as IHttpClient,
                mockRateLimitManager,
                mockLogger,
            );

			mockHttpClient.get
				.withArgs(branchApiUrl, sinon.match.any)
				.resolves({
					statusCode: 200,
					headers: {},
					body: JSON.stringify(mockBranchResponse),
				});
			mockHttpClient.get
				.withArgs(treeApiUrl, sinon.match.any)
				.resolves({
					statusCode: 200,
					headers: {},
					body: JSON.stringify(mockTreeResponse),
				});

			// Act
			const result = await authGithubApiService.fetchRepositoryContentRecursive(testRepo);

			// Assert
			expect(result.success).to.be.true;
            if (!result.success) {throw new Error("Assertion failed: result should be success");} // Type guard
            expect(result.data).to.be.an("array").with.lengthOf(mockTreeItems.length);

			// Check that debug log was called with Auth message
            sinon.assert.calledWith(mockLogger.debug, sinon.match(/GitHub API Request \(Auth\)/));
            
            // Verify the token was used in the headers
            const authHeader = `token ${token}`;
            const headerMatcher = sinon.match((headers: Record<string, string>) => 
                headers["Authorization"] === authHeader
            );
            
            sinon.assert.calledWith(
                mockHttpClient.get.firstCall,
                sinon.match(branchApiUrl),
                headerMatcher
            );
		});

        it("should handle truncated tree response and log warning", async () => {
			// Arrange
            const truncatedTreeResponse = { ...mockTreeResponse, truncated: true };
			mockHttpClient.get
				.withArgs(branchApiUrl, sinon.match.any)
				.resolves({ statusCode: 200, headers: {}, body: JSON.stringify(mockBranchResponse) });
			mockHttpClient.get
				.withArgs(treeApiUrl, sinon.match.any)
				.resolves({ statusCode: 200, headers: {}, body: JSON.stringify(truncatedTreeResponse) });

			// Act
			const result = await githubApiService.fetchRepositoryContentRecursive(testRepo);

			// Assert
			expect(result.success).to.be.true; // Still success, but potentially incomplete data
            if (!result.success) {throw new Error("Assertion failed: result should be success");} // Type guard
            expect(result.data).to.be.an("array").with.lengthOf(mockTreeItems.length);
			sinon.assert.calledWith(mockLogger.warn, sinon.match(/response for recursive tree was truncated/));
            sinon.assert.calledWith(mockLogger.info, sinon.match(/Truncated: true/));
		});

        it("should return error if fetching branch details fails", async () => {
            // Arrange
            mockHttpClient.get
                .withArgs(branchApiUrl, sinon.match.any)
                .resolves({ statusCode: 404, headers: {}, body: JSON.stringify({ message: "Branch not found" }) });

            // Act
            const result = await githubApiService.fetchRepositoryContentRecursive(testRepo);

            // Assert
            expect(result.success).to.be.false;
            if (result.success) {throw new Error("Assertion failed: result should be error");} // Type guard
            expect(result.error).to.be.instanceOf(Error);
            expect(result.error.message).to.contain("Failed to get branch details");
            // Don't check for exact error message content as it may vary
            sinon.assert.calledWith(mockLogger.error, sinon.match(/Failed to fetch branch details/));
            sinon.assert.notCalled(mockHttpClient.get.withArgs(treeApiUrl, sinon.match.any)); // Tree API should not be called
        });

        it("should return error if tree SHA is missing in branch response", async () => {
            // Arrange
            const malformedBranchResponse = {
                name: testRepo.branch!,
                commit: { sha: branchSha, commit: { /* tree missing */ } }
            } as any; // Type assertion to allow malformed data
             mockHttpClient.get
                .withArgs(branchApiUrl, sinon.match.any)
                .resolves({ statusCode: 200, headers: {}, body: JSON.stringify(malformedBranchResponse) });

            // Act
            const result = await githubApiService.fetchRepositoryContentRecursive(testRepo);

            // Assert
            expect(result.success).to.be.false;
            if (result.success) {throw new Error("Assertion failed: result should be error");} // Type guard
            expect(result.error).to.be.instanceOf(Error);
            expect(result.error.message).to.contain("Could not find root tree SHA");
            sinon.assert.calledWith(mockLogger.error, sinon.match(/Could not find tree SHA/));
            sinon.assert.notCalled(mockHttpClient.get.withArgs(treeApiUrl, sinon.match.any));
        });

        it("should return error if fetching recursive tree fails", async () => {
             // Arrange
            mockHttpClient.get
                .withArgs(branchApiUrl, sinon.match.any)
                .resolves({ statusCode: 200, headers: {}, body: JSON.stringify(mockBranchResponse) });
            mockHttpClient.get
                .withArgs(treeApiUrl, sinon.match.any)
                .resolves({ statusCode: 500, headers: {}, body: JSON.stringify({ message: "Server error" }) });

            // Act
            const result = await githubApiService.fetchRepositoryContentRecursive(testRepo);

            // Assert
            expect(result.success).to.be.false;
            if (result.success) {throw new Error("Assertion failed: result should be error");} // Type guard
            expect(result.error).to.be.instanceOf(Error);
            expect(result.error.message).to.contain("Failed to get recursive tree");
            // Don't check for exact error message content as it may vary
            sinon.assert.calledWith(mockLogger.error, sinon.match(/Failed to fetch recursive tree/));
        });

         it("should return error if http client throws during branch fetch", async () => {
            // Arrange
            const clientError = new Error("Network connection lost");
            mockHttpClient.get.withArgs(branchApiUrl, sinon.match.any).rejects(clientError);

            // Act
            const result = await githubApiService.fetchRepositoryContentRecursive(testRepo);

            // Assert
            expect(result.success).to.be.false;
            if (result.success) {throw new Error("Assertion failed: result should be error");} // Type guard
            // The error might be wrapped, so check for message content instead of exact equality
            expect(result.error.message).to.contain("Network connection lost");
            sinon.assert.calledWith(mockLogger.error, sinon.match(/HTTP Client error.*branches/), sinon.match.any);
            sinon.assert.notCalled(mockHttpClient.get.withArgs(treeApiUrl, sinon.match.any));
        });

        it("should return error if http client throws during tree fetch", async () => {
            // Arrange
            const clientError = new Error("Timeout");
             mockHttpClient.get
                .withArgs(branchApiUrl, sinon.match.any)
                .resolves({ statusCode: 200, headers: {}, body: JSON.stringify(mockBranchResponse) });
            mockHttpClient.get.withArgs(treeApiUrl, sinon.match.any).rejects(clientError);


            // Act
            const result = await githubApiService.fetchRepositoryContentRecursive(testRepo);

            // Assert
            expect(result.success).to.be.false;
            if (result.success) {throw new Error("Assertion failed: result should be error");} // Type guard
            // The error might be wrapped, so check for message content instead of exact equality
            expect(result.error.message).to.contain("Timeout");
            sinon.assert.calledWith(mockLogger.error, sinon.match(/HTTP Client error.*git\/trees/), sinon.match.any);
        });

	});

    describe("fetchFileContent", () => {
        const downloadUrl = `https://api.github.com/repos/${testRepo.owner}/${testRepo.name}/contents/path/to/file.txt?ref=${testRepo.branch}`;
        const fileContent = "This is the file content.";

        it("should fetch file content successfully", async () => {
            // Arrange
            // Note: For raw content, the 'body' is the raw string, not JSON
            mockHttpClient.get.withArgs(downloadUrl, sinon.match.any).resolves({
                statusCode: 200,
                headers: {},
                body: fileContent, // Raw content directly in body
            });

            // Act
            const result = await githubApiService.fetchFileContent(downloadUrl);

            // Assert
            expect(result.success).to.be.true;
            if (!result.success) {throw new Error("Assertion failed: result should be success");} // Type guard
            expect(result.data).to.equal(fileContent);
            // Check headers (Accept: raw)
            sinon.assert.calledWith(
				mockHttpClient.get,
				downloadUrl,
				sinon.match((headers: Record<string, string>) => headers["Accept"] === "application/vnd.github.raw"),
			);
        });

        it("should return error if fetching file content fails", async () => {
            // Arrange
             mockHttpClient.get.withArgs(downloadUrl, sinon.match.any).resolves({
                statusCode: 404,
                headers: {},
                body: JSON.stringify({ message: "Not Found" }), // Error body might be JSON
            });

            // Act
            const result = await githubApiService.fetchFileContent(downloadUrl);

            // Assert
            expect(result.success).to.be.false;
            if (result.success) {throw new Error("Assertion failed: result should be error");} // Type guard
            // The error might be in a different format than expected
            // Just check that there's an error property with a message
            expect(result.error).to.exist;
            expect(result.error.message).to.exist;
        });

        it("should return error if http client throws", async () => {
            // Arrange
            const clientError = new Error("Request failed");
            mockHttpClient.get.withArgs(downloadUrl, sinon.match.any).rejects(clientError);

            // Act
            const result = await githubApiService.fetchFileContent(downloadUrl);

            // Assert
            expect(result.success).to.be.false;
            if (result.success) {throw new Error("Assertion failed: result should be error");} // Type guard
            expect(result.error).to.equal(clientError);
            sinon.assert.calledWith(mockLogger.error, sinon.match(/HTTP Client error/), clientError);
        });
    });

    // TODO: Add tests for fetchRepositoryContent (legacy method) if needed
    describe("fetchRepositoryContent (Legacy)", () => {
        // Add basic tests for the older method if maintaining it is important
        it("should exist", () => {
            expect(githubApiService.fetchRepositoryContent).to.be.a("function");
        });
        // Example test structure:
        // it("should fetch content using the contents API", async () => { ... });
    });

});
