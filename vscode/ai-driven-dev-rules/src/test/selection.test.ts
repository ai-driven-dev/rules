// Use dynamic import for chai due to ESM/CJS incompatibility
// import { expect } from 'chai';
import * as sinon from 'sinon';
import { SelectionService } from '../services/selection';

describe('SelectionService', () => {
  let selectionService: SelectionService;
  let onDidChangeSelectionSpy: sinon.SinonSpy;
  let expect: Chai.ExpectStatic; // Declare expect variable

  // Use a before hook to dynamically import chai
  before(async () => {
    const chai = await import('chai');
    expect = chai.expect;
  });

  beforeEach(() => {
    selectionService = new SelectionService();
    onDidChangeSelectionSpy = sinon.spy();
    selectionService.onDidChangeSelection(onDidChangeSelectionSpy);
  });

  it('should initialize with an empty selection', () => {
    expect(selectionService.getSelectedItems()).to.be.an('array').that.is.empty;
  });

  it('should select an item when toggled for the first time', () => {
    selectionService.toggleSelection('item1');
    expect(selectionService.isSelected('item1')).to.be.true;
    expect(selectionService.getSelectedItems()).to.deep.equal(['item1']);
    expect(onDidChangeSelectionSpy.calledOnce).to.be.true;
  });

  it('should deselect an item when toggled again', () => {
    selectionService.toggleSelection('item1'); // Select
    selectionService.toggleSelection('item1'); // Deselect
    expect(selectionService.isSelected('item1')).to.be.false;
    expect(selectionService.getSelectedItems()).to.be.empty;
    expect(onDidChangeSelectionSpy.calledTwice).to.be.true; // Called for select and deselect
  });

  it('should handle multiple items correctly', () => {
    selectionService.toggleSelection('item1');
    selectionService.toggleSelection('item2');
    selectionService.toggleSelection('item3');
    selectionService.toggleSelection('item2'); // Deselect item2

    expect(selectionService.isSelected('item1')).to.be.true;
    expect(selectionService.isSelected('item2')).to.be.false;
    expect(selectionService.isSelected('item3')).to.be.true;
    expect(selectionService.getSelectedItems()).to.have.members(['item1', 'item3']);
    expect(selectionService.getSelectedItems()).to.not.include('item2');
    expect(onDidChangeSelectionSpy.callCount).to.equal(4);
  });

  it('should clear the selection', () => {
    selectionService.toggleSelection('item1');
    selectionService.toggleSelection('item2');
    selectionService.clearSelection();

    expect(selectionService.getSelectedItems()).to.be.empty;
    expect(selectionService.isSelected('item1')).to.be.false;
    expect(selectionService.isSelected('item2')).to.be.false;
    // Called twice for toggle, once for clear
    expect(onDidChangeSelectionSpy.callCount).to.equal(3);
  });

   it('should not fire event if clearSelection is called on empty selection', () => {
     selectionService.clearSelection();
     expect(onDidChangeSelectionSpy.called).to.be.false;
   });

   it('should return correct state for isSelected', () => {
     expect(selectionService.isSelected('nonexistent')).to.be.false;
     selectionService.toggleSelection('itemExists');
     expect(selectionService.isSelected('itemExists')).to.be.true;
     expect(selectionService.isSelected('nonexistent')).to.be.false;
   });
});
