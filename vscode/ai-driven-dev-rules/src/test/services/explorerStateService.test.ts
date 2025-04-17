import * as sinon from "sinon";
import * as vscode from "vscode"; // Needed for TreeItem structure
import type { GithubRepository } from "../../api/types";
import {
  ExplorerStateService,
  type IExplorerStateService,
} from "../../services/explorerStateService";
import { type ILogger, Logger } from "../../services/logger";
import type { ExplorerTreeItem } from "../../views/explorer/treeItem";

describe("ExplorerStateService", () => {
  let stateService: IExplorerStateService;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let expect: Chai.ExpectStatic;

  // Helper to create basic mock ExplorerTreeItem
  const createMockExplorerItem = (
    path: string,
    type: "file" | "dir" = "file",
  ): ExplorerTreeItem => {
    return {
      content: {
        path,
        type,
        name: path.split("/").pop() || path,
        sha: `sha-${path}`,
        size: 0,
        url: "",
        html_url: "",
        git_url: "",
        download_url: null,
      },
      label: path.split("/").pop() || path,
      collapsibleState:
        type === "dir"
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None,
    } as unknown as ExplorerTreeItem;
  };

  const repo1: GithubRepository = {
    owner: "owner1",
    name: "repo1",
    branch: "main",
  };
  const repo2: GithubRepository = {
    owner: "owner2",
    name: "repo2",
    branch: "dev",
  };
  const item1 = createMockExplorerItem("file1.txt");
  const item2 = createMockExplorerItem("dir1", "dir");
  const item3 = createMockExplorerItem("dir1/file2.ts");

  before(async () => {
    const chai = await import("chai");
    expect = chai.expect;
  });

  beforeEach(() => {
    mockLogger = sinon.createStubInstance(Logger);
    stateService = new ExplorerStateService(mockLogger);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should initialize with null repository and empty state", () => {
    expect(stateService.getRepository()).to.be.null;
    expect(stateService.getRootItems()).to.be.null;
    expect(stateService.isRootLoading()).to.be.false;
    expect(stateService.getAllItems().size).to.equal(0);
    expect((stateService as any).directoryLoadingPromises.size).to.equal(0); // Check private map size
  });

  describe("Repository State", () => {
    it("should set and get the current repository", () => {
      stateService.setRepository(repo1);
      expect(stateService.getRepository()).to.deep.equal(repo1);
      sinon.assert.calledWith(
        mockLogger.debug,
        sinon.match(/Setting repository state/),
      );
    });

    it("should reset state when setting a new repository", () => {
      // Setup initial state
      stateService.setRootItems([item1]);
      stateService.mapItem(item1);
      stateService.setRootLoading(true);
      const resetSpy = sinon.spy(stateService, "resetState");

      stateService.setRepository(repo2); // Set a different repo

      expect(stateService.getRepository()).to.deep.equal(repo2);
      sinon.assert.calledOnce(resetSpy); // resetState should have been called
      // Verify state was reset (indirectly, as resetState calls clear methods)
      expect(stateService.getRootItems()).to.be.null;
      expect(stateService.isRootLoading()).to.be.false;
      expect(stateService.getAllItems().size).to.equal(0);
      resetSpy.restore();
    });

    it("should not reset state if setting the same repository", () => {
      stateService.setRepository(repo1);
      const resetSpy = sinon.spy(stateService, "resetState");
      stateService.setRepository(repo1); // Set same repo again
      sinon.assert.notCalled(resetSpy);
      resetSpy.restore();
    });

    it("should allow setting repository to null", () => {
      stateService.setRepository(repo1);
      const resetSpy = sinon.spy(stateService, "resetState");
      stateService.setRepository(null);
      expect(stateService.getRepository()).to.be.null;
      sinon.assert.calledOnce(resetSpy);
      resetSpy.restore();
    });
  });

  describe("Root Loading State", () => {
    it("should set and get root loading state", () => {
      expect(stateService.isRootLoading()).to.be.false;
      stateService.setRootLoading(true);
      expect(stateService.isRootLoading()).to.be.true;
      sinon.assert.calledWith(
        mockLogger.debug,
        sinon.match(/Setting root loading state to: true/),
      );
      stateService.setRootLoading(false);
      expect(stateService.isRootLoading()).to.be.false;
      sinon.assert.calledWith(
        mockLogger.debug,
        sinon.match(/Setting root loading state to: false/),
      );
    });

    it("should not log if setting the same loading state", () => {
      stateService.setRootLoading(true);
      mockLogger.debug.resetHistory();
      stateService.setRootLoading(true); // Set same state
      sinon.assert.notCalled(mockLogger.debug);
    });
  });

  describe("Root Items State", () => {
    it("should set and get root items", () => {
      const rootItems = [item1, item2];
      expect(stateService.getRootItems()).to.be.null;
      stateService.setRootItems(rootItems);
      expect(stateService.getRootItems()).to.deep.equal(rootItems);
      sinon.assert.calledWith(
        mockLogger.debug,
        sinon.match(/Setting root items state \(count: 2\)/),
      );
    });

    it("should allow setting root items to null", () => {
      stateService.setRootItems([item1]);
      stateService.setRootItems(null);
      expect(stateService.getRootItems()).to.be.null;
      sinon.assert.calledWith(
        mockLogger.debug,
        sinon.match(/Setting root items state \(count: null\)/),
      );
    });
  });

  describe("Item Map State", () => {
    it("should map and get items by path", () => {
      expect(stateService.getItem("file1.txt")).to.be.undefined;
      stateService.mapItem(item1);
      expect(stateService.getItem("file1.txt")).to.equal(item1);
      sinon.assert.calledWith(mockLogger.debug, "Mapping item: file1.txt");
    });

    it("should not log mapping if item already exists (update)", () => {
      stateService.mapItem(item1); // First map
      mockLogger.debug.resetHistory();
      const updatedItem1 = { ...item1, label: "Updated Label" };
      stateService.mapItem(updatedItem1 as ExplorerTreeItem); // Map again
      expect(stateService.getItem("file1.txt")).to.equal(updatedItem1);
      sinon.assert.notCalled(mockLogger.debug); // Should not log "Mapping item:" again
    });

    it("should return all mapped items", () => {
      stateService.mapItem(item1);
      stateService.mapItem(item2);
      stateService.mapItem(item3);
      const allItems = stateService.getAllItems();
      expect(allItems.size).to.equal(3);
      expect(allItems.get("file1.txt")).to.equal(item1);
      expect(allItems.get("dir1")).to.equal(item2);
      expect(allItems.get("dir1/file2.ts")).to.equal(item3);
    });

    it("should clear the item map", () => {
      stateService.mapItem(item1);
      stateService.mapItem(item2);
      expect(stateService.getAllItems().size).to.equal(2);
      stateService.clearItemMap();
      expect(stateService.getAllItems().size).to.equal(0);
      sinon.assert.calledWith(mockLogger.debug, "Clearing item map.");
    });

    it("should not log clearing if map is already empty", () => {
      stateService.clearItemMap();
      mockLogger.debug.resetHistory();
      stateService.clearItemMap();
      sinon.assert.notCalled(mockLogger.debug);
    });
  });

  describe("Directory Loading Promises", () => {
    const dirPath = "dir1";
    const promise = Promise.resolve([item3]);

    it("should set and get loading promises", () => {
      expect(stateService.getLoadingPromise(dirPath)).to.be.undefined;
      stateService.setLoadingPromise(dirPath, promise);
      expect(stateService.getLoadingPromise(dirPath)).to.equal(promise);
      sinon.assert.calledWith(
        mockLogger.debug,
        `Setting loading promise for path: ${dirPath}`,
      );
    });

    it("should delete loading promises", () => {
      stateService.setLoadingPromise(dirPath, promise);
      expect(stateService.getLoadingPromise(dirPath)).to.exist;
      stateService.deleteLoadingPromise(dirPath);
      expect(stateService.getLoadingPromise(dirPath)).to.be.undefined;
      sinon.assert.calledWith(
        mockLogger.debug,
        `Deleting loading promise for path: ${dirPath}`,
      );
    });

    it("should not log deleting if promise does not exist", () => {
      stateService.deleteLoadingPromise(dirPath);
      mockLogger.debug.resetHistory();
      stateService.deleteLoadingPromise(dirPath);
      sinon.assert.notCalled(mockLogger.debug);
    });

    it("should clear all loading promises", () => {
      stateService.setLoadingPromise("dir1", promise);
      stateService.setLoadingPromise("dir2", Promise.resolve([]));
      expect((stateService as any).directoryLoadingPromises.size).to.equal(2);
      stateService.clearLoadingPromises();
      expect((stateService as any).directoryLoadingPromises.size).to.equal(0);
      sinon.assert.calledWith(
        mockLogger.debug,
        "Clearing directory loading promises.",
      );
    });

    it("should not log clearing if promises map is already empty", () => {
      stateService.clearLoadingPromises();
      mockLogger.debug.resetHistory();
      stateService.clearLoadingPromises();
      sinon.assert.notCalled(mockLogger.debug);
    });
  });

  describe("resetState", () => {
    it("should reset all relevant state properties", () => {
      // Setup some state
      stateService.setRepository(repo1); // Needed to avoid immediate reset
      stateService.setRootItems([item1]);
      stateService.setRootLoading(true);
      stateService.mapItem(item1);
      stateService.mapItem(item2);
      stateService.setLoadingPromise("dir1", Promise.resolve([]));

      // Spies to verify clear methods are called
      const clearMapSpy = sinon.spy(stateService, "clearItemMap");
      const clearPromisesSpy = sinon.spy(stateService, "clearLoadingPromises");

      stateService.resetState();

      sinon.assert.calledWith(mockLogger.debug, "Resetting explorer state.");
      expect(stateService.getRootItems()).to.be.null;
      expect(stateService.isRootLoading()).to.be.false;
      sinon.assert.calledOnce(clearMapSpy);
      sinon.assert.calledOnce(clearPromisesSpy);
      // Repository is NOT reset by resetState, only by setRepository
      expect(stateService.getRepository()).to.deep.equal(repo1);

      clearMapSpy.restore();
      clearPromisesSpy.restore();
    });
  });
});
