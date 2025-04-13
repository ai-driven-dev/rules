import * as sinon from "sinon";
import { IExplorerStateService } from "../services/explorerStateService";
import { ILogger, Logger } from "../services/logger";
import { SelectionService } from "../services/selection";
import { ExplorerTreeProvider } from "../views/explorer/treeProvider";

describe("SelectionService", () => {
	let selectionService: SelectionService;
	let onDidChangeSelectionSpy: sinon.SinonSpy;
	let expect: Chai.ExpectStatic;
	let mockTreeProvider: sinon.SinonStubbedInstance<ExplorerTreeProvider>;
	let mockLogger: sinon.SinonStubbedInstance<ILogger>;

	before(async () => {
		const chai = await import("chai");
		expect = chai.expect;
	});

	beforeEach(() => {
		mockTreeProvider = sinon.createStubInstance(ExplorerTreeProvider);
		mockLogger = sinon.createStubInstance(Logger);

		selectionService = new SelectionService(
			mockLogger as ILogger,
			mockTreeProvider as unknown as IExplorerStateService,
		);
		onDidChangeSelectionSpy = sinon.spy();
		selectionService.onDidChangeSelection(onDidChangeSelectionSpy);
	});

	it("should initialize with an empty selection", () => {
		expect(selectionService.getSelectedItems()).to.be.an("array").that.is.empty;
	});

	it("should select an item when toggled for the first time", () => {
		selectionService.toggleSelection("item1");
		expect(selectionService.isSelected("item1")).to.be.true;
		expect(selectionService.getSelectedItems()).to.deep.equal(["item1"]);
		expect(onDidChangeSelectionSpy.calledOnce).to.be.true;
	});

	it("should deselect an item when toggled again", () => {
		selectionService.toggleSelection("item1");
		selectionService.toggleSelection("item1");
		expect(selectionService.isSelected("item1")).to.be.false;
		expect(selectionService.getSelectedItems()).to.be.empty;
		expect(onDidChangeSelectionSpy.calledTwice).to.be.true;
	});

	it("should handle multiple items correctly", () => {
		selectionService.toggleSelection("item1");
		selectionService.toggleSelection("item2");
		selectionService.toggleSelection("item3");
		selectionService.toggleSelection("item2");

		expect(selectionService.isSelected("item1")).to.be.true;
		expect(selectionService.isSelected("item2")).to.be.false;
		expect(selectionService.isSelected("item3")).to.be.true;
		expect(selectionService.getSelectedItems()).to.have.members([
			"item1",
			"item3",
		]);
		expect(selectionService.getSelectedItems()).to.not.include("item2");
		expect(onDidChangeSelectionSpy.callCount).to.equal(4);
	});

	it("should clear the selection", () => {
		selectionService.toggleSelection("item1");
		selectionService.toggleSelection("item2");
		selectionService.clearSelection();

		expect(selectionService.getSelectedItems()).to.be.empty;
		expect(selectionService.isSelected("item1")).to.be.false;
		expect(selectionService.isSelected("item2")).to.be.false;

		expect(onDidChangeSelectionSpy.callCount).to.equal(3);
	});

	it("should not fire event if clearSelection is called on empty selection", () => {
		selectionService.clearSelection();
		expect(onDidChangeSelectionSpy.called).to.be.false;
	});

	it("should return correct state for isSelected", () => {
		expect(selectionService.isSelected("nonexistent")).to.be.false;
		selectionService.toggleSelection("itemExists");
		expect(selectionService.isSelected("itemExists")).to.be.true;
		expect(selectionService.isSelected("nonexistent")).to.be.false;
	});
});
