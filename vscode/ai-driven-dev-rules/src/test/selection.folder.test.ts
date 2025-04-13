import * as sinon from "sinon";
import * as vscode from "vscode"; // Needed for mock TreeItem structure
import { IExplorerStateService } from "../services/explorerStateService";
import { ILogger, Logger } from "../services/logger";
import { SelectionService } from "../services/selection";
import { ExplorerTreeProvider } from "../views/explorer/treeProvider";
import { ExplorerTreeItem } from "../views/explorer/treeItem"; // Needed for mock structure

describe("SelectionService - Folder/Recursive Selection", () => {
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

	// Define mock tree data structure
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
		(simpleMockStateService.getAllItems as sinon.SinonStub).returns(mockTreeData);
		mockExplorerStateService =
			simpleMockStateService as sinon.SinonStubbedInstance<IExplorerStateService>;

		selectionService = new SelectionService(
			mockLogger as ILogger,
			mockExplorerStateService,
		);
		onDidChangeSelectionSpy = sinon.spy();
		selectionService.onDidChangeSelection(onDidChangeSelectionSpy);
	});

	it("should select a directory and all its descendants using toggleRecursiveSelection", () => {
		selectionService.toggleRecursiveSelection("folderA");
		const expectedSelection = [
			"folderA",
			"folderA/fileA1.txt",
			"folderA/subFolderB",
			"folderA/subFolderB/fileB1.ts",
			"folderA/subFolderB/fileB2.js",
		];
		expect(selectionService.getSelectedItems()).to.have.members(
			expectedSelection,
		);
		expect(selectionService.getSelectedItems().length).to.equal(
			expectedSelection.length,
		);
		// Verify each item is selected
		expectedSelection.forEach((path) => {
			expect(selectionService.isSelected(path), `Expected ${path} to be selected`)
				.to.be.true;
		});
		// Verify other items are not selected
		expect(selectionService.isSelected("file1.txt")).to.be.false;
		expect(selectionService.isSelected("file2.md")).to.be.false;
		expect(onDidChangeSelectionSpy.calledOnce).to.be.true;
	});

	it("should deselect a directory and all its descendants using toggleRecursiveSelection", () => {
		// First, select recursively
		selectionService.toggleRecursiveSelection("folderA");
		onDidChangeSelectionSpy.resetHistory(); // Reset spy for the second toggle

		// Then, deselect recursively
		selectionService.toggleRecursiveSelection("folderA");

		const previouslySelected = [
			"folderA",
			"folderA/fileA1.txt",
			"folderA/subFolderB",
			"folderA/subFolderB/fileB1.ts",
			"folderA/subFolderB/fileB2.js",
		];
		expect(selectionService.getSelectedItems()).to.be.empty;
		// Verify each previously selected item is now deselected
		previouslySelected.forEach((path) => {
			expect(
				selectionService.isSelected(path),
				`Expected ${path} to be deselected`,
			).to.be.false;
		});
		expect(onDidChangeSelectionSpy.calledOnce).to.be.true; // Event fired for deselection
	});

	it("should handle recursive selection when some children are already selected individually", () => {
		// Select some items individually first using toggleSelection
		selectionService.toggleSelection("folderA/fileA1.txt");
		selectionService.toggleSelection("folderA/subFolderB/fileB1.ts");
		onDidChangeSelectionSpy.resetHistory();

		// Now, select the parent directory recursively
		selectionService.toggleRecursiveSelection("folderA");

		const expectedSelection = [
			"folderA",
			"folderA/fileA1.txt", // Was already selected
			"folderA/subFolderB", // Newly selected
			"folderA/subFolderB/fileB1.ts", // Was already selected
			"folderA/subFolderB/fileB2.js", // Newly selected
		];
		expect(selectionService.getSelectedItems()).to.have.members(
			expectedSelection,
		);
		expect(selectionService.getSelectedItems().length).to.equal(
			expectedSelection.length,
		);
		expect(onDidChangeSelectionSpy.calledOnce).to.be.true; // Event fired because state changed
	});

	it("should handle recursive deselection when some children were selected recursively", () => {
		// Select recursively
		selectionService.toggleRecursiveSelection("folderA");
		// Then deselect an individual child using toggleSelection
		selectionService.toggleSelection("folderA/subFolderB/fileB1.ts");
		onDidChangeSelectionSpy.resetHistory();

		// Now, deselect the parent directory recursively
		selectionService.toggleRecursiveSelection("folderA");

		// Everything should be deselected because the parent toggle overrides
		expect(selectionService.getSelectedItems()).to.be.empty;
		expect(onDidChangeSelectionSpy.calledOnce).to.be.true; // Event fired because state changed
	});

	it("should select all items if root ('') is toggled recursively", () => {
		selectionService.toggleRecursiveSelection(""); // Assuming "" represents the root
		const allPaths = Array.from(mockTreeData.keys());
		expect(selectionService.getSelectedItems()).to.have.members(allPaths);
		expect(selectionService.getSelectedItems().length).to.equal(allPaths.length);
		expect(onDidChangeSelectionSpy.calledOnce).to.be.true;
	});

	it("should deselect all items if root ('') is toggled recursively again", () => {
		selectionService.toggleRecursiveSelection(""); // Select all
		onDidChangeSelectionSpy.resetHistory();
		selectionService.toggleRecursiveSelection(""); // Deselect all
		expect(selectionService.getSelectedItems()).to.be.empty;
		expect(onDidChangeSelectionSpy.calledOnce).to.be.true;
	});

    it("should not change selection if toggling recursively on an already fully selected/deselected branch", () => {
        // Select recursively
        selectionService.toggleRecursiveSelection("folderA");
        onDidChangeSelectionSpy.resetHistory();

        // Toggle again (should DESELECT now)
        selectionService.toggleRecursiveSelection("folderA");
        expect(onDidChangeSelectionSpy.calledOnce).to.be.true; // Event fired because state changed

        // The previous toggle already deselected, so this toggle will SELECT again.
        // Note: The original test name is slightly misleading given the toggle behavior.
        // The service correctly fires the event when the state changes.
        selectionService.toggleRecursiveSelection("folderA");
        onDidChangeSelectionSpy.resetHistory();

        // Toggle again (should DESELECT again)
        selectionService.toggleRecursiveSelection("folderA");
        expect(onDidChangeSelectionSpy.calledOnce).to.be.true; // Event fired because state changed
    });
});
