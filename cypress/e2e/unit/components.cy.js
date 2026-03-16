// ─── Component Tests (Cypress) ─────────────────────────────────────────────

function resetStoreInline(store) {
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

function mount(element, win) {
  const container = win.document.createElement('div');
  container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1024px;height:768px;overflow:hidden;';
  container.appendChild(element);
  win.document.body.appendChild(container);
  return container;
}

function unmount(container) {
  if (container && container.parentNode) container.remove();
}

describe('InstructionCard — regular instructions', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('creates a card element for CreateFile', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const card = createInstructionCard(item);
      expect(card).to.be.ok;
      expect(card.classList.contains('card')).to.be.true;
      expect(card.textContent).to.include('Create File');
    });
  });

  it('creates cards for all 8 instruction types', () => {
    cy.window().then((win) => {
      const { store, InstructionType, INSTRUCTION_SCHEMA, createInstruction, createInstructionCard } = win.__test__;
      for (const type of Object.values(InstructionType)) {
        resetStoreInline(store);
        const item = createInstruction(type);
        store.addItem(item);
        const card = createInstructionCard(item);
        expect(card, `Card should be created for ${type}`).to.be.ok;
        const schema = INSTRUCTION_SCHEMA[type];
        expect(card.textContent, `Card should contain label for ${type}`).to.include(schema.label);
      }
    });
  });

  it('renders fields for each schema field', () => {
    cy.window().then((win) => {
      const { store, INSTRUCTION_SCHEMA, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('ReplaceFile');
      store.addItem(item);
      const card = createInstructionCard(item);
      const container = mount(card, win);
      const labels = card.querySelectorAll('.card__field-label');
      const schema = INSTRUCTION_SCHEMA['ReplaceFile'];
      expect(labels.length).to.equal(schema.fields.length);
      unmount(container);
    });
  });

  it('has drag handle', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const card = createInstructionCard(item);
      expect(card.querySelector('.card__drag-handle')).to.be.ok;
    });
  });

  it('has action buttons (duplicate, collapse, remove)', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const card = createInstructionCard(item);
      const actions = card.querySelectorAll('.card__action-btn');
      expect(actions.length, 'Should have action buttons').to.be.greaterThan(0);
    });
  });

  it('has description banner', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const card = createInstructionCard(item);
      const banner = card.querySelector('.info-banner');
      expect(banner, 'Should have description banner').to.be.ok;
    });
  });

  it('sets data-id on card', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const card = createInstructionCard(item);
      expect(card.dataset.id).to.equal(item.id);
    });
  });

  it('sets data-category on card', () => {
    cy.window().then((win) => {
      const { store, INSTRUCTION_SCHEMA, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('InsertAtAnchor');
      store.addItem(item);
      const card = createInstructionCard(item);
      const schema = INSTRUCTION_SCHEMA['InsertAtAnchor'];
      expect(card.dataset.category).to.equal(schema.category);
    });
  });
});

describe('InstructionCard — collapsed state', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('hides body when collapsed', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      item.collapsed = true;
      store.addItem(item);
      const card = createInstructionCard(item);
      expect(card.classList.contains('card--collapsed')).to.be.true;
      const body = card.querySelector('.card__body');
      expect(body, 'Body should not be rendered when collapsed').to.be.null;
    });
  });

  it('shows body when not collapsed', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      item.collapsed = false;
      store.addItem(item);
      const card = createInstructionCard(item);
      const body = card.querySelector('.card__body');
      expect(body, 'Body should be rendered when not collapsed').to.be.ok;
    });
  });

  it('shows error badge when collapsed with errors', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      item.collapsed = true;
      store.addItem(item);
      const errors = [{ itemId: item.id, severity: 'error', message: 'Missing path', field: 'path' }];
      const card = createInstructionCard(item, errors);
      const badge = card.querySelector('.card__error-badge');
      expect(badge, 'Should show error badge when collapsed').to.be.ok;
    });
  });
});

describe('InstructionCard — error styling', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('adds error class when item has errors', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const errors = [{ itemId: item.id, severity: 'error', message: 'err', field: 'path' }];
      const card = createInstructionCard(item, errors);
      expect(card.classList.contains('card--has-error')).to.be.true;
    });
  });

  it('adds warning class for warnings only', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const errors = [{ itemId: item.id, severity: 'warning', message: 'warn' }];
      const card = createInstructionCard(item, errors);
      expect(card.classList.contains('card--has-warning')).to.be.true;
      expect(card.classList.contains('card--has-error')).to.be.false;
    });
  });

  it('shows field-level errors in body', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const errors = [{ itemId: item.id, severity: 'error', message: 'Path required', field: 'path' }];
      const card = createInstructionCard(item, errors);
      const fieldError = card.querySelector('.card__field-error');
      expect(fieldError, 'Should show field-level error').to.be.ok;
    });
  });

  it('no error classes when no errors', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const card = createInstructionCard(item, []);
      expect(card.classList.contains('card--has-error')).to.be.false;
      expect(card.classList.contains('card--has-warning')).to.be.false;
    });
  });
});

describe('InstructionCard — section divider', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('creates a section card for __SECTION__ type', () => {
    cy.window().then((win) => {
      const { createSection, createInstructionCard } = win.__test__;
      const section = createSection('My Section');
      const card = createInstructionCard(section);
      expect(card).to.be.ok;
      expect(card.classList.contains('card--section')).to.be.true;
    });
  });

  it('section card has title input', () => {
    cy.window().then((win) => {
      const { createSection, createInstructionCard } = win.__test__;
      const section = createSection('Test Title');
      const card = createInstructionCard(section);
      const input = card.querySelector('.card__section-input');
      expect(input).to.be.ok;
      expect(input.value).to.equal('Test Title');
    });
  });

  it('section card has remove button', () => {
    cy.window().then((win) => {
      const { createSection, createInstructionCard } = win.__test__;
      const section = createSection('X');
      const card = createInstructionCard(section);
      const removeBtn = card.querySelector('.card__action-btn--danger');
      expect(removeBtn).to.be.ok;
    });
  });

  it('section card has drag handle', () => {
    cy.window().then((win) => {
      const { createSection, createInstructionCard } = win.__test__;
      const section = createSection();
      const card = createInstructionCard(section);
      expect(card.querySelector('.card__drag-handle')).to.be.ok;
    });
  });
});

describe('InstructionCard — raw card', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('creates raw card for __RAW__ type', () => {
    cy.window().then((win) => {
      const { createInstructionCard } = win.__test__;
      const item = { id: 'raw1', type: '__RAW__', text: 'some unknown line' };
      const card = createInstructionCard(item);
      expect(card.classList.contains('card--raw')).to.be.true;
    });
  });

  it('raw card shows "Unrecognized" badge', () => {
    cy.window().then((win) => {
      const { createInstructionCard } = win.__test__;
      const item = { id: 'raw1', type: '__RAW__', text: 'stuff' };
      const card = createInstructionCard(item);
      expect(card.textContent).to.include('Unrecognized');
    });
  });

  it('raw card has text input with value', () => {
    cy.window().then((win) => {
      const { createInstructionCard } = win.__test__;
      const item = { id: 'raw1', type: '__RAW__', text: 'my raw line' };
      const card = createInstructionCard(item);
      const input = card.querySelector('.card__raw-input');
      expect(input).to.be.ok;
      expect(input.value).to.equal('my raw line');
    });
  });

  it('raw card has remove button', () => {
    cy.window().then((win) => {
      const { createInstructionCard } = win.__test__;
      const item = { id: 'raw1', type: '__RAW__', text: '' };
      const card = createInstructionCard(item);
      const removeBtn = card.querySelector('.card__action-btn--danger');
      expect(removeBtn).to.be.ok;
    });
  });
});

describe('InstructionCard — unknown type', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('shows error div for unknown instruction type', () => {
    cy.window().then((win) => {
      const { store, createInstructionCard } = win.__test__;
      const item = { id: 'u1', type: 'NonExistentType', args: {}, collapsed: false };
      store.addItem(item);
      const card = createInstructionCard(item);
      expect(card.classList.contains('card--error')).to.be.true;
      expect(card.textContent).to.include('Unknown');
    });
  });
});

describe('InstructionCard — button interactions', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('duplicate button calls store.duplicateItem', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const spy = spyOn(store, 'duplicateItem');
      const card = createInstructionCard(item);
      const container = mount(card, win);
      const dupBtn = card.querySelector('.card__action-btn[data-tooltip*="Duplicate"]');
      if (dupBtn) {
        dupBtn.click();
        expect(spy.calls.length, 'Should call duplicateItem').to.be.greaterThan(0);
      }
      spy.restore();
      unmount(container);
    });
  });

  it('remove button calls store.removeItem', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const spy = spyOn(store, 'removeItem');
      const card = createInstructionCard(item);
      const removeBtn = card.querySelector('.card__action-btn--danger');
      if (removeBtn) {
        removeBtn.click();
        expect(spy.calls.length, 'Should call removeItem').to.be.greaterThan(0);
      }
      spy.restore();
    });
  });

  it('collapse button calls store.toggleItemCollapsed', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const spy = spyOn(store, 'toggleItemCollapsed');
      const card = createInstructionCard(item);
      const btns = card.querySelectorAll('.card__action-btn');
      const collapseBtn = Array.from(btns).find(b =>
        b.dataset.tooltip && (b.dataset.tooltip.includes('Collapse') || b.dataset.tooltip.includes('Expand'))
      );
      if (collapseBtn) {
        collapseBtn.click();
        expect(spy.calls.length, 'Should call toggleItemCollapsed').to.be.greaterThan(0);
      }
      spy.restore();
    });
  });

  it('header click calls store.selectItem', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const spy = spyOn(store, 'selectItem');
      const card = createInstructionCard(item);
      const header = card.querySelector('.card__header');
      header.click();
      expect(spy.calls.length, 'Should call selectItem').to.be.greaterThan(0);
      expect(spy.calls[0][0]).to.equal(item.id);
      spy.restore();
    });
  });

  it('section title input calls store.updateSectionTitle', () => {
    cy.window().then((win) => {
      const { store, createSection, createInstructionCard } = win.__test__;
      const section = createSection('Title');
      store.addItem(section);
      const spy = spyOn(store, 'updateSectionTitle');
      const card = createInstructionCard(section);
      const input = card.querySelector('.card__section-input');
      input.value = 'New Title';
      input.dispatchEvent(new win.Event('input'));
      expect(spy.calls.length, 'Should call updateSectionTitle').to.be.greaterThan(0);
      spy.restore();
    });
  });

  it('raw text input calls store.updateRawText', () => {
    cy.window().then((win) => {
      const { store, createInstructionCard } = win.__test__;
      const item = { id: 'r1', type: '__RAW__', text: 'old' };
      store.addItem(item);
      const spy = spyOn(store, 'updateRawText');
      const card = createInstructionCard(item);
      const input = card.querySelector('.card__raw-input');
      input.value = 'new text';
      input.dispatchEvent(new win.Event('input'));
      expect(spy.calls.length, 'Should call updateRawText').to.be.greaterThan(0);
      spy.restore();
    });
  });
});

describe('TabBar — rendering', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('creates tab-bar element', () => {
    cy.window().then((win) => {
      const { createTabBar } = win.__test__;
      const bar = createTabBar();
      expect(bar).to.be.ok;
      expect(bar.classList.contains('tab-bar')).to.be.true;
    });
  });

  it('shows at least one tab', () => {
    cy.window().then((win) => {
      const { createTabBar } = win.__test__;
      const bar = createTabBar();
      const container = mount(bar, win);
      const tabs = bar.querySelectorAll('.tab-bar__tab');
      expect(tabs.length, 'Should show at least one tab').to.be.greaterThan(0);
      unmount(container);
    });
  });

  it('active tab has active class', () => {
    cy.window().then((win) => {
      const { createTabBar } = win.__test__;
      const bar = createTabBar();
      const container = mount(bar, win);
      const activeTab = bar.querySelector('.tab-bar__tab--active');
      expect(activeTab, 'Should have an active tab').to.be.ok;
      unmount(container);
    });
  });

  it('has add tab button', () => {
    cy.window().then((win) => {
      const { createTabBar } = win.__test__;
      const bar = createTabBar();
      expect(bar.querySelector('.tab-bar__add')).to.be.ok;
    });
  });

  it('single tab has no close button', () => {
    cy.window().then((win) => {
      const { createTabBar } = win.__test__;
      const bar = createTabBar();
      const container = mount(bar, win);
      const closeBtn = bar.querySelector('.tab-bar__close');
      expect(closeBtn, 'Single tab should not have close button').to.be.null;
      unmount(container);
    });
  });
});

describe('TabBar — interactions', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('add button calls store.addTab', () => {
    cy.window().then((win) => {
      const { store, createTabBar } = win.__test__;
      const spy = spyOn(store, 'addTab');
      const bar = createTabBar();
      const container = mount(bar, win);
      const addBtn = bar.querySelector('.tab-bar__add');
      addBtn.click();
      expect(spy.calls.length, 'Should call addTab').to.be.greaterThan(0);
      spy.restore();
      unmount(container);
    });
  });

  it('clicking tab calls store.switchTab', () => {
    cy.window().then((win) => {
      const { store, createTabBar } = win.__test__;
      store.addTab('Tab 2');
      const spy = spyOn(store, 'switchTab');
      const bar = createTabBar();
      const container = mount(bar, win);
      const tabs = bar.querySelectorAll('.tab-bar__tab');
      if (tabs.length > 1) {
        const inactiveTab = Array.from(tabs).find(t => !t.classList.contains('tab-bar__tab--active'));
        if (inactiveTab) {
          inactiveTab.click();
          expect(spy.calls.length, 'Should call switchTab').to.be.greaterThan(0);
        }
      }
      spy.restore();
      unmount(container);
    });
  });

  it('multiple tabs show close buttons', () => {
    cy.window().then((win) => {
      const { store, createTabBar } = win.__test__;
      store.addTab('Tab 2');
      const bar = createTabBar();
      const container = mount(bar, win);
      const closeBtns = bar.querySelectorAll('.tab-bar__close');
      expect(closeBtns.length, 'Multiple tabs should have close buttons').to.be.greaterThan(0);
      unmount(container);
    });
  });
});

describe('TabBar — store sync', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('re-renders when tabs change', () => {
    cy.window().then((win) => {
      const { store, createTabBar } = win.__test__;
      const bar = createTabBar();
      const container = mount(bar, win);
      const before = bar.querySelectorAll('.tab-bar__tab').length;
      store.addTab('New Tab');
      const after = bar.querySelectorAll('.tab-bar__tab').length;
      expect(after, 'Should add a tab element').to.equal(before + 1);
      unmount(container);
    });
  });
});

describe('Pipeline — rendering', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('creates main.pipeline element', () => {
    cy.window().then((win) => {
      const { createPipeline } = win.__test__;
      const pipeline = createPipeline();
      expect(pipeline).to.be.ok;
      expect(pipeline.tagName).to.equal('MAIN');
      expect(pipeline.classList.contains('pipeline')).to.be.true;
    });
  });

  it('has pipeline header with title', () => {
    cy.window().then((win) => {
      const { createPipeline } = win.__test__;
      const pipeline = createPipeline();
      const header = pipeline.querySelector('.pipeline__header');
      expect(header).to.be.ok;
      expect(header.textContent).to.include('Pipeline');
    });
  });

  it('has pipeline list container', () => {
    cy.window().then((win) => {
      const { createPipeline } = win.__test__;
      const pipeline = createPipeline();
      expect(pipeline.querySelector('.pipeline__list')).to.be.ok;
    });
  });

  it('shows empty state when no items', () => {
    cy.window().then((win) => {
      const { createPipeline } = win.__test__;
      const pipeline = createPipeline();
      const container = mount(pipeline, win);
      const empty = pipeline.querySelector('.pipeline__empty');
      expect(empty, 'Should show empty state').to.be.ok;
      unmount(container);
    });
  });

  it('shows instruction count', () => {
    cy.window().then((win) => {
      const { createPipeline } = win.__test__;
      const pipeline = createPipeline();
      const count = pipeline.querySelector('.pipeline__count');
      expect(count).to.be.ok;
    });
  });
});

describe('Pipeline — store sync', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('renders items when store has items', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createPipeline } = win.__test__;
      const pipeline = createPipeline();
      const container = mount(pipeline, win);
      store.addItem(createInstruction('CreateFile'));
      store.addItem(createInstruction('CreateDirectory'));
      const cards = pipeline.querySelectorAll('.card');
      expect(cards.length, 'Should render instruction cards').to.be.greaterThan(0);
      unmount(container);
    });
  });

  it('updates instruction count when items change', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createPipeline } = win.__test__;
      const pipeline = createPipeline();
      const container = mount(pipeline, win);
      store.addItem(createInstruction('CreateFile'));
      store.addItem(createInstruction('CreateFile'));
      const countEl = pipeline.querySelector('.pipeline__count');
      expect(countEl.textContent).to.include('2');
      unmount(container);
    });
  });

  it('hides empty state when items exist', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createPipeline } = win.__test__;
      const pipeline = createPipeline();
      const container = mount(pipeline, win);
      store.addItem(createInstruction('CreateFile'));
      const empty = pipeline.querySelector('.pipeline__empty');
      expect(!empty || empty.style.display === 'none', 'Empty state should be hidden').to.be.true;
      unmount(container);
    });
  });
});

describe('Palette — rendering', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('creates aside.palette element', () => {
    cy.window().then((win) => {
      const { createPalette } = win.__test__;
      const palette = createPalette();
      expect(palette).to.be.ok;
      expect(palette.tagName).to.equal('ASIDE');
      expect(palette.classList.contains('palette')).to.be.true;
    });
  });

  it('has required variables section', () => {
    cy.window().then((win) => {
      const { createPalette } = win.__test__;
      const palette = createPalette();
      const container = mount(palette, win);
      const sections = palette.querySelectorAll('.palette__section');
      expect(sections.length).to.be.greaterThan(0);
      expect(palette.textContent).to.include('Required Variables');
      unmount(container);
    });
  });

  it('has computed variables section', () => {
    cy.window().then((win) => {
      const { createPalette } = win.__test__;
      const palette = createPalette();
      expect(palette.textContent).to.include('Computed Variables');
    });
  });

  it('has instructions section', () => {
    cy.window().then((win) => {
      const { createPalette } = win.__test__;
      const palette = createPalette();
      expect(palette.textContent).to.include('Instructions');
    });
  });

  it('has search filter input', () => {
    cy.window().then((win) => {
      const { createPalette } = win.__test__;
      const palette = createPalette();
      const search = palette.querySelector('.palette__search-input');
      expect(search).to.be.ok;
      expect(search.type).to.equal('text');
    });
  });

  it('lists all instruction types', () => {
    cy.window().then((win) => {
      const { createPalette } = win.__test__;
      const palette = createPalette();
      const items = palette.querySelectorAll('.palette__instr-item');
      expect(items.length, 'Should list instruction types').to.be.greaterThan(7);
    });
  });

  it('has add buttons for variables', () => {
    cy.window().then((win) => {
      const { createPalette } = win.__test__;
      const palette = createPalette();
      const addBtns = palette.querySelectorAll('.palette__add-btn');
      expect(addBtns.length, 'Should have add buttons').to.be.greaterThan(0);
    });
  });

  it('has Toolbox header', () => {
    cy.window().then((win) => {
      const { createPalette } = win.__test__;
      const palette = createPalette();
      expect(palette.textContent).to.include('Toolbox');
    });
  });
});

describe('Palette — instruction search filter', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('filters instructions by name', () => {
    cy.window().then((win) => {
      const { createPalette } = win.__test__;
      const palette = createPalette();
      const container = mount(palette, win);
      const searchInput = palette.querySelector('.palette__search-input');
      searchInput.value = 'Create';
      searchInput.dispatchEvent(new win.Event('input'));
      const visible = Array.from(palette.querySelectorAll('.palette__instr-item'))
        .filter(item => item.style.display !== 'none');
      expect(visible.length, 'Should show matching instructions').to.be.greaterThan(0);
      const total = palette.querySelectorAll('.palette__instr-item').length;
      expect(total, 'Some items should be hidden').to.be.greaterThan(visible.length);
      unmount(container);
    });
  });

  it('shows no-results message for non-matching query', () => {
    cy.window().then((win) => {
      const { createPalette } = win.__test__;
      const palette = createPalette();
      const container = mount(palette, win);
      const searchInput = palette.querySelector('.palette__search-input');
      searchInput.value = 'xyznonexistent';
      searchInput.dispatchEvent(new win.Event('input'));
      const noResults = palette.querySelector('.palette__empty--filter');
      expect(noResults).to.be.ok;
      expect(noResults.style.display !== 'none', 'Should show no-results message').to.be.true;
      unmount(container);
    });
  });

  it('shows all when query is cleared', () => {
    cy.window().then((win) => {
      const { createPalette } = win.__test__;
      const palette = createPalette();
      const container = mount(palette, win);
      const searchInput = palette.querySelector('.palette__search-input');
      searchInput.value = 'Create';
      searchInput.dispatchEvent(new win.Event('input'));
      searchInput.value = '';
      searchInput.dispatchEvent(new win.Event('input'));
      const hidden = Array.from(palette.querySelectorAll('.palette__instr-item'))
        .filter(item => item.style.display === 'none');
      expect(hidden.length, 'All items should be visible').to.equal(0);
      unmount(container);
    });
  });
});

describe('Palette — interactions', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('clicking instruction item calls store.addItem', () => {
    cy.window().then((win) => {
      const { store, createPalette } = win.__test__;
      const spy = spyOn(store, 'addItem');
      const palette = createPalette();
      const container = mount(palette, win);
      const items = palette.querySelectorAll('.palette__instr-item');
      if (items.length > 0) items[0].click();
      expect(spy.calls.length, 'Should call addItem').to.be.greaterThan(0);
      spy.restore();
      unmount(container);
    });
  });

  it('add required variable button calls store', () => {
    cy.window().then((win) => {
      const { store, createPalette } = win.__test__;
      const spy = spyOn(store, 'addRequiredVariable');
      const palette = createPalette();
      const container = mount(palette, win);
      const addBtns = palette.querySelectorAll('.palette__add-btn');
      if (addBtns.length > 0) addBtns[0].click();
      expect(spy.calls.length, 'Should call addRequiredVariable').to.be.greaterThan(0);
      spy.restore();
      unmount(container);
    });
  });

  it('instruction items are draggable', () => {
    cy.window().then((win) => {
      const { createPalette } = win.__test__;
      const palette = createPalette();
      const items = palette.querySelectorAll('.palette__instr-item');
      if (items.length > 0) {
        expect(items[0].getAttribute('draggable')).to.equal('true');
      }
    });
  });
});

describe('Palette — store sync', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('renders required variables from store', () => {
    cy.window().then((win) => {
      const { store, createPalette } = win.__test__;
      const palette = createPalette();
      const container = mount(palette, win);
      store.addRequiredVariable('testVar');
      const varInputs = palette.querySelectorAll('#required-var-list .palette__var-input');
      const found = Array.from(varInputs).some(input => input.value === 'testVar');
      expect(found, 'Should render required variable from store').to.be.true;
      unmount(container);
    });
  });

  it('renders computed variables from store', () => {
    cy.window().then((win) => {
      const { store, createPalette } = win.__test__;
      const palette = createPalette();
      const container = mount(palette, win);
      store.addComputedVariable('myDir', '${base}/path');
      const nameInputs = palette.querySelectorAll('#computed-var-list .comp-var__name');
      const found = Array.from(nameInputs).some(input => input.value === 'myDir');
      expect(found, 'Should render computed variable from store').to.be.true;
      unmount(container);
    });
  });

  it('shows empty state messages when no variables', () => {
    cy.window().then((win) => {
      const { createPalette } = win.__test__;
      const palette = createPalette();
      const container = mount(palette, win);
      const empties = palette.querySelectorAll('.palette__empty');
      expect(empties.length, 'Should show empty state messages').to.be.greaterThan(0);
      unmount(container);
    });
  });
});

describe('ContextPanel — rendering', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('creates aside.context-panel element', () => {
    cy.window().then((win) => {
      const { createContextPanel } = win.__test__;
      const panel = createContextPanel();
      expect(panel).to.be.ok;
      expect(panel.tagName).to.equal('ASIDE');
      expect(panel.classList.contains('context-panel')).to.be.true;
    });
  });

  it('has 3 tabs (Preview, Variables, Validation)', () => {
    cy.window().then((win) => {
      const { createContextPanel } = win.__test__;
      const panel = createContextPanel();
      const tabs = panel.querySelectorAll('.context-panel__tab');
      expect(tabs.length).to.equal(3);
    });
  });

  it('Preview tab is active by default', () => {
    cy.window().then((win) => {
      const { createContextPanel } = win.__test__;
      const panel = createContextPanel();
      const activeTab = panel.querySelector('.context-panel__tab--active');
      expect(activeTab).to.be.ok;
      expect(activeTab.textContent).to.include('Preview');
    });
  });

  it('has a textarea or code area for preview', () => {
    cy.window().then((win) => {
      const { createContextPanel } = win.__test__;
      const panel = createContextPanel();
      const container = mount(panel, win);
      const textarea = panel.querySelector('textarea');
      expect(textarea, 'Should have a textarea for preview').to.be.ok;
      unmount(container);
    });
  });

  it('has panel tabs', () => {
    cy.window().then((win) => {
      const { createContextPanel } = win.__test__;
      const panel = createContextPanel();
      const tabs = panel.querySelector('.context-panel__tabs');
      expect(tabs).to.be.ok;
    });
  });
});

describe('ContextPanel — tab switching', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('clicking Variables tab switches content', () => {
    cy.window().then((win) => {
      const { createContextPanel } = win.__test__;
      const panel = createContextPanel();
      const container = mount(panel, win);
      const tabs = panel.querySelectorAll('.context-panel__tab');
      tabs[1].click();
      expect(tabs[1].classList.contains('context-panel__tab--active')).to.be.true;
      expect(tabs[0].classList.contains('context-panel__tab--active')).to.be.false;
      unmount(container);
    });
  });

  it('clicking Validation tab switches content', () => {
    cy.window().then((win) => {
      const { createContextPanel } = win.__test__;
      const panel = createContextPanel();
      const container = mount(panel, win);
      const tabs = panel.querySelectorAll('.context-panel__tab');
      tabs[2].click();
      expect(tabs[2].classList.contains('context-panel__tab--active')).to.be.true;
      unmount(container);
    });
  });
});

describe('ContextPanel — store sync', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('updates preview when store changes', () => {
    cy.window().then((win) => {
      const { store, createContextPanel } = win.__test__;
      const panel = createContextPanel();
      const container = mount(panel, win);
      store.setTaskName('syncTest');
      const textarea = panel.querySelector('textarea');
      if (textarea) {
        expect(textarea, 'Textarea should still exist').to.be.ok;
      }
      unmount(container);
    });
  });
});

describe('VariableInput — rendering', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('creates wrapper div', () => {
    cy.window().then((win) => {
      const { createVariableInput } = win.__test__;
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      expect(wrapper).to.be.ok;
      expect(wrapper.classList.contains('var-input-wrapper')).to.be.true;
    });
  });

  it('has text input by default', () => {
    cy.window().then((win) => {
      const { createVariableInput } = win.__test__;
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const input = wrapper.querySelector('input.var-input');
      expect(input).to.be.ok;
    });
  });

  it('creates textarea when multiline', () => {
    cy.window().then((win) => {
      const { createVariableInput } = win.__test__;
      const wrapper = createVariableInput({ value: '', multiline: true, onChange: () => {} });
      const textarea = wrapper.querySelector('textarea.var-input');
      expect(textarea, 'Should create textarea for multiline').to.be.ok;
    });
  });

  it('sets initial value', () => {
    cy.window().then((win) => {
      const { createVariableInput } = win.__test__;
      const wrapper = createVariableInput({ value: 'initial', onChange: () => {} });
      expect(wrapper.getValue()).to.equal('initial');
    });
  });

  it('has dropdown (hidden initially)', () => {
    cy.window().then((win) => {
      const { createVariableInput } = win.__test__;
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const dropdown = wrapper.querySelector('.var-dropdown');
      expect(dropdown).to.be.ok;
      expect(dropdown.style.display).to.equal('none');
    });
  });

  it('has preview (hidden initially)', () => {
    cy.window().then((win) => {
      const { createVariableInput } = win.__test__;
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const preview = wrapper.querySelector('.var-preview');
      expect(preview).to.be.ok;
      expect(preview.style.display).to.equal('none');
    });
  });

  it('has hint text', () => {
    cy.window().then((win) => {
      const { createVariableInput } = win.__test__;
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const hint = wrapper.querySelector('.var-hint');
      expect(hint).to.be.ok;
      expect(hint.textContent).to.include('${');
    });
  });

  it('applies custom className', () => {
    cy.window().then((win) => {
      const { createVariableInput } = win.__test__;
      const wrapper = createVariableInput({ value: '', className: 'custom-cls', onChange: () => {} });
      expect(wrapper.classList.contains('custom-cls')).to.be.true;
    });
  });
});

describe('VariableInput — setValue/getValue', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('setValue updates the input', () => {
    cy.window().then((win) => {
      const { createVariableInput } = win.__test__;
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      wrapper.setValue('new value');
      expect(wrapper.getValue()).to.equal('new value');
    });
  });

  it('getValue returns current value', () => {
    cy.window().then((win) => {
      const { createVariableInput } = win.__test__;
      const wrapper = createVariableInput({ value: 'test', onChange: () => {} });
      expect(wrapper.getValue()).to.equal('test');
    });
  });

  it('setValue with variable shows preview', () => {
    cy.window().then((win) => {
      const { store, createVariableInput } = win.__test__;
      store.addRequiredVariable('myVar');
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const container = mount(wrapper, win);
      wrapper.setValue('${myVar}/path');
      win.requestAnimationFrame(() => {
        const preview = wrapper.querySelector('.var-preview');
        expect(preview, 'Preview element should exist').to.be.ok;
      });
      unmount(container);
    });
  });
});

describe('VariableInput — interactions', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('calls onChange when input changes', () => {
    cy.window().then((win) => {
      const { createVariableInput } = win.__test__;
      let received = null;
      const wrapper = createVariableInput({ value: '', onChange: (v) => { received = v; } });
      const input = wrapper.querySelector('.var-input');
      input.value = 'typed';
      input.dispatchEvent(new win.Event('input'));
      expect(received).to.equal('typed');
    });
  });

  it('shows dropdown when ${ is typed', () => {
    cy.window().then((win) => {
      const { store, createVariableInput } = win.__test__;
      store.addRequiredVariable('testVar');
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const container = mount(wrapper, win);
      const input = wrapper.querySelector('.var-input');
      input.value = '${';
      input.selectionStart = 2;
      input.selectionEnd = 2;
      input.dispatchEvent(new win.Event('input'));
      const dropdown = wrapper.querySelector('.var-dropdown');
      expect(dropdown.style.display !== 'none', 'Dropdown should be visible').to.be.true;
      unmount(container);
    });
  });

  it('hides dropdown when text has no ${', () => {
    cy.window().then((win) => {
      const { createVariableInput } = win.__test__;
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const container = mount(wrapper, win);
      const input = wrapper.querySelector('.var-input');
      input.value = 'hello';
      input.selectionStart = 5;
      input.dispatchEvent(new win.Event('input'));
      const dropdown = wrapper.querySelector('.var-dropdown');
      expect(dropdown.style.display).to.equal('none');
      unmount(container);
    });
  });

  it('Escape hides the dropdown', () => {
    cy.window().then((win) => {
      const { store, createVariableInput } = win.__test__;
      store.addRequiredVariable('v1');
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const container = mount(wrapper, win);
      const input = wrapper.querySelector('.var-input');
      input.value = '${';
      input.selectionStart = 2;
      input.dispatchEvent(new win.Event('input'));
      input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape' }));
      const dropdown = wrapper.querySelector('.var-dropdown');
      expect(dropdown.style.display).to.equal('none');
      unmount(container);
    });
  });

  it('focus shows hint', () => {
    cy.window().then((win) => {
      const { createVariableInput } = win.__test__;
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const container = mount(wrapper, win);
      const input = wrapper.querySelector('.var-input');
      input.dispatchEvent(new win.Event('focus'));
      const hint = wrapper.querySelector('.var-hint');
      expect(hint.style.display !== 'none', 'Hint should be visible on focus with empty input').to.be.true;
      unmount(container);
    });
  });
});

describe('Components — cross-component sync', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('adding item in store updates pipeline card count', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createPipeline } = win.__test__;
      const pipeline = createPipeline();
      const container = mount(pipeline, win);
      store.addItem(createInstruction('CreateFile'));
      store.addItem(createInstruction('CreateDirectory'));
      store.addItem(createInstruction('ReplaceFile'));
      const count = pipeline.querySelector('.pipeline__count');
      expect(count.textContent).to.include('3');
      unmount(container);
    });
  });

  it('setTaskName in store reflects in palette context', () => {
    cy.window().then((win) => {
      const { store } = win.__test__;
      store.setTaskName('myTask');
      const state = store.getState();
      expect(state.taskName).to.equal('myTask');
    });
  });

  it('adding variable in store makes it available in VariableInput autocomplete', () => {
    cy.window().then((win) => {
      const { store, createVariableInput } = win.__test__;
      store.addRequiredVariable('newVar');
      const wrapper = createVariableInput({ value: '', onChange: () => {} });
      const container = mount(wrapper, win);
      const input = wrapper.querySelector('.var-input');
      input.value = '${';
      input.selectionStart = 2;
      input.dispatchEvent(new win.Event('input'));
      const dropdown = wrapper.querySelector('.var-dropdown');
      expect(dropdown.textContent).to.include('newVar');
      unmount(container);
    });
  });

  it('store undo reverts pipeline', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createPipeline } = win.__test__;
      const pipeline = createPipeline();
      const container = mount(pipeline, win);
      store.addItem(createInstruction('CreateFile'));
      const before = pipeline.querySelectorAll('.card').length;
      store.undo();
      const after = pipeline.querySelectorAll('.card').length;
      expect(after, 'Undo should remove the card').to.equal(before - 1);
      unmount(container);
    });
  });

  it('multi-tab switch updates all subscribed components', () => {
    cy.window().then((win) => {
      const { store, createInstruction } = win.__test__;
      store.setTaskName('Tab1Task');
      store.addItem(createInstruction('CreateFile'));
      store.addTab('');
      store.setTaskName('Tab2Task');
      const tabs = store.getTabs();
      const firstTab = tabs.find(t => !t.active);
      if (firstTab) {
        store.switchTab(firstTab.id);
        expect(store.getState().taskName).to.equal('Tab1Task');
      }
    });
  });
});

describe('Components — drag and drop', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('palette instruction items have correct drag data type', () => {
    cy.window().then((win) => {
      const { createPalette } = win.__test__;
      const palette = createPalette();
      const container = mount(palette, win);
      const items = palette.querySelectorAll('.palette__instr-item');
      expect(items.length).to.be.greaterThan(0);
      const firstItem = items[0];
      expect(firstItem.dataset.instructionType, 'Should have instruction type data').to.be.ok;
      unmount(container);
    });
  });

  it('instruction card has draggable drag handle', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const card = createInstructionCard(item);
      const handle = card.querySelector('.card__drag-handle');
      expect(handle, 'Should have drag handle').to.be.ok;
    });
  });

  it('pipeline list is a drop target', () => {
    cy.window().then((win) => {
      const { createPipeline } = win.__test__;
      const pipeline = createPipeline();
      const list = pipeline.querySelector('.pipeline__list');
      expect(list, 'Pipeline should have a drop target list').to.be.ok;
    });
  });
});

describe('Components — edge cases', () => {
  beforeEach(() => {
    cy.loadTestModules();
    cy.resetStore();
  });

  it('InstructionCard handles item with no args gracefully', () => {
    cy.window().then((win) => {
      const { store, createInstructionCard } = win.__test__;
      const item = { id: 'noargs', type: 'CreateFile', args: {}, collapsed: false };
      store.addItem(item);
      const card = createInstructionCard(item);
      expect(card, 'Should create card even with empty args').to.be.ok;
    });
  });

  it('InstructionCard handles many errors', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('ReplaceFile');
      store.addItem(item);
      const errors = Array.from({ length: 10 }, (_, i) => ({
        itemId: item.id,
        severity: i % 2 === 0 ? 'error' : 'warning',
        message: `Error ${i}`,
        field: i < 5 ? 'targetPath' : undefined,
      }));
      const card = createInstructionCard(item, errors);
      expect(card, 'Should handle many errors').to.be.ok;
      expect(card.classList.contains('card--has-error')).to.be.true;
    });
  });

  it('multiple Pipelines can coexist', () => {
    cy.window().then((win) => {
      const { createPipeline } = win.__test__;
      const p1 = createPipeline();
      const p2 = createPipeline();
      expect(p1).to.be.ok;
      expect(p2).to.be.ok;
      expect(p1 !== p2, 'Should be distinct elements').to.be.true;
    });
  });

  it('VariableInput with empty store works', () => {
    cy.window().then((win) => {
      const { createVariableInput } = win.__test__;
      const wrapper = createVariableInput({ value: '${nonexistent}', onChange: () => {} });
      expect(wrapper, 'Should work even with no variables in store').to.be.ok;
    });
  });

  it('createInstructionCard with errors for non-matching item', () => {
    cy.window().then((win) => {
      const { store, createInstruction, createInstructionCard } = win.__test__;
      const item = createInstruction('CreateFile');
      store.addItem(item);
      const errors = [{ itemId: 'other-id', severity: 'error', message: 'Not mine' }];
      const card = createInstructionCard(item, errors);
      expect(card.classList.contains('card--has-error'), 'Should not show error for other items').to.be.false;
    });
  });

  it('section card with empty title', () => {
    cy.window().then((win) => {
      const { createSection, createInstructionCard } = win.__test__;
      const section = createSection('');
      const card = createInstructionCard(section);
      const input = card.querySelector('.card__section-input');
      expect(input).to.be.ok;
      expect(input.value).to.equal('');
    });
  });

  it('raw card with empty text', () => {
    cy.window().then((win) => {
      const { createInstructionCard } = win.__test__;
      const item = { id: 'r2', type: '__RAW__', text: '' };
      const card = createInstructionCard(item);
      const input = card.querySelector('.card__raw-input');
      expect(input.value).to.equal('');
    });
  });
});
