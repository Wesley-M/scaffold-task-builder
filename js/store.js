// ─── Reactive Store ──────────────────────────────────────────────
// Minimal pub/sub state management with multi-tab support.
// All existing API (getState, setState, undo, redo, etc.) operates
// on the *active tab*. Tab management is layered on top.

import { DEFAULT_VARIABLES } from './types.js';

const AUTOSAVE_KEY = 'scaffold-ui-tabs';
const LEGACY_KEY = 'scaffold-ui-state';

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function genId() {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const INITIAL_TAB_STATE = {
  taskName: '',
  requiredVariables: [],   // [{ id, name }]
  computedVariables: [],   // [{ id, name, expression }]
  items: [],               // [{ id, type, args, collapsed } | { id, type: '__SECTION__', title }]
  selectedItemId: null,
  validationErrors: [],    // [{ itemId?, field?, message, severity }]
};

class Store {
  constructor() {
    // Tab storage: Map<tabId, { state, history, future }>
    this.tabs = new Map();
    this.tabOrder = [];          // ordered tab IDs
    this.activeTabId = null;

    this.listeners = new Set();
    this.tabListeners = new Set(); // notified on tab add/remove/switch/rename
    this.maxHistory = 80;

    // Bootstrap with one empty tab
    this._createTabInternal('Untitled', deepClone(INITIAL_TAB_STATE));
  }

  // ═══════════════════════════════════════════════════════════════
  // TAB MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /** Get metadata for all tabs in order. */
  getTabs() {
    return this.tabOrder.map(id => {
      const tab = this.tabs.get(id);
      return {
        id,
        name: tab.state.taskName || 'Untitled',
        active: id === this.activeTabId,
        dirty: tab.history.length > 0,
        filePath: tab.filePath || null,
      };
    });
  }

  getActiveTabId() { return this.activeTabId; }

  /** Get the file path associated with the active tab (null if none). */
  getActiveFilePath() {
    const tab = this._active();
    return tab?.filePath || null;
  }

  /** Associate a file path with the active tab. */
  setActiveFilePath(filePath) {
    const tab = this._active();
    if (tab) tab.filePath = filePath;
    this._notifyTabs();
  }

  /** Create a new empty tab and switch to it. */
  addTab(name = '') {
    const state = deepClone(INITIAL_TAB_STATE);
    state.taskName = name;
    const id = this._createTabInternal(name, state);
    this._switchToTab(id);
    return id;
  }

  /** Create a tab pre-populated with a parsed state (for import or sample). */
  addTabWithState(state, filePath = null) {
    const id = this._createTabInternal(state.taskName || 'Untitled', {
      ...deepClone(INITIAL_TAB_STATE),
      ...state,
      validationErrors: [],
      selectedItemId: null,
    });
    if (filePath) {
      this.tabs.get(id).filePath = filePath;
    }
    this._switchToTab(id);
    return id;
  }

  switchTab(tabId) {
    if (tabId === this.activeTabId) return;
    if (!this.tabs.has(tabId)) return;
    this._switchToTab(tabId);
  }

  closeTab(tabId) {
    if (this.tabs.size <= 1) return; // always keep at least one tab
    this.tabs.delete(tabId);
    this.tabOrder = this.tabOrder.filter(id => id !== tabId);
    if (this.activeTabId === tabId) {
      this._switchToTab(this.tabOrder[Math.max(0, this.tabOrder.length - 1)]);
    } else {
      this._notifyTabs();
      this._scheduleSave();
    }
  }

  /** Close all tabs and reset to a single empty tab. */
  closeAllTabs() {
    this.tabs.clear();
    this.tabOrder = [];
    this.activeTabId = null;
    this._createTabInternal('Untitled', deepClone(INITIAL_TAB_STATE));
    this._switchToTab(this.tabOrder[0]);
  }

  _createTabInternal(name, state) {
    const id = genId();
    this.tabs.set(id, { state, history: [], future: [] });
    this.tabOrder.push(id);
    if (!this.activeTabId) this.activeTabId = id;
    return id;
  }

  _switchToTab(tabId) {
    this.activeTabId = tabId;
    const tab = this.tabs.get(tabId);
    this._notifyTabs();
    // Notify state listeners so components re-render with new tab's state
    for (const fn of this.listeners) {
      try { fn(tab.state); } catch (e) { console.error('Store listener error:', e); }
    }
    this._scheduleSave();
  }

  subscribeTabs(fn) {
    this.tabListeners.add(fn);
    return () => this.tabListeners.delete(fn);
  }

  _notifyTabs() {
    const tabs = this.getTabs();
    for (const fn of this.tabListeners) {
      try { fn(tabs); } catch (e) { console.error('Tab listener error:', e); }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ACTIVE TAB STATE — all existing API proxies to active tab
  // ═══════════════════════════════════════════════════════════════

  _active() { return this.tabs.get(this.activeTabId); }

  get state() { return this._active().state; }
  set state(v) { this._active().state = v; }

  get history() { return this._active().history; }
  set history(v) { this._active().history = v; }

  get future() { return this._active().future; }
  set future(v) { this._active().future = v; }

  getState() {
    return this._active().state;
  }

  // ── Core setState with undo support ──
  setState(updater, { skipHistory = false } = {}) {
    const tab = this._active();
    if (!skipHistory) {
      tab.history.push(deepClone(tab.state));
      if (tab.history.length > this.maxHistory) tab.history.shift();
      tab.future = [];
    }
    if (typeof updater === 'function') {
      tab.state = updater(tab.state);
    } else {
      tab.state = { ...tab.state, ...updater };
    }
    this._notify();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _notify() {
    const tab = this._active();
    for (const fn of this.listeners) {
      try { fn(tab.state); } catch (e) { console.error('Store listener error:', e); }
    }
    // Also update tab bar (task name may have changed)
    this._notifyTabs();
    this._scheduleSave();
  }

  // ── Undo / Redo ──
  undo() {
    const tab = this._active();
    if (tab.history.length === 0) return;
    tab.future.push(deepClone(tab.state));
    tab.state = tab.history.pop();
    this._notify();
  }

  redo() {
    const tab = this._active();
    if (tab.future.length === 0) return;
    tab.history.push(deepClone(tab.state));
    tab.state = tab.future.pop();
    this._notify();
  }

  // ── Convenience actions ──

  setTaskName(name) {
    this.setState(s => ({ ...s, taskName: name }));
  }

  addRequiredVariable(name = '') {
    const id = `rv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.setState(s => ({
      ...s,
      requiredVariables: [...s.requiredVariables, { id, name }],
    }));
    return id;
  }

  updateRequiredVariable(id, name) {
    this.setState(s => ({
      ...s,
      requiredVariables: s.requiredVariables.map(v => v.id === id ? { ...v, name } : v),
    }));
  }

  removeRequiredVariable(id) {
    this.setState(s => ({
      ...s,
      requiredVariables: s.requiredVariables.filter(v => v.id !== id),
    }));
  }

  addComputedVariable(name = '', expression = '') {
    const id = `cv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.setState(s => ({
      ...s,
      computedVariables: [...s.computedVariables, { id, name, expression }],
    }));
    return id;
  }

  updateComputedVariable(id, updates) {
    this.setState(s => ({
      ...s,
      computedVariables: s.computedVariables.map(v => v.id === id ? { ...v, ...updates } : v),
    }));
  }

  removeComputedVariable(id) {
    this.setState(s => ({
      ...s,
      computedVariables: s.computedVariables.filter(v => v.id !== id),
    }));
  }

  addItem(item, index = -1) {
    this.setState(s => {
      const items = [...s.items];
      if (index < 0 || index >= items.length) {
        items.push(item);
      } else {
        items.splice(index, 0, item);
      }
      return { ...s, items };
    });
  }

  updateItemArgs(id, argUpdates) {
    this.setState(s => ({
      ...s,
      items: s.items.map(item =>
        item.id === id ? { ...item, args: { ...item.args, ...argUpdates } } : item
      ),
    }));
  }

  updateSectionTitle(id, title) {
    this.setState(s => ({
      ...s,
      items: s.items.map(item =>
        item.id === id && item.type === '__SECTION__' ? { ...item, title } : item
      ),
    }));
  }

  updateRawText(id, text) {
    this.setState(s => ({
      ...s,
      items: s.items.map(item =>
        item.id === id && item.type === '__RAW__' ? { ...item, text } : item
      ),
    }));
  }

  removeItem(id) {
    this.setState(s => ({
      ...s,
      items: s.items.filter(item => item.id !== id),
      selectedItemId: s.selectedItemId === id ? null : s.selectedItemId,
    }));
  }

  toggleItemCollapsed(id) {
    this.setState(s => ({
      ...s,
      items: s.items.map(item =>
        item.id === id ? { ...item, collapsed: !item.collapsed } : item
      ),
    }));
  }

  duplicateItem(id) {
    this.setState(s => {
      const idx = s.items.findIndex(i => i.id === id);
      if (idx === -1) return s;
      const original = s.items[idx];
      const dup = deepClone(original);
      dup.id = `dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const items = [...s.items];
      items.splice(idx + 1, 0, dup);
      return { ...s, items };
    });
  }

  moveItem(fromIndex, toIndex) {
    this.setState(s => {
      const items = [...s.items];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return { ...s, items };
    });
  }

  selectItem(id, opts = {}) {
    this._scrollToSelected = opts.scroll !== false;
    this.setState(s => ({ ...s, selectedItemId: id }), { skipHistory: true });
  }

  setValidationErrors(errors) {
    const tab = this._active();
    const current = JSON.stringify(tab.state.validationErrors);
    const next = JSON.stringify(errors);
    if (current === next) return;
    this.setState(s => ({ ...s, validationErrors: errors }), { skipHistory: true });
  }

  // ── Load full state (for import) — replaces active tab ──
  loadState(newState) {
    this.setState(() => ({ ...deepClone(INITIAL_TAB_STATE), ...newState }));
    const tab = this._active();
    tab.history = [];
    tab.future = [];
  }

  reset() {
    this.setState(() => deepClone(INITIAL_TAB_STATE));
    const tab = this._active();
    tab.history = [];
    tab.future = [];
    this._scheduleSave();
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTOSAVE — persists all tabs
  // ═══════════════════════════════════════════════════════════════

  _scheduleSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      try {
        const saveable = {
          activeTabId: this.activeTabId,
          tabOrder: this.tabOrder,
          tabs: {},
        };
        for (const [id, tab] of this.tabs) {
          saveable.tabs[id] = {
            taskName: tab.state.taskName,
            requiredVariables: tab.state.requiredVariables,
            computedVariables: tab.state.computedVariables,
            items: tab.state.items,
          };
        }
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(saveable));
        this._showSaveIndicator();
      } catch (e) {
        console.warn('Autosave failed:', e);
      }
    }, 800);
  }

  _showSaveIndicator() {
    const bar = document.getElementById('status-bar');
    if (!bar) return;
    let indicator = document.getElementById('autosave-indicator');
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.id = 'autosave-indicator';
      indicator.className = 'status-bar__saved';
      bar.appendChild(indicator);
    }
    indicator.textContent = 'Saved';
    indicator.classList.add('status-bar__saved--visible');
    clearTimeout(this._fadeTimer);
    this._fadeTimer = setTimeout(() => {
      indicator.classList.remove('status-bar__saved--visible');
    }, 2000);
  }

  loadFromAutosave() {
    // Try new multi-tab format first
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.tabs && saved.tabOrder?.length) {
          this.tabs.clear();
          this.tabOrder = [];
          for (const id of saved.tabOrder) {
            const tabData = saved.tabs[id];
            if (!tabData) continue;
            this.tabs.set(id, {
              state: { ...deepClone(INITIAL_TAB_STATE), ...tabData, validationErrors: [], selectedItemId: null },
              history: [],
              future: [],
            });
            this.tabOrder.push(id);
          }
          if (this.tabOrder.length > 0) {
            this.activeTabId = (saved.activeTabId && this.tabs.has(saved.activeTabId))
              ? saved.activeTabId
              : this.tabOrder[0];
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to restore multi-tab autosave:', e);
    }

    // Migrate legacy single-tab format
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && (saved.items?.length || saved.taskName || saved.requiredVariables?.length)) {
          const tab = this._active();
          tab.state = { ...deepClone(INITIAL_TAB_STATE), ...saved, validationErrors: [], selectedItemId: null };
          tab.history = [];
          tab.future = [];
          localStorage.removeItem(LEGACY_KEY);
          return true;
        }
      }
    } catch (e) {
      console.warn('Failed to restore legacy autosave:', e);
    }

    return false;
  }

  // ── Get all available variables (for autocomplete) ──
  getAllVariables() {
    const state = this.getState();
    const vars = [];
    for (const v of state.requiredVariables) {
      if (v.name) vars.push({ name: v.name, source: 'required' });
    }
    for (const v of state.computedVariables) {
      if (v.name) vars.push({ name: v.name, source: 'computed', expression: v.expression });
    }
    for (const [name] of Object.entries(DEFAULT_VARIABLES)) {
      vars.push({ name, source: 'default' });
    }
    return vars;
  }
}

export const store = new Store();
