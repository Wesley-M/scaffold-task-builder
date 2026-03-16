// ─── Store Tests (Cypress) ────────────────────────────────────────────

function resetStoreHelper(store) {
  while (store.tabOrder && store.tabOrder.length > 1) {
    store.closeTab(store.tabOrder[store.tabOrder.length - 1]);
  }
  store.reset();
}

describe('Store — initial state', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('has empty task name', () => {
    cy.getTestModules().then(({ store }) => {
      expect(store.getState().taskName).to.equal('');
    });
  });

  it('has empty required variables', () => {
    cy.getTestModules().then(({ store }) => {
      expect(store.getState().requiredVariables).to.have.length(0);
    });
  });

  it('has empty computed variables', () => {
    cy.getTestModules().then(({ store }) => {
      expect(store.getState().computedVariables).to.have.length(0);
    });
  });

  it('has empty items', () => {
    cy.getTestModules().then(({ store }) => {
      expect(store.getState().items).to.have.length(0);
    });
  });

  it('has null selectedItemId', () => {
    cy.getTestModules().then(({ store }) => {
      expect(store.getState().selectedItemId).to.equal(null);
    });
  });

  it('has empty validationErrors', () => {
    cy.getTestModules().then(({ store }) => {
      expect(store.getState().validationErrors).to.have.length(0);
    });
  });
});

describe('Store — setTaskName', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('sets task name', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('myTask');
      expect(store.getState().taskName).to.equal('myTask');
    });
  });

  it('overwrites previous task name', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('first');
      store.setTaskName('second');
      expect(store.getState().taskName).to.equal('second');
    });
  });

  it('can set to empty string', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('something');
      store.setTaskName('');
      expect(store.getState().taskName).to.equal('');
    });
  });
});

describe('Store — subscribe', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('notifies subscribers on state change', () => {
    cy.getTestModules().then(({ store }) => {
      let notified = false;
      const unsub = store.subscribe(() => { notified = true; });
      store.setTaskName('test');
      expect(notified).to.be.true;
      unsub();
    });
  });

  it('stops notifying after unsubscribe', () => {
    cy.getTestModules().then(({ store }) => {
      let count = 0;
      const unsub = store.subscribe(() => { count++; });
      store.setTaskName('a');
      unsub();
      store.setTaskName('b');
      expect(count).to.equal(1);
    });
  });

  it('multiple subscribers all get notified', () => {
    cy.getTestModules().then(({ store }) => {
      let c1 = 0, c2 = 0;
      const unsub1 = store.subscribe(() => { c1++; });
      const unsub2 = store.subscribe(() => { c2++; });
      store.setTaskName('x');
      expect(c1).to.equal(1);
      expect(c2).to.equal(1);
      unsub1();
      unsub2();
    });
  });
});

describe('Store — required variables', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('adds a required variable', () => {
    cy.getTestModules().then(({ store }) => {
      const id = store.addRequiredVariable('myVar');
      expect(id).to.be.ok;
      expect(store.getState().requiredVariables).to.have.length(1);
      expect(store.getState().requiredVariables[0].name).to.equal('myVar');
    });
  });

  it('adds with default empty name', () => {
    cy.getTestModules().then(({ store }) => {
      store.addRequiredVariable();
      expect(store.getState().requiredVariables[0].name).to.equal('');
    });
  });

  it('updates a required variable name', () => {
    cy.getTestModules().then(({ store }) => {
      const id = store.addRequiredVariable('old');
      store.updateRequiredVariable(id, 'new');
      expect(store.getState().requiredVariables[0].name).to.equal('new');
    });
  });

  it('removes a required variable', () => {
    cy.getTestModules().then(({ store }) => {
      const id = store.addRequiredVariable('toRemove');
      store.removeRequiredVariable(id);
      expect(store.getState().requiredVariables).to.have.length(0);
    });
  });

  it('removes only the targeted variable', () => {
    cy.getTestModules().then(({ store }) => {
      const id1 = store.addRequiredVariable('keep');
      const id2 = store.addRequiredVariable('remove');
      store.removeRequiredVariable(id2);
      expect(store.getState().requiredVariables).to.have.length(1);
      expect(store.getState().requiredVariables[0].name).to.equal('keep');
    });
  });

  it('adds multiple variables in order', () => {
    cy.getTestModules().then(({ store }) => {
      store.addRequiredVariable('a');
      store.addRequiredVariable('b');
      store.addRequiredVariable('c');
      expect(store.getState().requiredVariables).to.have.length(3);
      expect(store.getState().requiredVariables[0].name).to.equal('a');
      expect(store.getState().requiredVariables[2].name).to.equal('c');
    });
  });
});

describe('Store — computed variables', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('adds a computed variable', () => {
    cy.getTestModules().then(({ store }) => {
      const id = store.addComputedVariable('cv', '${base}/path');
      expect(id).to.be.ok;
      const cv = store.getState().computedVariables[0];
      expect(cv.name).to.equal('cv');
      expect(cv.expression).to.equal('${base}/path');
    });
  });

  it('updates a computed variable expression', () => {
    cy.getTestModules().then(({ store }) => {
      const id = store.addComputedVariable('cv', 'old');
      store.updateComputedVariable(id, { expression: 'new' });
      expect(store.getState().computedVariables[0].expression).to.equal('new');
    });
  });

  it('updates computed variable name without changing expression', () => {
    cy.getTestModules().then(({ store }) => {
      const id = store.addComputedVariable('cv', 'expr');
      store.updateComputedVariable(id, { name: 'newName' });
      expect(store.getState().computedVariables[0].name).to.equal('newName');
      expect(store.getState().computedVariables[0].expression).to.equal('expr');
    });
  });

  it('removes a computed variable', () => {
    cy.getTestModules().then(({ store }) => {
      const id = store.addComputedVariable('cv', 'expr');
      store.removeComputedVariable(id);
      expect(store.getState().computedVariables).to.have.length(0);
    });
  });

  it('adds with default empty values', () => {
    cy.getTestModules().then(({ store }) => {
      store.addComputedVariable();
      expect(store.getState().computedVariables[0].name).to.equal('');
      expect(store.getState().computedVariables[0].expression).to.equal('');
    });
  });
});

describe('Store — addItem', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('appends item to end by default', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'a', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addItem({ id: 'b', type: 'CreateFile', args: { path: 'b' }, collapsed: false });
      expect(store.getState().items[1].id).to.equal('b');
    });
  });

  it('inserts item at specific index', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'a', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addItem({ id: 'c', type: 'CreateFile', args: { path: 'c' }, collapsed: false });
      store.addItem({ id: 'b', type: 'CreateFile', args: { path: 'b' }, collapsed: false }, 1);
      expect(store.getState().items[1].id).to.equal('b');
    });
  });

  it('appends when index is -1', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'a', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addItem({ id: 'b', type: 'CreateFile', args: { path: 'b' }, collapsed: false }, -1);
      expect(store.getState().items[1].id).to.equal('b');
    });
  });

  it('appends when index exceeds length', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'a', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addItem({ id: 'b', type: 'CreateFile', args: { path: 'b' }, collapsed: false }, 999);
      expect(store.getState().items[1].id).to.equal('b');
    });
  });
});

describe('Store — updateItemArgs', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('updates item args (shallow merge)', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'i1', type: 'ReplaceFile', args: { targetPath: 'old', templatePath: 't.tpl' }, collapsed: false });
      store.updateItemArgs('i1', { targetPath: 'new' });
      expect(store.getState().items[0].args.targetPath).to.equal('new');
      expect(store.getState().items[0].args.templatePath).to.equal('t.tpl');
    });
  });
});

describe('Store — updateSectionTitle', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('updates section title', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 's1', type: '__SECTION__', title: 'Old' });
      store.updateSectionTitle('s1', 'New');
      expect(store.getState().items[0].title).to.equal('New');
    });
  });

  it('does not update non-section items', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'i1', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.updateSectionTitle('i1', 'Nope');
      expect(store.getState().items[0].title).to.not.be.ok;
    });
  });
});

describe('Store — updateRawText', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('updates raw text', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'r1', type: '__RAW__', text: 'old' });
      store.updateRawText('r1', 'new');
      expect(store.getState().items[0].text).to.equal('new');
    });
  });
});

describe('Store — removeItem', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('removes an item', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'i1', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.removeItem('i1');
      expect(store.getState().items).to.have.length(0);
    });
  });

  it('clears selectedItemId if removed item was selected', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'i1', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.selectItem('i1');
      expect(store.getState().selectedItemId).to.equal('i1');
      store.removeItem('i1');
      expect(store.getState().selectedItemId).to.equal(null);
    });
  });

  it('preserves selectedItemId if different item removed', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'i1', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addItem({ id: 'i2', type: 'CreateFile', args: { path: 'b' }, collapsed: false });
      store.selectItem('i1');
      store.removeItem('i2');
      expect(store.getState().selectedItemId).to.equal('i1');
    });
  });
});

describe('Store — toggleItemCollapsed', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('toggles collapsed from false to true', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'i1', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.toggleItemCollapsed('i1');
      expect(store.getState().items[0].collapsed).to.equal(true);
    });
  });

  it('toggles back to false', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'i1', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.toggleItemCollapsed('i1');
      store.toggleItemCollapsed('i1');
      expect(store.getState().items[0].collapsed).to.equal(false);
    });
  });
});

describe('Store — duplicateItem', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('creates a copy after the original', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'orig', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.duplicateItem('orig');
      expect(store.getState().items).to.have.length(2);
      expect(store.getState().items[1].args.path).to.equal('a');
    });
  });

  it('assigns a new id to the duplicate', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'orig', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.duplicateItem('orig');
      expect(store.getState().items[1].id).to.not.equal('orig');
    });
  });

  it('silently does nothing for nonexistent id', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'orig', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.duplicateItem('nonexistent');
      expect(store.getState().items).to.have.length(1);
    });
  });

  it('duplicates in the middle of the list', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'a', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addItem({ id: 'b', type: 'CreateFile', args: { path: 'b' }, collapsed: false });
      store.addItem({ id: 'c', type: 'CreateFile', args: { path: 'c' }, collapsed: false });
      store.duplicateItem('b');
      expect(store.getState().items).to.have.length(4);
      expect(store.getState().items[2].args.path).to.equal('b');
      expect(store.getState().items[3].id).to.equal('c');
    });
  });
});

describe('Store — moveItem', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('moves item forward', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'a', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addItem({ id: 'b', type: 'CreateFile', args: { path: 'b' }, collapsed: false });
      store.addItem({ id: 'c', type: 'CreateFile', args: { path: 'c' }, collapsed: false });
      store.moveItem(2, 0);
      expect(store.getState().items[0].id).to.equal('c');
      expect(store.getState().items[1].id).to.equal('a');
    });
  });

  it('moves item backward', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'a', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addItem({ id: 'b', type: 'CreateFile', args: { path: 'b' }, collapsed: false });
      store.addItem({ id: 'c', type: 'CreateFile', args: { path: 'c' }, collapsed: false });
      store.moveItem(0, 2);
      expect(store.getState().items[0].id).to.equal('b');
      expect(store.getState().items[2].id).to.equal('a');
    });
  });
});

describe('Store — selectItem', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('sets selectedItemId', () => {
    cy.getTestModules().then(({ store }) => {
      store.selectItem('i1');
      expect(store.getState().selectedItemId).to.equal('i1');
    });
  });

  it('can deselect with null', () => {
    cy.getTestModules().then(({ store }) => {
      store.selectItem('i1');
      store.selectItem(null);
      expect(store.getState().selectedItemId).to.equal(null);
    });
  });

  it('does not push to undo history (skipHistory)', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('base');
      store.selectItem('i1');
      store.undo();
      expect(store.getState().taskName).to.equal('');
    });
  });
});

describe('Store — setValidationErrors', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('sets validation errors', () => {
    cy.getTestModules().then(({ store }) => {
      store.setValidationErrors([{ message: 'err', severity: 'error' }]);
      expect(store.getState().validationErrors).to.have.length(1);
    });
  });

  it('skips update if errors are identical (dedup)', () => {
    cy.getTestModules().then(({ store }) => {
      let notifyCount = 0;
      const unsub = store.subscribe(() => { notifyCount++; });
      store.setValidationErrors([{ message: 'err', severity: 'error' }]);
      const count1 = notifyCount;
      store.setValidationErrors([{ message: 'err', severity: 'error' }]);
      expect(notifyCount, 'Should not re-notify for identical errors').to.equal(count1);
      unsub();
    });
  });

  it('does not push to undo history', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('base');
      store.setValidationErrors([{ message: 'err', severity: 'error' }]);
      store.undo();
      expect(store.getState().taskName).to.equal('');
    });
  });
});

describe('Store — undo/redo basics', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('undoes last change', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('first');
      store.setTaskName('second');
      store.undo();
      expect(store.getState().taskName).to.equal('first');
    });
  });

  it('redoes undone change', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('first');
      store.setTaskName('second');
      store.undo();
      store.redo();
      expect(store.getState().taskName).to.equal('second');
    });
  });

  it('undo does nothing when history is empty', () => {
    cy.getTestModules().then(({ store }) => {
      store.undo();
      expect(store.getState().taskName).to.equal('');
    });
  });

  it('redo does nothing when future is empty', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('x');
      store.redo();
      expect(store.getState().taskName).to.equal('x');
    });
  });

  it('new change clears redo stack', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('a');
      store.setTaskName('b');
      store.undo();
      store.setTaskName('c');
      store.redo();
      expect(store.getState().taskName).to.equal('c');
    });
  });
});

describe('Store — undo/redo multi-step', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('can undo multiple times', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('1');
      store.setTaskName('2');
      store.setTaskName('3');
      store.undo();
      store.undo();
      expect(store.getState().taskName).to.equal('1');
    });
  });

  it('can redo multiple times', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('1');
      store.setTaskName('2');
      store.setTaskName('3');
      store.undo();
      store.undo();
      store.redo();
      store.redo();
      expect(store.getState().taskName).to.equal('3');
    });
  });

  it('undo all the way to initial state', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('a');
      store.addRequiredVariable('v');
      store.undo();
      store.undo();
      expect(store.getState().taskName).to.equal('');
      expect(store.getState().requiredVariables).to.have.length(0);
    });
  });

  it('undo/redo preserves complex state', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'i1', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addRequiredVariable('v');
      store.undo();
      expect(store.getState().requiredVariables).to.have.length(0);
      expect(store.getState().items).to.have.length(1);
    });
  });
});

describe('Store — multi-tab basics', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('starts with one tab', () => {
    cy.getTestModules().then(({ store }) => {
      const tabs = store.getTabs();
      expect(tabs).to.have.length(1);
      expect(tabs[0].active).to.be.true;
    });
  });

  it('getTabs returns correct shape', () => {
    cy.getTestModules().then(({ store }) => {
      const tabs = store.getTabs();
      expect(tabs[0].id).to.be.ok;
      expect('name' in tabs[0]).to.be.true;
      expect('active' in tabs[0]).to.be.true;
      expect('dirty' in tabs[0]).to.be.true;
    });
  });

  it('initial tab name is Untitled', () => {
    cy.getTestModules().then(({ store }) => {
      const tabs = store.getTabs();
      expect(tabs[0].name).to.equal('Untitled');
    });
  });

  it('tab name updates when task name changes', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('hello');
      const tabs = store.getTabs();
      expect(tabs[0].name).to.equal('hello');
    });
  });

  it('tab is dirty when history is non-empty', () => {
    cy.getTestModules().then(({ store }) => {
      expect(store.getTabs()[0].dirty).to.equal(false);
      store.setTaskName('x');
      expect(store.getTabs()[0].dirty).to.equal(true);
    });
  });
});

describe('Store — addTab', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('adds a new tab and switches to it', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('tab1');
      store.addTab('tab2');
      expect(store.getState().taskName).to.equal('tab2');
      expect(store.getTabs()).to.have.length(2);
    });
  });

  it('new tab has empty state', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('old');
      store.addRequiredVariable('v');
      store.addTab();
      expect(store.getState().taskName).to.equal('');
      expect(store.getState().requiredVariables).to.have.length(0);
      expect(store.getState().items).to.have.length(0);
    });
  });

  it('returns new tab id', () => {
    cy.getTestModules().then(({ store }) => {
      const id = store.addTab('test');
      expect(id).to.be.ok;
      expect(store.getActiveTabId()).to.equal(id);
    });
  });
});

describe('Store — switchTab', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('switches between tabs preserving state', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('tab1');
      const firstTabId = store.getActiveTabId();
      store.addTab('tab2');
      store.setTaskName('tab2-name');
      store.switchTab(firstTabId);
      expect(store.getState().taskName).to.equal('tab1');
    });
  });

  it('does nothing when switching to active tab', () => {
    cy.getTestModules().then(({ store }) => {
      const id = store.getActiveTabId();
      store.switchTab(id);
      expect(store.getActiveTabId()).to.equal(id);
    });
  });

  it('does nothing for nonexistent tab id', () => {
    cy.getTestModules().then(({ store }) => {
      const id = store.getActiveTabId();
      store.switchTab('nonexistent-id');
      expect(store.getActiveTabId()).to.equal(id);
    });
  });
});

describe('Store — closeTab', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('closes a tab', () => {
    cy.getTestModules().then(({ store }) => {
      const tab2Id = store.addTab('tab2');
      store.closeTab(tab2Id);
      expect(store.getTabs()).to.have.length(1);
    });
  });

  it('cannot close the last tab', () => {
    cy.getTestModules().then(({ store }) => {
      const id = store.getActiveTabId();
      store.closeTab(id);
      expect(store.getTabs()).to.have.length(1);
    });
  });

  it('switches to another tab when closing active', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('tab1');
      const tab1Id = store.getActiveTabId();
      const tab2Id = store.addTab('tab2');
      store.switchTab(tab1Id);
      store.closeTab(tab1Id);
      expect(store.getActiveTabId()).to.equal(tab2Id);
    });
  });

  it('does not switch when closing non-active tab', () => {
    cy.getTestModules().then(({ store }) => {
      const tab1Id = store.getActiveTabId();
      const tab2Id = store.addTab('tab2');
      store.switchTab(tab1Id);
      store.closeTab(tab2Id);
      expect(store.getActiveTabId()).to.equal(tab1Id);
    });
  });
});

describe('Store — tab state isolation', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('each tab has independent state', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('A');
      store.addRequiredVariable('varA');
      const tabAId = store.getActiveTabId();

      store.addTab('B');
      store.addRequiredVariable('varB');

      expect(store.getState().requiredVariables).to.have.length(1);
      expect(store.getState().requiredVariables[0].name).to.equal('varB');

      store.switchTab(tabAId);
      expect(store.getState().requiredVariables).to.have.length(1);
      expect(store.getState().requiredVariables[0].name).to.equal('varA');
    });
  });

  it('each tab has independent undo/redo', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('a');
      store.setTaskName('b');
      const tab1Id = store.getActiveTabId();

      store.addTab('');
      store.setTaskName('x');
      store.setTaskName('y');
      store.undo();
      expect(store.getState().taskName).to.equal('x');

      store.switchTab(tab1Id);
      expect(store.getState().taskName).to.equal('b');
      store.undo();
      expect(store.getState().taskName).to.equal('a');
    });
  });

  it('items are independent across tabs', () => {
    cy.getTestModules().then(({ store }) => {
      store.addItem({ id: 'i1', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      const tab1Id = store.getActiveTabId();

      store.addTab('tab2');
      expect(store.getState().items).to.have.length(0);

      store.switchTab(tab1Id);
      expect(store.getState().items).to.have.length(1);
    });
  });
});

describe('Store — addTabWithState', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('creates tab with pre-populated state', () => {
    cy.getTestModules().then(({ store }) => {
      store.addTabWithState({
        taskName: 'imported',
        requiredVariables: [{ id: 'rv1', name: 'modName' }],
        computedVariables: [],
        items: [{ id: 'i1', type: 'CreateFile', args: { path: 'f.txt' }, collapsed: false }],
      });
      expect(store.getState().taskName).to.equal('imported');
      expect(store.getState().requiredVariables).to.have.length(1);
      expect(store.getState().items).to.have.length(1);
    });
  });

  it('new tab from state has clean undo history', () => {
    cy.getTestModules().then(({ store }) => {
      store.addTabWithState({ taskName: 'x', requiredVariables: [], computedVariables: [], items: [] });
      store.undo();
      expect(store.getState().taskName).to.equal('x');
    });
  });
});

describe('Store — tab listeners', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('notifies tab listeners on addTab', () => {
    cy.getTestModules().then(({ store }) => {
      let notified = false;
      const unsub = store.subscribeTabs(() => { notified = true; });
      store.addTab('new');
      expect(notified).to.be.true;
      unsub();
    });
  });

  it('notifies tab listeners on switchTab', () => {
    cy.getTestModules().then(({ store }) => {
      const tab1Id = store.getActiveTabId();
      store.addTab('tab2');

      let notified = false;
      const unsub = store.subscribeTabs(() => { notified = true; });
      store.switchTab(tab1Id);
      expect(notified).to.be.true;
      unsub();
    });
  });

  it('notifies tab listeners on closeTab', () => {
    cy.getTestModules().then(({ store }) => {
      const tab2Id = store.addTab('tab2');

      let notified = false;
      const unsub = store.subscribeTabs(() => { notified = true; });
      store.closeTab(tab2Id);
      expect(notified).to.be.true;
      unsub();
    });
  });

  it('unsubscribe stops notifications', () => {
    cy.getTestModules().then(({ store }) => {
      let count = 0;
      const unsub = store.subscribeTabs(() => { count++; });
      store.addTab('a');
      unsub();
      store.addTab('b');
      expect(count).to.equal(1);
    });
  });
});

describe('Store — loadState', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('replaces active tab state completely', () => {
    cy.getTestModules().then(({ store }) => {
      store.loadState({
        taskName: 'loaded',
        requiredVariables: [{ id: 'r1', name: 'x' }],
        computedVariables: [{ id: 'c1', name: 'y', expression: 'z' }],
        items: [],
      });
      expect(store.getState().taskName).to.equal('loaded');
      expect(store.getState().requiredVariables).to.have.length(1);
      expect(store.getState().computedVariables).to.have.length(1);
    });
  });

  it('clears undo history after load', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('before');
      store.loadState({ taskName: 'after', requiredVariables: [], computedVariables: [], items: [] });
      store.undo();
      expect(store.getState().taskName).to.equal('after');
    });
  });

  it('reset clears to initial state', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('something');
      store.addRequiredVariable('var1');
      store.addItem({ id: 'i', type: 'CreateFile', args: { path: 'f' }, collapsed: false });
      store.reset();
      expect(store.getState().taskName).to.equal('');
      expect(store.getState().requiredVariables).to.have.length(0);
      expect(store.getState().items).to.have.length(0);
    });
  });

  it('reset clears undo history', () => {
    cy.getTestModules().then(({ store }) => {
      store.setTaskName('a');
      store.setTaskName('b');
      store.reset();
      store.undo();
      expect(store.getState().taskName).to.equal('');
    });
  });
});

describe('Store — getAllVariables', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('includes required variables', () => {
    cy.getTestModules().then(({ store }) => {
      store.addRequiredVariable('req1');
      const vars = store.getAllVariables();
      expect(!!vars.find(v => v.name === 'req1' && v.source === 'required')).to.be.true;
    });
  });

  it('includes computed variables', () => {
    cy.getTestModules().then(({ store }) => {
      store.addComputedVariable('comp1', 'expr');
      const vars = store.getAllVariables();
      expect(!!vars.find(v => v.name === 'comp1' && v.source === 'computed')).to.be.true;
    });
  });

  it('includes default variables', () => {
    cy.getTestModules().then(({ store }) => {
      const vars = store.getAllVariables();
      expect(!!vars.find(v => v.name === 'templatesDir' && v.source === 'default')).to.be.true;
      expect(!!vars.find(v => v.name === 'tasksDir' && v.source === 'default')).to.be.true;
    });
  });

  it('skips variables with empty names', () => {
    cy.getTestModules().then(({ store }) => {
      store.addRequiredVariable('');
      const vars = store.getAllVariables();
      const empty = vars.find(v => v.name === '');
      expect(!!empty).to.be.false;
    });
  });

  it('computed variables include expression', () => {
    cy.getTestModules().then(({ store }) => {
      store.addComputedVariable('cv', 'myExpr');
      const vars = store.getAllVariables();
      const cv = vars.find(v => v.name === 'cv');
      expect(cv.expression).to.equal('myExpr');
    });
  });
});
