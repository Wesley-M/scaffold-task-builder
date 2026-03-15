// ─── Store Tests ─────────────────────────────────────────────────
// Tests the multi-tab reactive store.

import { describe, it, assert } from './framework.js';
import { store } from '../js/store.js';

function resetStore() {
  while (store.tabOrder.length > 1) {
    store.closeTab(store.tabOrder[store.tabOrder.length - 1]);
  }
  store.reset();
}

export default function storeTests() {

  // ═══════════════════════════════════════════════════════════════
  // BASIC STATE
  // ═══════════════════════════════════════════════════════════════

  describe('Store — initial state', () => {
    it('has empty task name', () => {
      resetStore();
      assert.equal(store.getState().taskName, '');
    });

    it('has empty required variables', () => {
      resetStore();
      assert.lengthOf(store.getState().requiredVariables, 0);
    });

    it('has empty computed variables', () => {
      resetStore();
      assert.lengthOf(store.getState().computedVariables, 0);
    });

    it('has empty items', () => {
      resetStore();
      assert.lengthOf(store.getState().items, 0);
    });

    it('has null selectedItemId', () => {
      resetStore();
      assert.equal(store.getState().selectedItemId, null);
    });

    it('has empty validationErrors', () => {
      resetStore();
      assert.lengthOf(store.getState().validationErrors, 0);
    });
  });

  describe('Store — setTaskName', () => {
    it('sets task name', () => {
      resetStore();
      store.setTaskName('myTask');
      assert.equal(store.getState().taskName, 'myTask');
    });

    it('overwrites previous task name', () => {
      resetStore();
      store.setTaskName('first');
      store.setTaskName('second');
      assert.equal(store.getState().taskName, 'second');
    });

    it('can set to empty string', () => {
      resetStore();
      store.setTaskName('something');
      store.setTaskName('');
      assert.equal(store.getState().taskName, '');
    });
  });

  describe('Store — subscribe', () => {
    it('notifies subscribers on state change', () => {
      resetStore();
      let notified = false;
      const unsub = store.subscribe(() => { notified = true; });
      store.setTaskName('test');
      assert.truthy(notified);
      unsub();
    });

    it('stops notifying after unsubscribe', () => {
      resetStore();
      let count = 0;
      const unsub = store.subscribe(() => { count++; });
      store.setTaskName('a');
      unsub();
      store.setTaskName('b');
      assert.equal(count, 1);
    });

    it('multiple subscribers all get notified', () => {
      resetStore();
      let c1 = 0, c2 = 0;
      const unsub1 = store.subscribe(() => { c1++; });
      const unsub2 = store.subscribe(() => { c2++; });
      store.setTaskName('x');
      assert.equal(c1, 1);
      assert.equal(c2, 1);
      unsub1();
      unsub2();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // REQUIRED VARIABLES
  // ═══════════════════════════════════════════════════════════════

  describe('Store — required variables', () => {
    it('adds a required variable', () => {
      resetStore();
      const id = store.addRequiredVariable('myVar');
      assert.truthy(id);
      assert.lengthOf(store.getState().requiredVariables, 1);
      assert.equal(store.getState().requiredVariables[0].name, 'myVar');
    });

    it('adds with default empty name', () => {
      resetStore();
      store.addRequiredVariable();
      assert.equal(store.getState().requiredVariables[0].name, '');
    });

    it('updates a required variable name', () => {
      resetStore();
      const id = store.addRequiredVariable('old');
      store.updateRequiredVariable(id, 'new');
      assert.equal(store.getState().requiredVariables[0].name, 'new');
    });

    it('removes a required variable', () => {
      resetStore();
      const id = store.addRequiredVariable('toRemove');
      store.removeRequiredVariable(id);
      assert.lengthOf(store.getState().requiredVariables, 0);
    });

    it('removes only the targeted variable', () => {
      resetStore();
      const id1 = store.addRequiredVariable('keep');
      const id2 = store.addRequiredVariable('remove');
      store.removeRequiredVariable(id2);
      assert.lengthOf(store.getState().requiredVariables, 1);
      assert.equal(store.getState().requiredVariables[0].name, 'keep');
    });

    it('adds multiple variables in order', () => {
      resetStore();
      store.addRequiredVariable('a');
      store.addRequiredVariable('b');
      store.addRequiredVariable('c');
      assert.lengthOf(store.getState().requiredVariables, 3);
      assert.equal(store.getState().requiredVariables[0].name, 'a');
      assert.equal(store.getState().requiredVariables[2].name, 'c');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // COMPUTED VARIABLES
  // ═══════════════════════════════════════════════════════════════

  describe('Store — computed variables', () => {
    it('adds a computed variable', () => {
      resetStore();
      const id = store.addComputedVariable('cv', '${base}/path');
      assert.truthy(id);
      const cv = store.getState().computedVariables[0];
      assert.equal(cv.name, 'cv');
      assert.equal(cv.expression, '${base}/path');
    });

    it('updates a computed variable expression', () => {
      resetStore();
      const id = store.addComputedVariable('cv', 'old');
      store.updateComputedVariable(id, { expression: 'new' });
      assert.equal(store.getState().computedVariables[0].expression, 'new');
    });

    it('updates computed variable name without changing expression', () => {
      resetStore();
      const id = store.addComputedVariable('cv', 'expr');
      store.updateComputedVariable(id, { name: 'newName' });
      assert.equal(store.getState().computedVariables[0].name, 'newName');
      assert.equal(store.getState().computedVariables[0].expression, 'expr');
    });

    it('removes a computed variable', () => {
      resetStore();
      const id = store.addComputedVariable('cv', 'expr');
      store.removeComputedVariable(id);
      assert.lengthOf(store.getState().computedVariables, 0);
    });

    it('adds with default empty values', () => {
      resetStore();
      store.addComputedVariable();
      assert.equal(store.getState().computedVariables[0].name, '');
      assert.equal(store.getState().computedVariables[0].expression, '');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ITEMS
  // ═══════════════════════════════════════════════════════════════

  describe('Store — addItem', () => {
    it('appends item to end by default', () => {
      resetStore();
      store.addItem({ id: 'a', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addItem({ id: 'b', type: 'CreateFile', args: { path: 'b' }, collapsed: false });
      assert.equal(store.getState().items[1].id, 'b');
    });

    it('inserts item at specific index', () => {
      resetStore();
      store.addItem({ id: 'a', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addItem({ id: 'c', type: 'CreateFile', args: { path: 'c' }, collapsed: false });
      store.addItem({ id: 'b', type: 'CreateFile', args: { path: 'b' }, collapsed: false }, 1);
      assert.equal(store.getState().items[1].id, 'b');
    });

    it('appends when index is -1', () => {
      resetStore();
      store.addItem({ id: 'a', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addItem({ id: 'b', type: 'CreateFile', args: { path: 'b' }, collapsed: false }, -1);
      assert.equal(store.getState().items[1].id, 'b');
    });

    it('appends when index exceeds length', () => {
      resetStore();
      store.addItem({ id: 'a', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addItem({ id: 'b', type: 'CreateFile', args: { path: 'b' }, collapsed: false }, 999);
      assert.equal(store.getState().items[1].id, 'b');
    });
  });

  describe('Store — updateItemArgs', () => {
    it('updates item args (shallow merge)', () => {
      resetStore();
      store.addItem({ id: 'i1', type: 'ReplaceFile', args: { targetPath: 'old', templatePath: 't.tpl' }, collapsed: false });
      store.updateItemArgs('i1', { targetPath: 'new' });
      assert.equal(store.getState().items[0].args.targetPath, 'new');
      assert.equal(store.getState().items[0].args.templatePath, 't.tpl');
    });
  });

  describe('Store — updateSectionTitle', () => {
    it('updates section title', () => {
      resetStore();
      store.addItem({ id: 's1', type: '__SECTION__', title: 'Old' });
      store.updateSectionTitle('s1', 'New');
      assert.equal(store.getState().items[0].title, 'New');
    });

    it('does not update non-section items', () => {
      resetStore();
      store.addItem({ id: 'i1', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.updateSectionTitle('i1', 'Nope');
      assert.falsy(store.getState().items[0].title);
    });
  });

  describe('Store — updateRawText', () => {
    it('updates raw text', () => {
      resetStore();
      store.addItem({ id: 'r1', type: '__RAW__', text: 'old' });
      store.updateRawText('r1', 'new');
      assert.equal(store.getState().items[0].text, 'new');
    });
  });

  describe('Store — removeItem', () => {
    it('removes an item', () => {
      resetStore();
      store.addItem({ id: 'i1', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.removeItem('i1');
      assert.lengthOf(store.getState().items, 0);
    });

    it('clears selectedItemId if removed item was selected', () => {
      resetStore();
      store.addItem({ id: 'i1', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.selectItem('i1');
      assert.equal(store.getState().selectedItemId, 'i1');
      store.removeItem('i1');
      assert.equal(store.getState().selectedItemId, null);
    });

    it('preserves selectedItemId if different item removed', () => {
      resetStore();
      store.addItem({ id: 'i1', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addItem({ id: 'i2', type: 'CreateFile', args: { path: 'b' }, collapsed: false });
      store.selectItem('i1');
      store.removeItem('i2');
      assert.equal(store.getState().selectedItemId, 'i1');
    });
  });

  describe('Store — toggleItemCollapsed', () => {
    it('toggles collapsed from false to true', () => {
      resetStore();
      store.addItem({ id: 'i1', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.toggleItemCollapsed('i1');
      assert.equal(store.getState().items[0].collapsed, true);
    });

    it('toggles back to false', () => {
      resetStore();
      store.addItem({ id: 'i1', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.toggleItemCollapsed('i1');
      store.toggleItemCollapsed('i1');
      assert.equal(store.getState().items[0].collapsed, false);
    });
  });

  describe('Store — duplicateItem', () => {
    it('creates a copy after the original', () => {
      resetStore();
      store.addItem({ id: 'orig', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.duplicateItem('orig');
      assert.lengthOf(store.getState().items, 2);
      assert.equal(store.getState().items[1].args.path, 'a');
    });

    it('assigns a new id to the duplicate', () => {
      resetStore();
      store.addItem({ id: 'orig', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.duplicateItem('orig');
      assert(store.getState().items[1].id !== 'orig', 'Should have new id');
    });

    it('silently does nothing for nonexistent id', () => {
      resetStore();
      store.addItem({ id: 'orig', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.duplicateItem('nonexistent');
      assert.lengthOf(store.getState().items, 1);
    });

    it('duplicates in the middle of the list', () => {
      resetStore();
      store.addItem({ id: 'a', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addItem({ id: 'b', type: 'CreateFile', args: { path: 'b' }, collapsed: false });
      store.addItem({ id: 'c', type: 'CreateFile', args: { path: 'c' }, collapsed: false });
      store.duplicateItem('b');
      assert.lengthOf(store.getState().items, 4);
      assert.equal(store.getState().items[2].args.path, 'b');
      assert.equal(store.getState().items[3].id, 'c');
    });
  });

  describe('Store — moveItem', () => {
    it('moves item forward', () => {
      resetStore();
      store.addItem({ id: 'a', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addItem({ id: 'b', type: 'CreateFile', args: { path: 'b' }, collapsed: false });
      store.addItem({ id: 'c', type: 'CreateFile', args: { path: 'c' }, collapsed: false });
      store.moveItem(2, 0);
      assert.equal(store.getState().items[0].id, 'c');
      assert.equal(store.getState().items[1].id, 'a');
    });

    it('moves item backward', () => {
      resetStore();
      store.addItem({ id: 'a', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addItem({ id: 'b', type: 'CreateFile', args: { path: 'b' }, collapsed: false });
      store.addItem({ id: 'c', type: 'CreateFile', args: { path: 'c' }, collapsed: false });
      store.moveItem(0, 2);
      assert.equal(store.getState().items[0].id, 'b');
      assert.equal(store.getState().items[2].id, 'a');
    });
  });

  describe('Store — selectItem', () => {
    it('sets selectedItemId', () => {
      resetStore();
      store.selectItem('i1');
      assert.equal(store.getState().selectedItemId, 'i1');
    });

    it('can deselect with null', () => {
      resetStore();
      store.selectItem('i1');
      store.selectItem(null);
      assert.equal(store.getState().selectedItemId, null);
    });

    it('does not push to undo history (skipHistory)', () => {
      resetStore();
      store.setTaskName('base');
      store.selectItem('i1');
      store.undo();
      // Should undo the task name, not the select
      assert.equal(store.getState().taskName, '');
    });
  });

  describe('Store — setValidationErrors', () => {
    it('sets validation errors', () => {
      resetStore();
      store.setValidationErrors([{ message: 'err', severity: 'error' }]);
      assert.lengthOf(store.getState().validationErrors, 1);
    });

    it('skips update if errors are identical (dedup)', () => {
      resetStore();
      let notifyCount = 0;
      const unsub = store.subscribe(() => { notifyCount++; });
      store.setValidationErrors([{ message: 'err', severity: 'error' }]);
      const count1 = notifyCount;
      store.setValidationErrors([{ message: 'err', severity: 'error' }]);
      assert.equal(notifyCount, count1, 'Should not re-notify for identical errors');
      unsub();
    });

    it('does not push to undo history', () => {
      resetStore();
      store.setTaskName('base');
      store.setValidationErrors([{ message: 'err', severity: 'error' }]);
      store.undo();
      assert.equal(store.getState().taskName, '');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // UNDO / REDO
  // ═══════════════════════════════════════════════════════════════

  describe('Store — undo/redo basics', () => {
    it('undoes last change', () => {
      resetStore();
      store.setTaskName('first');
      store.setTaskName('second');
      store.undo();
      assert.equal(store.getState().taskName, 'first');
    });

    it('redoes undone change', () => {
      resetStore();
      store.setTaskName('first');
      store.setTaskName('second');
      store.undo();
      store.redo();
      assert.equal(store.getState().taskName, 'second');
    });

    it('undo does nothing when history is empty', () => {
      resetStore();
      store.undo();
      assert.equal(store.getState().taskName, '');
    });

    it('redo does nothing when future is empty', () => {
      resetStore();
      store.setTaskName('x');
      store.redo();
      assert.equal(store.getState().taskName, 'x');
    });

    it('new change clears redo stack', () => {
      resetStore();
      store.setTaskName('a');
      store.setTaskName('b');
      store.undo();
      store.setTaskName('c');
      store.redo();
      assert.equal(store.getState().taskName, 'c');
    });
  });

  describe('Store — undo/redo multi-step', () => {
    it('can undo multiple times', () => {
      resetStore();
      store.setTaskName('1');
      store.setTaskName('2');
      store.setTaskName('3');
      store.undo();
      store.undo();
      assert.equal(store.getState().taskName, '1');
    });

    it('can redo multiple times', () => {
      resetStore();
      store.setTaskName('1');
      store.setTaskName('2');
      store.setTaskName('3');
      store.undo();
      store.undo();
      store.redo();
      store.redo();
      assert.equal(store.getState().taskName, '3');
    });

    it('undo all the way to initial state', () => {
      resetStore();
      store.setTaskName('a');
      store.addRequiredVariable('v');
      store.undo();
      store.undo();
      assert.equal(store.getState().taskName, '');
      assert.lengthOf(store.getState().requiredVariables, 0);
    });

    it('undo/redo preserves complex state', () => {
      resetStore();
      store.addItem({ id: 'i1', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      store.addRequiredVariable('v');
      store.undo();
      assert.lengthOf(store.getState().requiredVariables, 0);
      assert.lengthOf(store.getState().items, 1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // MULTI-TAB
  // ═══════════════════════════════════════════════════════════════

  describe('Store — multi-tab basics', () => {
    it('starts with one tab', () => {
      resetStore();
      const tabs = store.getTabs();
      assert.lengthOf(tabs, 1);
      assert.truthy(tabs[0].active);
    });

    it('getTabs returns correct shape', () => {
      resetStore();
      const tabs = store.getTabs();
      assert.truthy(tabs[0].id);
      assert.truthy('name' in tabs[0]);
      assert.truthy('active' in tabs[0]);
      assert.truthy('dirty' in tabs[0]);
    });

    it('initial tab name is Untitled', () => {
      resetStore();
      const tabs = store.getTabs();
      assert.equal(tabs[0].name, 'Untitled');
    });

    it('tab name updates when task name changes', () => {
      resetStore();
      store.setTaskName('hello');
      const tabs = store.getTabs();
      assert.equal(tabs[0].name, 'hello');
    });

    it('tab is dirty when history is non-empty', () => {
      resetStore();
      assert.equal(store.getTabs()[0].dirty, false);
      store.setTaskName('x');
      assert.equal(store.getTabs()[0].dirty, true);
    });
  });

  describe('Store — addTab', () => {
    it('adds a new tab and switches to it', () => {
      resetStore();
      store.setTaskName('tab1');
      store.addTab('tab2');
      assert.equal(store.getState().taskName, 'tab2');
      assert.lengthOf(store.getTabs(), 2);
    });

    it('new tab has empty state', () => {
      resetStore();
      store.setTaskName('old');
      store.addRequiredVariable('v');
      store.addTab();
      assert.equal(store.getState().taskName, '');
      assert.lengthOf(store.getState().requiredVariables, 0);
      assert.lengthOf(store.getState().items, 0);
    });

    it('returns new tab id', () => {
      resetStore();
      const id = store.addTab('test');
      assert.truthy(id);
      assert.equal(store.getActiveTabId(), id);
    });
  });

  describe('Store — switchTab', () => {
    it('switches between tabs preserving state', () => {
      resetStore();
      store.setTaskName('tab1');
      const firstTabId = store.getActiveTabId();
      store.addTab('tab2');
      store.setTaskName('tab2-name');
      store.switchTab(firstTabId);
      assert.equal(store.getState().taskName, 'tab1');
    });

    it('does nothing when switching to active tab', () => {
      resetStore();
      const id = store.getActiveTabId();
      store.switchTab(id);
      assert.equal(store.getActiveTabId(), id);
    });

    it('does nothing for nonexistent tab id', () => {
      resetStore();
      const id = store.getActiveTabId();
      store.switchTab('nonexistent-id');
      assert.equal(store.getActiveTabId(), id);
    });
  });

  describe('Store — closeTab', () => {
    it('closes a tab', () => {
      resetStore();
      const tab2Id = store.addTab('tab2');
      store.closeTab(tab2Id);
      assert.lengthOf(store.getTabs(), 1);
    });

    it('cannot close the last tab', () => {
      resetStore();
      const id = store.getActiveTabId();
      store.closeTab(id);
      assert.lengthOf(store.getTabs(), 1);
    });

    it('switches to another tab when closing active', () => {
      resetStore();
      store.setTaskName('tab1');
      const tab1Id = store.getActiveTabId();
      const tab2Id = store.addTab('tab2');
      store.switchTab(tab1Id);
      store.closeTab(tab1Id);
      assert.equal(store.getActiveTabId(), tab2Id);
    });

    it('does not switch when closing non-active tab', () => {
      resetStore();
      const tab1Id = store.getActiveTabId();
      const tab2Id = store.addTab('tab2');
      store.switchTab(tab1Id);
      store.closeTab(tab2Id);
      assert.equal(store.getActiveTabId(), tab1Id);
    });
  });

  describe('Store — tab state isolation', () => {
    it('each tab has independent state', () => {
      resetStore();
      store.setTaskName('A');
      store.addRequiredVariable('varA');
      const tabAId = store.getActiveTabId();

      store.addTab('B');
      store.addRequiredVariable('varB');

      assert.lengthOf(store.getState().requiredVariables, 1);
      assert.equal(store.getState().requiredVariables[0].name, 'varB');

      store.switchTab(tabAId);
      assert.lengthOf(store.getState().requiredVariables, 1);
      assert.equal(store.getState().requiredVariables[0].name, 'varA');
    });

    it('each tab has independent undo/redo', () => {
      resetStore();
      store.setTaskName('a');
      store.setTaskName('b');
      const tab1Id = store.getActiveTabId();

      store.addTab('');
      store.setTaskName('x');
      store.setTaskName('y');
      store.undo();
      assert.equal(store.getState().taskName, 'x');

      store.switchTab(tab1Id);
      assert.equal(store.getState().taskName, 'b');
      store.undo();
      assert.equal(store.getState().taskName, 'a');
    });

    it('items are independent across tabs', () => {
      resetStore();
      store.addItem({ id: 'i1', type: 'CreateFile', args: { path: 'a' }, collapsed: false });
      const tab1Id = store.getActiveTabId();

      store.addTab('tab2');
      assert.lengthOf(store.getState().items, 0);

      store.switchTab(tab1Id);
      assert.lengthOf(store.getState().items, 1);
    });
  });

  describe('Store — addTabWithState', () => {
    it('creates tab with pre-populated state', () => {
      resetStore();
      store.addTabWithState({
        taskName: 'imported',
        requiredVariables: [{ id: 'rv1', name: 'modName' }],
        computedVariables: [],
        items: [{ id: 'i1', type: 'CreateFile', args: { path: 'f.txt' }, collapsed: false }],
      });
      assert.equal(store.getState().taskName, 'imported');
      assert.lengthOf(store.getState().requiredVariables, 1);
      assert.lengthOf(store.getState().items, 1);
    });

    it('new tab from state has clean undo history', () => {
      resetStore();
      store.addTabWithState({ taskName: 'x', requiredVariables: [], computedVariables: [], items: [] });
      store.undo(); // Should be a no-op
      assert.equal(store.getState().taskName, 'x');
    });
  });

  describe('Store — tab listeners', () => {
    it('notifies tab listeners on addTab', () => {
      resetStore();
      let notified = false;
      const unsub = store.subscribeTabs(() => { notified = true; });
      store.addTab('new');
      assert.truthy(notified);
      unsub();
    });

    it('notifies tab listeners on switchTab', () => {
      resetStore();
      const tab1Id = store.getActiveTabId();
      store.addTab('tab2');

      let notified = false;
      const unsub = store.subscribeTabs(() => { notified = true; });
      store.switchTab(tab1Id);
      assert.truthy(notified);
      unsub();
    });

    it('notifies tab listeners on closeTab', () => {
      resetStore();
      const tab2Id = store.addTab('tab2');

      let notified = false;
      const unsub = store.subscribeTabs(() => { notified = true; });
      store.closeTab(tab2Id);
      assert.truthy(notified);
      unsub();
    });

    it('unsubscribe stops notifications', () => {
      resetStore();
      let count = 0;
      const unsub = store.subscribeTabs(() => { count++; });
      store.addTab('a');
      unsub();
      store.addTab('b');
      assert.equal(count, 1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // LOAD / RESET
  // ═══════════════════════════════════════════════════════════════

  describe('Store — loadState', () => {
    it('replaces active tab state completely', () => {
      resetStore();
      store.loadState({
        taskName: 'loaded',
        requiredVariables: [{ id: 'r1', name: 'x' }],
        computedVariables: [{ id: 'c1', name: 'y', expression: 'z' }],
        items: [],
      });
      assert.equal(store.getState().taskName, 'loaded');
      assert.lengthOf(store.getState().requiredVariables, 1);
      assert.lengthOf(store.getState().computedVariables, 1);
    });

    it('clears undo history after load', () => {
      resetStore();
      store.setTaskName('before');
      store.loadState({ taskName: 'after', requiredVariables: [], computedVariables: [], items: [] });
      store.undo(); // no-op
      assert.equal(store.getState().taskName, 'after');
    });

    it('reset clears to initial state', () => {
      resetStore();
      store.setTaskName('something');
      store.addRequiredVariable('var1');
      store.addItem({ id: 'i', type: 'CreateFile', args: { path: 'f' }, collapsed: false });
      store.reset();
      assert.equal(store.getState().taskName, '');
      assert.lengthOf(store.getState().requiredVariables, 0);
      assert.lengthOf(store.getState().items, 0);
    });

    it('reset clears undo history', () => {
      resetStore();
      store.setTaskName('a');
      store.setTaskName('b');
      store.reset();
      store.undo(); // no-op
      assert.equal(store.getState().taskName, '');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getAllVariables
  // ═══════════════════════════════════════════════════════════════

  describe('Store — getAllVariables', () => {
    it('includes required variables', () => {
      resetStore();
      store.addRequiredVariable('req1');
      const vars = store.getAllVariables();
      assert.truthy(vars.find(v => v.name === 'req1' && v.source === 'required'));
    });

    it('includes computed variables', () => {
      resetStore();
      store.addComputedVariable('comp1', 'expr');
      const vars = store.getAllVariables();
      assert.truthy(vars.find(v => v.name === 'comp1' && v.source === 'computed'));
    });

    it('includes default variables', () => {
      resetStore();
      const vars = store.getAllVariables();
      assert.truthy(vars.find(v => v.name === 'templatesDir' && v.source === 'default'));
      assert.truthy(vars.find(v => v.name === 'tasksDir' && v.source === 'default'));
    });

    it('skips variables with empty names', () => {
      resetStore();
      store.addRequiredVariable('');
      const vars = store.getAllVariables();
      const empty = vars.find(v => v.name === '');
      assert.falsy(empty);
    });

    it('computed variables include expression', () => {
      resetStore();
      store.addComputedVariable('cv', 'myExpr');
      const vars = store.getAllVariables();
      const cv = vars.find(v => v.name === 'cv');
      assert.equal(cv.expression, 'myExpr');
    });
  });
}
