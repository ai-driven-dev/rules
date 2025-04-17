import * as sinon from "sinon";
import * as vscode from "vscode"; // Needed for mock TreeItem structure
import type { IExplorerStateService } from "../services/explorerStateService";
import { type ILogger, Logger } from "../services/logger";
import { SelectionService } from "../services/selection";
import type { ExplorerTreeItem } from "../views/explorer/treeItem"; // Needed for mock structure
import { ExplorerTreeProvider } from "../views/explorer/treeProvider";

describe("SelectionService - File/Individual Selection", () => {
  let selectionService: SelectionService;
  let onDidChangeSelectionSpy: sinon.SinonSpy;
  let expect: Chai.ExpectStatic;
  let mockExplorerStateService: sinon.SinonStubbedInstance<IExplorerStateService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;

  // Helper function to create mock tree items
  const createMockItem = (
    path: string,
    type: vscode.FileType,
  ): ExplorerTreeItem => {
    return {
      content: { path, type },
    } as unknown as ExplorerTreeItem;
  };

  // Define mock tree data structure (needed for context, even if not directly used in all tests here)
  const mockTreeData = new Map<string, ExplorerTreeItem>([
    ["file1.txt", createMockItem("file1.txt", vscode.FileType.File)],
    ["folderA", createMockItem("folderA", vscode.FileType.Directory)],
    [
      "folderA/fileA1.txt",
      createMockItem("folderA/fileA1.txt", vscode.FileType.File),
    ],
    [
      "folderA/subFolderB",
      createMockItem("folderA/subFolderB", vscode.FileType.Directory),
    ],
    [
      "folderA/subFolderB/fileB1.ts",
      createMockItem("folderA/subFolderB/fileB1.ts", vscode.FileType.File),
    ],
    [
      "folderA/subFolderB/fileB2.js",
      createMockItem("folderA/subFolderB/fileB2.js", vscode.FileType.File),
    ],
    ["file2.md", createMockItem("file2.md", vscode.FileType.File)],
  ]);

  before(async () => {
    const chai = await import("chai");
    expect = chai.expect;
  });

  beforeEach(() => {
    mockLogger = sinon.createStubInstance(Logger);
    const simpleMockStateService: Partial<IExplorerStateService> = {
      getAllItems: sinon.stub<[], Map<string, ExplorerTreeItem>>(),
    };
    (simpleMockStateService.getAllItems as sinon.SinonStub).returns(
      mockTreeData,
    );
    mockExplorerStateService =
      simpleMockStateService as sinon.SinonStubbedInstance<IExplorerStateService>;

    selectionService = new SelectionService(
      mockLogger as ILogger,
      mockExplorerStateService,
    );
    onDidChangeSelectionSpy = sinon.spy();
    selectionService.onDidChangeSelection(onDidChangeSelectionSpy);
  });

  it("should initialize with an empty selection", () => {
    expect(selectionService.getSelectedItems()).to.be.an("array").that.is.empty;
  });

  it("should select an item using toggleSelection", () => {
    selectionService.toggleSelection("file1.txt");
    expect(selectionService.isSelected("file1.txt")).to.be.true;
    expect(selectionService.getSelectedItems()).to.deep.equal(["file1.txt"]);
    expect(onDidChangeSelectionSpy.calledOnce).to.be.true;
  });

  it("should deselect an item using toggleSelection", () => {
    selectionService.toggleSelection("file1.txt"); // Select
    selectionService.toggleSelection("file1.txt"); // Deselect
    expect(selectionService.isSelected("file1.txt")).to.be.false;
    expect(selectionService.getSelectedItems()).to.be.empty;
    expect(onDidChangeSelectionSpy.calledTwice).to.be.true;
  });

  it("should handle multiple individual items correctly using toggleSelection", () => {
    selectionService.toggleSelection("file1.txt");
    selectionService.toggleSelection("folderA/fileA1.txt");
    selectionService.toggleSelection("file2.md");
    selectionService.toggleSelection("folderA/fileA1.txt"); // Deselect one

    expect(selectionService.isSelected("file1.txt")).to.be.true;
    expect(selectionService.isSelected("folderA/fileA1.txt")).to.be.false;
    expect(selectionService.isSelected("file2.md")).to.be.true;
    expect(selectionService.getSelectedItems()).to.have.members([
      "file1.txt",
      "file2.md",
    ]);
    expect(selectionService.getSelectedItems()).to.not.include(
      "folderA/fileA1.txt",
    );
    expect(onDidChangeSelectionSpy.callCount).to.equal(4);
  });

  it("should clear the selection", () => {
    selectionService.toggleSelection("file1.txt");
    selectionService.toggleSelection("folderA");
    selectionService.clearSelection();

    expect(selectionService.getSelectedItems()).to.be.empty;
    expect(selectionService.isSelected("file1.txt")).to.be.false;
    expect(selectionService.isSelected("folderA")).to.be.false;
    expect(onDidChangeSelectionSpy.callCount).to.equal(3); // 2 toggles + 1 clear
  });

  it("should not fire event if clearSelection is called on empty selection", () => {
    selectionService.clearSelection();
    expect(onDidChangeSelectionSpy.called).to.be.false;
  });

  it("should return correct state for isSelected", () => {
    expect(selectionService.isSelected("nonexistent")).to.be.false;
    selectionService.toggleSelection("file1.txt");
    expect(selectionService.isSelected("file1.txt")).to.be.true;
    expect(selectionService.isSelected("nonexistent")).to.be.false;
  });

  it("should select only a single file using toggleSelection", () => {
    selectionService.toggleSelection("folderA/fileA1.txt");
    expect(selectionService.isSelected("folderA/fileA1.txt")).to.be.true;
    expect(selectionService.getSelectedItems()).to.deep.equal([
      "folderA/fileA1.txt",
    ]);
    expect(onDidChangeSelectionSpy.calledOnce).to.be.true;
  });

  it("should select only a single directory using toggleSelection (no recursion)", () => {
    selectionService.toggleSelection("folderA");
    expect(selectionService.isSelected("folderA")).to.be.true;
    expect(selectionService.getSelectedItems()).to.deep.equal(["folderA"]);
    // Check that children are NOT selected
    expect(selectionService.isSelected("folderA/fileA1.txt")).to.be.false;
    expect(selectionService.isSelected("folderA/subFolderB")).to.be.false;
    expect(onDidChangeSelectionSpy.calledOnce).to.be.true;
  });

  it("should select multiple distinct items using toggleSelection", () => {
    selectionService.toggleSelection("file1.txt");
    selectionService.toggleSelection("folderA");
    selectionService.toggleSelection("folderA/subFolderB/fileB1.ts");

    expect(selectionService.isSelected("file1.txt")).to.be.true;
    expect(selectionService.isSelected("folderA")).to.be.true;
    expect(selectionService.isSelected("folderA/subFolderB/fileB1.ts")).to.be
      .true;
    expect(selectionService.isSelected("folderA/fileA1.txt")).to.be.false; // Child not selected

    expect(selectionService.getSelectedItems()).to.have.members([
      "file1.txt",
      "folderA",
      "folderA/subFolderB/fileB1.ts",
    ]);
    expect(selectionService.getSelectedItems().length).to.equal(3);
    expect(onDidChangeSelectionSpy.callCount).to.equal(3);
  });
});
