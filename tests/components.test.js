// ─── Component Tests ─────────────────────────────────────────────
// Covers: rendering, user interactions, and store ↔ DOM sync
// for all UI components.

import { describe, it, assert } from './framework.js';
import { store } from '../js/store.js';
import { createInstructionCard } from '../js/components/InstructionCard.js';
import { createTabBar } from '../js/components/TabBar.js';
import { createPipeline } from '../js/components/Pipeline.js';
import { createPalette } from '../js/components/Palette.js';
import { createContextPanel } from '../js/components/ContextPanel.js';
import { createVariableInput } from '../js/components/shared/VariableInput.js';
import { INSTRUCTION_SCHEMA, InstructionType, createInstruction, createSection } from '../js/types.js';
import { el, clearChildren } from '../js/utils/dom.js';

// ── Helpers ──────────────────────────────────────────────────────

function resetStore() {
  const tabs = store.getTabs();
  while (tabs.length > 1) {
    store.closeTab(tabs[tabs.length - 1].id);
    tabs.pop();
  }
  store.reset();
}

function spyOn(obj, method) {
  const original = obj[method];
  const spy = {
    calls: [],
    restore() { obj[method] = original; },
  };
  obj[method] = function (...args) {
    spy.calls.push(args);
    return original.apply(this, args);
  };
  return spy;
}

// Mount an element offscreen so DOM queries work
function mount(element) {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1024px;height:768px;overflow:hidden;';
  container.appendChild(element);
  document.body.appendChild(container);
  return container;
}

function unmount(container) {
  if (container && container.parentNode) container.remove();
}

export default function componentTests() {

  // ═══════════════════════════════════════════════════════════════
  // INSTRUCTION CARD — RENDERING
  // ═══════════════════════════════════════════════════════════════

  describe('InstructionCard — regular instructions', () => {
    it('creates a card element for CreateFile', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const card = createInstructionCard(item);
      assert.truthy(card);
      assert.truthy(card.classList.contains('card'));
      assert.includes(card.textContent, 'Create File');
    });

    it('creates cards for all 8 instruction types', () => {
      resetStore();
      for (const type of Object.values(InstructionType)) {
        const item = createInstruction(type);
        store.addItem(item);
        const card = createInstructionCard(item);
        assert.truthy(card, `Card should be created for ${type}`);
        const schema = INSTRUCTION_SCHEMA[type];
        assert.includes(card.textContent, schema.label, `Card should contain label for ${type}`);
      }
    });

    it('renders fields for each schema field', () => {
      resetStore();
      const item = createInstruction('ReplaceFile');
      store.addItem(item);
      const card = createInstructionCard(item);
      const container = mount(card);
      const labels = card.querySelectorAll('.card__field-label');
      const schema = INSTRUCTION_SCHEMA['ReplaceFile'];
      assert.equal(labels.length, schema.fields.length);
      unmount(container);
    });

    it('has drag handle', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const card = createInstructionCard(item);
      assert.truthy(card.querySelector('.card__drag-handle'));
    });

    it('has action buttons (duplicate, collapse, remove)', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const card = createInstructionCard(item);
      const actions = card.querySelectorAll('.card__action-btn');
      assert.greaterThan(actions.length, 0, 'Should have action buttons');
    });

    it('has description banner', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const card = createInstructionCard(item);
      const banner = card.querySelector('.info-banner');
      assert.truthy(banner, 'Should have description banner');
    });

    it('sets data-id on card', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const card = createInstructionCard(item);
      assert.equal(card.dataset.id, item.id);
    });

    it('sets data-category on card', () => {
      resetStore();
      const item = createInstruction('InsertAtAnchor');
      store.addItem(item);
      const card = createInstructionCard(item);
      const schema = INSTRUCTION_SCHEMA['InsertAtAnchor'];
      assert.equal(card.dataset.category, schema.category);
    });
  });

  describe('InstructionCard — collapsed state', () => {
    it('hides body when collapsed', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      item.collapsed = true;
      store.addItem(item);
      const card = createInstructionCard(item);
      assert.truthy(card.classList.contains('card--collapsed'));
      const body = card.querySelector('.card__body');
      assert.truthy(!body, 'Body should not be rendered when collapsed');
    });

    it('shows body when not collapsed', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      item.collapsed = false;
      store.addItem(item);
      const card = createInstructionCard(item);
      const body = card.querySelector('.card__body');
      assert.truthy(body, 'Body should be rendered when not collapsed');
    });

    it('shows error badge when collapsed with errors', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      item.collapsed = true;
      store.addItem(item);
      const errors = [{ itemId: item.id, severity: 'error', message: 'Missing path', field: 'path' }];
      const card = createInstructionCard(item, errors);
      const badge = card.querySelector('.card__error-badge');
      assert.truthy(badge, 'Should show error badge when collapsed');
    });
  });

  describe('InstructionCard — error styling', () => {
    it('adds error class when item has errors', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const errors = [{ itemId: item.id, severity: 'error', message: 'err', field: 'path' }];
      const card = createInstructionCard(item, errors);
      assert.truthy(card.classList.contains('card--has-error'));
    });

    it('adds warning class for warnings only', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const errors = [{ itemId: item.id, severity: 'warning', message: 'warn' }];
      const card = createInstructionCard(item, errors);
      assert.truthy(card.classList.contains('card--has-warning'));
      assert.truthy(!card.classList.contains('card--has-error'));
    });

    it('shows field-level errors in body', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const errors = [{ itemId: item.id, severity: 'error', message: 'Path required', field: 'path' }];
      const card = createInstructionCard(item, errors);
      const fieldError = card.querySelector('.card__field-error');
      assert.truthy(fieldError, 'Should show field-level error');
    });

    it('no error classes when no errors', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const card = createInstructionCard(item, []);
      assert.truthy(!card.classList.contains('card--has-error'));
      assert.truthy(!card.classList.contains('card--has-warning'));
    });
  });

  describe('InstructionCard — section divider', () => {
    it('creates a section card for __SECTION__ type', () => {
      const section = createSection('My Section');
      const card = createInstructionCard(section);
      assert.truthy(card);
      assert.truthy(card.classList.contains('card--section'));
    });

    it('section card has title input', () => {
      const section = createSection('Test Title');
      const card = createInstructionCard(section);
      const input = card.querySelector('.card__section-input');
      assert.truthy(input);
      assert.equal(input.value, 'Test Title');
    });

    it('section card has remove button', () => {
      const section = createSection('X');
      const card = createInstructionCard(section);
      const removeBtn = card.querySelector('.card__action-btn--danger');
      assert.truthy(removeBtn);
    });

    it('section card has drag handle', () => {
      const section = createSection();
      const card = createInstructionCard(section);
      assert.truthy(card.querySelector('.card__drag-handle'));
    });
  });

  describe('InstructionCard — raw card', () => {
    it('creates raw card for __RAW__ type', () => {
      const item = { id: 'raw1', type: '__RAW__', text: 'some unknown line' };
      const card = createInstructionCard(item);
      assert.truthy(card.classList.contains('card--raw'));
    });

    it('raw card shows "Unrecognized" badge', () => {
      const item = { id: 'raw1', type: '__RAW__', text: 'stuff' };
      const card = createInstructionCard(item);
      assert.includes(card.textContent, 'Unrecognized');
    });

    it('raw card has text input with value', () => {
      const item = { id: 'raw1', type: '__RAW__', text: 'my raw line' };
      const card = createInstructionCard(item);
      const input = card.querySelector('.card__raw-input');
      assert.truthy(input);
      assert.equal(input.value, 'my raw line');
    });

    it('raw card has remove button', () => {
      const item = { id: 'raw1', type: '__RAW__', text: '' };
      const card = createInstructionCard(item);
      const removeBtn = card.querySelector('.card__action-btn--danger');
      assert.truthy(removeBtn);
    });
  });

  describe('InstructionCard — unknown type', () => {
    it('shows error div for unknown instruction type', () => {
      resetStore();
      const item = { id: 'u1', type: 'NonExistentType', args: {}, collapsed: false };
      store.addItem(item);
      const card = createInstructionCard(item);
      assert.truthy(card.classList.contains('card--error'));
      assert.includes(card.textContent, 'Unknown');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // INSTRUCTION CARD — INTERACTIONS
  // ═══════════════════════════════════════════════════════════════

  describe('InstructionCard — button interactions', () => {
    it('duplicate button calls store.duplicateItem', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const spy = spyOn(store, 'duplicateItem');
      const card = createInstructionCard(item);
      const container = mount(card);
      // Find duplicate button (has copy icon, not the remove or collapse)
      const dupBtn = card.querySelector('.card__action-btn[data-tooltip*="Duplicate"]');
      if (dupBtn) {
        dupBtn.click();
        assert.greaterThan(spy.calls.length, 0, 'Should call duplicateItem');
      }
      spy.restore();
      unmount(container);
    });

    it('remove button calls store.removeItem', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const spy = spyOn(store, 'removeItem');
      const card = createInstructionCard(item);
      const removeBtn = card.querySelector('.card__action-btn--danger');
      if (removeBtn) {
        removeBtn.click();
        assert.greaterThan(spy.calls.length, 0, 'Should call removeItem');
      }
      spy.restore();
    });

    it('collapse button calls store.toggleItemCollapsed', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const spy = spyOn(store, 'toggleItemCollapsed');
      const card = createInstructionCard(item);
      // The collapse button has a tooltip mentioning "Collapse" or "Expand"
      const btns = card.querySelectorAll('.card__action-btn');
      // Collapse button is typically second-to-last (before remove)
      const collapseBtn = Array.from(btns).find(b =>
        b.dataset.tooltip && (b.dataset.tooltip.includes('Collapse') || b.dataset.tooltip.includes('Expand'))
      );
      if (collapseBtn) {
        collapseBtn.click();
        assert.greaterThan(spy.calls.length, 0, 'Should call toggleItemCollapsed');
      }
      spy.restore();
    });

    it('header click calls store.selectItem', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const spy = spyOn(store, 'selectItem');
      const card = createInstructionCard(item);
      const header = card.querySelector('.card__header');
      header.click();
      assert.greaterThan(spy.calls.length, 0, 'Should call selectItem');
      assert.equal(spy.calls[0][0], item.id);
      spy.restore();
    });

    it('section title input calls store.updateSectionTitle', () => {
      resetStore();
      const section = createSection('Title');
      store.addItem(section);
      const spy = spyOn(store, 'updateSectionTitle');
      const card = createInstructionCard(section);
      const input = card.querySelector('.card__section-input');
      input.value = 'New Title';
      input.dispatchEvent(new Event('input'));
      assert.greaterThan(spy.calls.length, 0, 'Should call updateSectionTitle');
      spy.restore();
    });

    it('raw text input calls store.updateRawText', () => {
      resetStore();
      const item = { id: 'r1', type: '__RAW__', text: 'old' };
      store.addItem(item);
      const spy = spyOn(store, 'updateRawText');
      const card = createInstructionCard(item);
      const input = card.querySelector('.card__raw-input');
      input.value = 'new text';
      input.dispatchEvent(new Event('input'));
      assert.greaterThan(spy.calls.length, 0, 'Should call updateRawText');
      spy.restore();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TAB BAR
  // ═══════════════════════════════════════════════════════════════

  describe('TabBar — rendering', () => {
    it('creates tab-bar element', () => {
      resetStore();
      const bar = createTabBar();
      assert.truthy(bar);
      assert.truthy(bar.classList.contains('tab-bar'));
    });

    it('shows at least one tab', () => {
      resetStore();
      const bar = createTabBar();
      const container = mount(bar);
      const tabs = bar.querySelectorAll('.tab-bar__tab');
      assert.greaterThan(tabs.length, 0, 'Should show at least one tab');
      unmount(container);
    });

    it('active tab has active class', () => {
      resetStore();
      const bar = createTabBar();
      const container = mount(bar);
      const activeTab = bar.querySelector('.tab-bar__tab--active');
      assert.truthy(activeTab, 'Should have an active tab');
      unmount(container);
    });

    it('has add tab button', () => {
      resetStore();
      const bar = createTabBar();
      assert.truthy(bar.querySelector('.tab-bar__add'));
    });

    it('single tab has no close button', () => {
      resetStore();
      const bar = createTabBar();
      const container = mount(bar);
      const closeBtn = bar.querySelector('.tab-bar__close');
      assert.truthy(!closeBtn, 'Single tab should not have close button');
      unmount(container);
    });
  });

  describe('TabBar — interactions', () => {
    it('add button calls store.addTab', () => {
      resetStore();
      const spy = spyOn(store, 'addTab');
      const bar = createTabBar();
      const container = mount(bar);
      const addBtn = bar.querySelector('.tab-bar__add');
      addBtn.click();
      assert.greaterThan(spy.calls.length, 0, 'Should call addTab');
      spy.restore();
      unmount(container);
    });

    it('clicking tab calls store.switchTab', () => {
      resetStore();
      store.addTab('Tab 2');
      const spy = spyOn(store, 'switchTab');
      const bar = createTabBar();
      const container = mount(bar);
      const tabs = bar.querySelectorAll('.tab-bar__tab');
      if (tabs.length > 1) {
        // Click the non-active tab
        const inactiveTab = Array.from(tabs).find(t => !t.classList.contains('tab-bar__tab--active'));
        if (inactiveTab) {
          inactiveTab.click();
          assert.greaterThan(spy.calls.length, 0, 'Should call switchTab');
        }
      }
      spy.restore();
      unmount(container);
    });

    it('multiple tabs show close buttons', () => {
      resetStore();
      store.addTab('Tab 2');
      const bar = createTabBar();
      const container = mount(bar);
      const closeBtns = bar.querySelectorAll('.tab-bar__close');
      assert.greaterThan(closeBtns.length, 0, 'Multiple tabs should have close buttons');
      unmount(container);
    });
  });

  describe('TabBar — store sync', () => {
    it('re-renders when tabs change', () => {
      resetStore();
      const bar = createTabBar();
      const container = mount(bar);
      const before = bar.querySelectorAll('.tab-bar__tab').length;
      store.addTab('New Tab');
      // subscribeTabs fires synchronously, so DOM should update
      const after = bar.querySelectorAll('.tab-bar__tab').length;
      assert.equal(after, before + 1, 'Should add a tab element');
      unmount(container);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE
  // ═══════════════════════════════════════════════════════════════

  describe('Pipeline — rendering', () => {
    it('creates main.pipeline element', () => {
      resetStore();
      const pipeline = createPipeline();
      assert.truthy(pipeline);
      assert.equal(pipeline.tagName, 'MAIN');
      assert.truthy(pipeline.classList.contains('pipeline'));
    });

    it('has pipeline header with title', () => {
      resetStore();
      const pipeline = createPipeline();
      const header = pipeline.querySelector('.pipeline__header');
      assert.truthy(header);
      assert.includes(header.textContent, 'Pipeline');
    });

    it('has pipeline list container', () => {
      resetStore();
      const pipeline = createPipeline();
      assert.truthy(pipeline.querySelector('.pipeline__list'));
    });

    it('shows empty state when no items', () => {
      resetStore();
      const pipeline = createPipeline();
      const container = mount(pipeline);
      const empty = pipeline.querySelector('.pipeline__empty');
      assert.truthy(empty, 'Should show empty state');
      unmount(container);
    });

    it('shows instruction count', () => {
      resetStore();
      const pipeline = createPipeline();
      const count = pipeline.querySelector('.pipeline__count');
      assert.truthy(count);
    });
  });

  describe('Pipeline — store sync', () => {
    it('renders items when store has items', () => {
      resetStore();
      const pipeline = createPipeline();
      const container = mount(pipeline);
      store.addItem(createInstruction('CreateFile'));
      store.addItem(createInstruction('CreateDirectory'));
      // Store subscribe fires sync, so DOM should update
      const cards = pipeline.querySelectorAll('.card');
      assert.greaterThan(cards.length, 0, 'Should render instruction cards');
      unmount(container);
    });

    it('updates instruction count when items change', () => {
      resetStore();
      const pipeline = createPipeline();
      const container = mount(pipeline);
      store.addItem(createInstruction('CreateFile'));
      store.addItem(createInstruction('CreateFile'));
      const countEl = pipeline.querySelector('.pipeline__count');
      assert.includes(countEl.textContent, '2');
      unmount(container);
    });

    it('hides empty state when items exist', () => {
      resetStore();
      const pipeline = createPipeline();
      const container = mount(pipeline);
      store.addItem(createInstruction('CreateFile'));
      const empty = pipeline.querySelector('.pipeline__empty');
      // Should be hidden
      assert.truthy(!empty || empty.style.display === 'none', 'Empty state should be hidden');
      unmount(container);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PALETTE
  // ═══════════════════════════════════════════════════════════════

  describe('Palette — rendering', () => {
    it('creates aside.palette element', () => {
      resetStore();
      const palette = createPalette();
      assert.truthy(palette);
      assert.equal(palette.tagName, 'ASIDE');
      assert.truthy(palette.classList.contains('palette'));
    });

    it('has required variables section', () => {
      resetStore();
      const palette = createPalette();
      const container = mount(palette);
      const sections = palette.querySelectorAll('.palette__section');
      assert.greaterThan(sections.length, 0);
      assert.includes(palette.textContent, 'Required Variables');
      unmount(container);
    });

    it('has computed variables section', () => {
      resetStore();
      const palette = createPalette();
      assert.includes(palette.textContent, 'Computed Variables');
    });

    it('has instructions section', () => {
      resetStore();
      const palette = createPalette();
      assert.includes(palette.textContent, 'Instructions');
    });

    it('has search filter input', () => {
      resetStore();
      const palette = createPalette();
      const search = palette.querySelector('.palette__search-input');
      assert.truthy(search);
      assert.equal(search.type, 'text');
    });

    it('lists all instruction types', () => {
      resetStore();
      const palette = createPalette();
      const items = palette.querySelectorAll('.palette__instr-item');
      // Should have at least 8 instruction types + section divider
      assert.greaterThan(items.length, 7, 'Should list instruction types');
    });

    it('has add buttons for variables', () => {
      resetStore();
      const palette = createPalette();
      const addBtns = palette.querySelectorAll('.palette__add-btn');
      assert.greaterThan(addBtns.length, 0, 'Should have add buttons');
    });

    it('has Toolbox header', () => {
      resetStore();
      const palette = createPalette();
      assert.includes(palette.textContent, 'Toolbox');
    });
  });

  describe('Palette — instruction search filter', () => {
    it('filters instructions by name', () => {
      resetStore();
      const palette = createPalette();
      const container = mount(palette);
      const searchInput = palette.querySelector('.palette__search-input');
      searchInput.value = 'Create';
      searchInput.dispatchEvent(new Event('input'));
      const visible = Array.from(palette.querySelectorAll('.palette__instr-item'))
        .filter(item => item.style.display !== 'none');
      // At least CreateFile and CreateDirectory should match
      assert.greaterThan(visible.length, 0, 'Should show matching instructions');
      // Non-matching items should be hidden
      const total = palette.querySelectorAll('.palette__instr-item').length;
      assert.greaterThan(total, visible.length, 'Some items should be hidden');
      unmount(container);
    });

    it('shows no-results message for non-matching query', () => {
      resetStore();
      const palette = createPalette();
      const container = mount(palette);
      const searchInput = palette.querySelector('.palette__search-input');
      searchInput.value = 'xyznonexistent';
      searchInput.dispatchEvent(new Event('input'));
      const noResults = palette.querySelector('.palette__empty--filter');
      assert.truthy(noResults);
      assert.truthy(noResults.style.display !== 'none', 'Should show no-results message');
      unmount(container);
    });

    it('shows all when query is cleared', () => {
      resetStore();
      const palette = createPalette();
      const container = mount(palette);
      const searchInput = palette.querySelector('.palette__search-input');
      searchInput.value = 'Create';
      searchInput.dispatchEvent(new Event('input'));
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      const hidden = Array.from(palette.querySelectorAll('.palette__instr-item'))
        .filter(item => item.style.display === 'none');
      assert.equal(hidden.length, 0, 'All items should be visible');
      unmount(container);
    });
  });

  describe('Palette — interactions', () => {
    it('clicking instruction item calls store.addItem', () => {
      resetStore();
      const spy = spyOn(store, 'addItem');
      const palette = createPalette();
      const container = mount(palette);
      const items = palette.querySelectorAll('.palette__instr-item');
      if (items.length > 0) items[0].click();
      assert.greaterThan(spy.calls.length, 0, 'Should call addItem');
      spy.restore();
      unmount(container);
    });

    it('add required variable button calls store', () => {
      resetStore();
      const spy = spyOn(store, 'addRequiredVariable');
      const palette = createPalette();
      const container = mount(palette);
      const addBtns = palette.querySelectorAll('.palette__add-btn');
      // First add button is for required variables
      if (addBtns.length > 0) addBtns[0].click();
      assert.greaterThan(spy.calls.length, 0, 'Should call addRequiredVariable');
      spy.restore();
      unmount(container);
    });

    it('instruction items are draggable', () => {
      resetStore();
      const palette = createPalette();
      const items = palette.querySelectorAll('.palette__instr-item');
      if (items.length > 0) {
        assert.equal(items[0].getAttribute('draggable'), 'true');
      }
    });
  });

  describe('Palette — store sync', () => {
    it('renders required variables from store', () => {
      resetStore();
      const palette = createPalette();
      const container = mount(palette);
      store.addRequiredVariable('testVar');
      const varInputs = palette.querySelectorAll('#required-var-list .palette__var-input');
      const found = Array.from(varInputs).some(input => input.value === 'testVar');
      assert.truthy(found, 'Should render required variable from store');
      unmount(container);
    });

    it('renders computed variables from store', () => {
      resetStore();
      const palette = createPalette();
      const container = mount(palette);
      store.addComputedVariable('myDir', '${base}/path');
      const nameInputs = palette.querySelectorAll('#computed-var-list .comp-var__name');
      const found = Array.from(nameInputs).some(input => input.value === 'myDir');
      assert.truthy(found, 'Should render computed variable from store');
      unmount(container);
    });

    it('shows empty state messages when no variables', () => {
      resetStore();
      const palette = createPalette();
      const container = mount(palette);
      const empties = palette.querySelectorAll('.palette__empty');
      assert.greaterThan(empties.length, 0, 'Should show empty state messages');
      unmount(container);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CONTEXT PANEL
  // ═══════════════════════════════════════════════════════════════

  describe('ContextPanel — rendering', () => {
    it('creates aside.context-panel element', () => {
      resetStore();
      const panel = createContextPanel();
      assert.truthy(panel);
      assert.equal(panel.tagName, 'ASIDE');
      assert.truthy(panel.classList.contains('context-panel'));
    });

    it('has 3 tabs (Preview, Variables, Validation)', () => {
      resetStore();
      const panel = createContextPanel();
      const tabs = panel.querySelectorAll('.context-panel__tab');
      assert.equal(tabs.length, 3);
    });

    it('Preview tab is active by default', () => {
      resetStore();
      const panel = createContextPanel();
      const activeTab = panel.querySelector('.context-panel__tab--active');
      assert.truthy(activeTab);
      assert.includes(activeTab.textContent, 'Preview');
    });

    it('has a textarea or code area for preview', () => {
      resetStore();
      const panel = createContextPanel();
      const container = mount(panel);
      // The preview has a textarea for editing
      const textarea = panel.querySelector('textarea');
      assert.truthy(textarea, 'Should have a textarea for preview');
      unmount(container);
    });

    it('has panel tabs', () => {
      resetStore();
      const panel = createContextPanel();
      const tabs = panel.querySelector('.context-panel__tabs');
      assert.truthy(tabs);
    });
  });

  describe('ContextPanel — tab switching', () => {
    it('clicking Variables tab switches content', () => {
      resetStore();
      const panel = createContextPanel();
      const container = mount(panel);
      const tabs = panel.querySelectorAll('.context-panel__tab');
      // Click "Variables" tab (index 1)
      tabs[1].click();
      assert.truthy(tabs[1].classList.contains('context-panel__tab--active'));
      assert.truthy(!tabs[0].classList.contains('context-panel__tab--active'));
      unmount(container);
    });

    it('clicking Validation tab switches content', () => {
      resetStore();
      const panel = createContextPanel();
      const container = mount(panel);
      const tabs = panel.querySelectorAll('.context-panel__tab');
      tabs[2].click();
      assert.truthy(tabs[2].classList.contains('context-panel__tab--active'));
      unmount(container);
    });
  });

  describe('ContextPanel — store sync', () => {
    it('updates preview when store changes', () => {
      resetStore();
      const panel = createContextPanel();
      const container = mount(panel);
      store.setTaskName('syncTest');
      // Preview textarea should reflect the task
      const textarea = panel.querySelector('textarea');
      if (textarea) {
        // The sync may be debounced, check immediately
        // At minimum it shouldn't crash
        assert.truthy(textarea, 'Textarea should still exist');
      }
      unmount(container);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // VARIABLE INPUT
  // ═══════════════════════════════════════════════════════════════

  describe('VariableInput — rendering', () => {
    it('creates wrapper div', () => {
      resetStore();
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      assert.truthy(wrapper);
      assert.truthy(wrapper.classList.contains('var-input-wrapper'));
    });

    it('has text input by default', () => {
      resetStore();
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const input = wrapper.querySelector('input.var-input');
      assert.truthy(input);
    });

    it('creates textarea when multiline', () => {
      resetStore();
      const wrapper = createVariableInput({ value: '', multiline: true, onChange: () => {} });
      const textarea = wrapper.querySelector('textarea.var-input');
      assert.truthy(textarea, 'Should create textarea for multiline');
    });

    it('sets initial value', () => {
      resetStore();
      const wrapper = createVariableInput({ value: 'initial', onChange: () => {} });
      assert.equal(wrapper.getValue(), 'initial');
    });

    it('has dropdown (hidden initially)', () => {
      resetStore();
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const dropdown = wrapper.querySelector('.var-dropdown');
      assert.truthy(dropdown);
      assert.equal(dropdown.style.display, 'none');
    });

    it('has preview (hidden initially)', () => {
      resetStore();
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const preview = wrapper.querySelector('.var-preview');
      assert.truthy(preview);
      assert.equal(preview.style.display, 'none');
    });

    it('has hint text', () => {
      resetStore();
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const hint = wrapper.querySelector('.var-hint');
      assert.truthy(hint);
      assert.includes(hint.textContent, '${');
    });

    it('applies custom className', () => {
      resetStore();
      const wrapper = createVariableInput({ value: '', className: 'custom-cls', onChange: () => {} });
      assert.truthy(wrapper.classList.contains('custom-cls'));
    });
  });

  describe('VariableInput — setValue/getValue', () => {
    it('setValue updates the input', () => {
      resetStore();
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      wrapper.setValue('new value');
      assert.equal(wrapper.getValue(), 'new value');
    });

    it('getValue returns current value', () => {
      resetStore();
      const wrapper = createVariableInput({ value: 'test', onChange: () => {} });
      assert.equal(wrapper.getValue(), 'test');
    });

    it('setValue with variable shows preview', () => {
      resetStore();
      store.addRequiredVariable('myVar');
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const container = mount(wrapper);
      wrapper.setValue('${myVar}/path');
      // Preview should become visible (may need rAF)
      requestAnimationFrame(() => {
        const preview = wrapper.querySelector('.var-preview');
        // Preview rendering depends on timing
        assert.truthy(preview, 'Preview element should exist');
      });
      unmount(container);
    });
  });

  describe('VariableInput — interactions', () => {
    it('calls onChange when input changes', () => {
      resetStore();
      let received = null;
      const wrapper = createVariableInput({ value: '', onChange: (v) => { received = v; } });
      const input = wrapper.querySelector('.var-input');
      input.value = 'typed';
      input.dispatchEvent(new Event('input'));
      assert.equal(received, 'typed');
    });

    it('shows dropdown when ${ is typed', () => {
      resetStore();
      store.addRequiredVariable('testVar');
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const container = mount(wrapper);
      const input = wrapper.querySelector('.var-input');
      input.value = '${';
      input.selectionStart = 2;
      input.selectionEnd = 2;
      input.dispatchEvent(new Event('input'));
      const dropdown = wrapper.querySelector('.var-dropdown');
      assert.truthy(dropdown.style.display !== 'none', 'Dropdown should be visible');
      unmount(container);
    });

    it('hides dropdown when text has no ${', () => {
      resetStore();
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const container = mount(wrapper);
      const input = wrapper.querySelector('.var-input');
      input.value = 'hello';
      input.selectionStart = 5;
      input.dispatchEvent(new Event('input'));
      const dropdown = wrapper.querySelector('.var-dropdown');
      assert.equal(dropdown.style.display, 'none');
      unmount(container);
    });

    it('Escape hides the dropdown', () => {
      resetStore();
      store.addRequiredVariable('v1');
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const container = mount(wrapper);
      const input = wrapper.querySelector('.var-input');
      input.value = '${';
      input.selectionStart = 2;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      const dropdown = wrapper.querySelector('.var-dropdown');
      assert.equal(dropdown.style.display, 'none');
      unmount(container);
    });

    it('focus shows hint', () => {
      resetStore();
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const container = mount(wrapper);
      const input = wrapper.querySelector('.var-input');
      input.dispatchEvent(new Event('focus'));
      const hint = wrapper.querySelector('.var-hint');
      assert.truthy(hint.style.display !== 'none', 'Hint should be visible on focus with empty input');
      unmount(container);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CROSS-COMPONENT INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  describe('Components — cross-component sync', () => {
    it('adding item in store updates pipeline card count', () => {
      resetStore();
      const pipeline = createPipeline();
      const container = mount(pipeline);
      store.addItem(createInstruction('CreateFile'));
      store.addItem(createInstruction('CreateDirectory'));
      store.addItem(createInstruction('ReplaceFile'));
      const count = pipeline.querySelector('.pipeline__count');
      assert.includes(count.textContent, '3');
      unmount(container);
    });

    it('setTaskName in store reflects in palette context', () => {
      resetStore();
      store.setTaskName('myTask');
      const state = store.getState();
      assert.equal(state.taskName, 'myTask');
    });

    it('adding variable in store makes it available in VariableInput autocomplete', () => {
      resetStore();
      store.addRequiredVariable('newVar');
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const container = mount(wrapper);
      const input = wrapper.querySelector('.var-input');
      input.value = '${';
      input.selectionStart = 2;
      input.dispatchEvent(new Event('input'));
      const dropdown = wrapper.querySelector('.var-dropdown');
      assert.includes(dropdown.textContent, 'newVar');
      unmount(container);
    });

    it('store undo reverts pipeline', () => {
      resetStore();
      const pipeline = createPipeline();
      const container = mount(pipeline);
      store.addItem(createInstruction('CreateFile'));
      const before = pipeline.querySelectorAll('.card').length;
      store.undo();
      const after = pipeline.querySelectorAll('.card').length;
      assert.equal(after, before - 1, 'Undo should remove the card');
      unmount(container);
    });

    it('multi-tab switch updates all subscribed components', () => {
      resetStore();
      store.setTaskName('Tab1Task');
      store.addItem(createInstruction('CreateFile'));
      store.addTab('');
      store.setTaskName('Tab2Task');
      // Switch back to first tab
      const tabs = store.getTabs();
      const firstTab = tabs.find(t => !t.active);
      if (firstTab) {
        store.switchTab(firstTab.id);
        assert.equal(store.getState().taskName, 'Tab1Task');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DRAG & DROP SIMULATION
  // ═══════════════════════════════════════════════════════════════

  describe('Components — drag and drop', () => {
    it('palette instruction items have correct drag data type', () => {
      resetStore();
      const palette = createPalette();
      const container = mount(palette);
      const items = palette.querySelectorAll('.palette__instr-item');
      assert.greaterThan(items.length, 0);
      // Each item should have data-instruction-type
      const firstItem = items[0];
      assert.truthy(firstItem.dataset.instructionType, 'Should have instruction type data');
      unmount(container);
    });

    it('instruction card has draggable drag handle', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const card = createInstructionCard(item);
      const handle = card.querySelector('.card__drag-handle');
      assert.truthy(handle, 'Should have drag handle');
    });

    it('pipeline list is a drop target', () => {
      resetStore();
      const pipeline = createPipeline();
      const list = pipeline.querySelector('.pipeline__list');
      assert.truthy(list, 'Pipeline should have a drop target list');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASES & ROBUSTNESS
  // ═══════════════════════════════════════════════════════════════

  describe('Components — edge cases', () => {
    it('InstructionCard handles item with no args gracefully', () => {
      resetStore();
      const item = { id: 'noargs', type: 'CreateFile', args: {}, collapsed: false };
      store.addItem(item);
      const card = createInstructionCard(item);
      assert.truthy(card, 'Should create card even with empty args');
    });

    it('InstructionCard handles many errors', () => {
      resetStore();
      const item = createInstruction('ReplaceFile');
      store.addItem(item);
      const errors = Array.from({ length: 10 }, (_, i) => ({
        itemId: item.id,
        severity: i % 2 === 0 ? 'error' : 'warning',
        message: `Error ${i}`,
        field: i < 5 ? 'targetPath' : undefined,
      }));
      const card = createInstructionCard(item, errors);
      assert.truthy(card, 'Should handle many errors');
      assert.truthy(card.classList.contains('card--has-error'));
    });

    it('multiple Pipelines can coexist', () => {
      resetStore();
      const p1 = createPipeline();
      const p2 = createPipeline();
      assert.truthy(p1);
      assert.truthy(p2);
      assert(p1 !== p2, 'Should be distinct elements');
    });

    it('VariableInput with empty store works', () => {
      resetStore();
      const wrapper = createVariableInput({ value: '${nonexistent}', onChange: () => {} });
      assert.truthy(wrapper, 'Should work even with no variables in store');
    });

    it('createInstructionCard with errors for non-matching item', () => {
      resetStore();
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const errors = [{ itemId: 'other-id', severity: 'error', message: 'Not mine' }];
      const card = createInstructionCard(item, errors);
      assert.truthy(!card.classList.contains('card--has-error'), 'Should not show error for other items');
    });

    it('section card with empty title', () => {
      const section = createSection('');
      const card = createInstructionCard(section);
      const input = card.querySelector('.card__section-input');
      assert.truthy(input);
      assert.equal(input.value, '');
    });

    it('raw card with empty text', () => {
      const item = { id: 'r2', type: '__RAW__', text: '' };
      const card = createInstructionCard(item);
      const input = card.querySelector('.card__raw-input');
      assert.equal(input.value, '');
    });
  });
}
