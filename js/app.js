// ─── Main Application ────────────────────────────────────────────

import { store } from './store.js';
import { createToolbar, toggleShortcutsOverlay, handleSave } from './components/Toolbar.js';
import { createTabBar } from './components/TabBar.js';
import { createPalette } from './components/Palette.js';
import { createPipeline } from './components/Pipeline.js';
import { createContextPanel } from './components/ContextPanel.js';
import { validate } from './lib/validator.js';
import { initTooltips } from './lib/tooltip.js';
import { debounce, el, clearChildren } from './utils/dom.js';
import { icon } from './icons.js';
import { maybeShowOnboarding, showOnboarding } from './components/OnboardingGuide.js';
import { openHelpCenter } from './components/HelpCenter.js';
import { SAMPLE_TASK_STATE } from './sampleTask.js';

// ── Cmd/Ctrl+S interception ──────────────────────────────────────
// Registered at module level (earliest possible) to reliably beat
// the browser's native "Save Page As" dialog on every platform.
window.addEventListener('keydown', (e) => {
  const isSave = (e.metaKey || e.ctrlKey)
    && (e.code === 'KeyS' || e.key === 's' || e.key === 'S');
  if (isSave) {
    e.preventDefault();
    e.stopImmediatePropagation();
    handleSave();
  }
}, true);

function init() {
  const app = document.getElementById('app');
  if (!app) return;

  // ── Keyboard shortcuts ──────────────────────────────────────────
  // Cmd/Ctrl+S is handled at module level (above) for earliest interception.
  // Other shortcuts use bubble phase so native INPUT/TEXTAREA behaviour
  // (text undo, redo, select-all, etc.) is preserved when an editable field is focused.
  document.addEventListener('keydown', (e) => {
    const isMod = e.metaKey || e.ctrlKey;
    const inEditable = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'
      || e.target.isContentEditable;

    if (isMod && e.key === 'z' && !e.shiftKey && !inEditable) {
      e.preventDefault();
      store.undo();
    } else if (isMod && e.key === 'z' && e.shiftKey && !inEditable) {
      e.preventDefault();
      store.redo();
    } else if (isMod && e.key === 'd' && !inEditable) {
      e.preventDefault();
      const selected = store.getState().selectedItemId;
      if (selected) store.duplicateItem(selected);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && !inEditable) {
      const selected = store.getState().selectedItemId;
      if (selected) { e.preventDefault(); store.removeItem(selected); }
    } else if (e.key === '?' && !inEditable) {
      e.preventDefault();
      toggleShortcutsOverlay();
    } else if (e.key === 'Escape') {
      const overlay = document.getElementById('shortcuts-overlay');
      if (overlay) { overlay.remove(); }
    }
  });

  // ── Tooltip system (must be before any DOM with data-tooltip) ──
  initTooltips();

  // ── Build layout ──
  const toolbar = createToolbar();
  const tabBar = createTabBar();
  const body = document.createElement('div');
  body.className = 'app__body';

  const palette = createPalette();
  const pipeline = createPipeline();
  const contextPanel = createContextPanel();

  // ── Resize handles ──
  const leftHandle = createResizeHandle(palette, 'left');
  const rightHandle = createResizeHandle(contextPanel, 'right');

  body.append(palette, leftHandle, pipeline, rightHandle, contextPanel);
  app.append(toolbar, tabBar, body);

  // ── Panel maximize / restore ──
  setupPanelMaximize(body, palette, pipeline, contextPanel, leftHandle, rightHandle);

  // ── Status bar ──
  const statusBar = document.createElement('footer');
  statusBar.className = 'status-bar';
  statusBar.id = 'status-bar';
  app.appendChild(statusBar);

  // ── Validation runs on debounce ──
  const runValidation = debounce(() => {
    const errors = validate(store.getState());
    store.setValidationErrors(errors);
  }, 400);

  store.subscribe((state) => {
    runValidation();
    updateStatusBar(state);
  });

  // ── Restore autosaved state or load sample ──
  const restored = store.loadFromAutosave();

  if (!restored) {
    // First visit: load the sample task so the app isn't empty
    store.loadState(SAMPLE_TASK_STATE);
  }

  // Trigger initial render
  store.setState({}, { skipHistory: true });

  // ── First visit: show Help Center; returning visitors: onboarding tour if not done ──
  if (!localStorage.getItem('scaffold-ui-guide-seen')) {
    setTimeout(() => openHelpCenter('welcome'), 500);
  } else {
    maybeShowOnboarding();
  }
}

// ─── Panel Minimize / Maximize / Restore ─────────────────────────

function setupPanelMaximize(body, palette, pipeline, contextPanel, leftHandle, rightHandle) {
  const allPanels = [palette, pipeline, contextPanel];
  const handles = [leftHandle, rightHandle];
  const savedWidths = {};
  const savedFlex = {};
  let maximizedPanel = null;

  const panelState = new Map();
  const panelBtns = new Map();
  const panelLabels = new Map(); // minimized label elements

  const panelConfigs = [
    {
      panel: palette,
      header: () => palette.querySelector('.palette__header'),
      label: 'Toolbox',
      collapseIcon: 'panelLeftClose',
      expandIcon: 'panelLeftOpen',
      adjacentHandle: leftHandle,
    },
    {
      panel: pipeline,
      header: () => pipeline.querySelector('.pipeline__header'),
      label: 'Pipeline',
      collapseIcon: 'minus',
      expandIcon: 'maximize',
      adjacentHandle: null, // both handles border pipeline
    },
    {
      panel: contextPanel,
      header: () => contextPanel.querySelector('.context-panel__tabs'),
      label: 'Preview',
      collapseIcon: 'panelRightClose',
      expandIcon: 'panelRightOpen',
      adjacentHandle: rightHandle,
    },
  ];

  function pid(p) {
    if (p === palette) return 'palette';
    if (p === pipeline) return 'pipeline';
    return 'context';
  }

  // Make remaining visible panels fill the freed space
  function redistributeSpace() {
    const normalPanels = allPanels.filter(p => panelState.get(p) === 'normal');
    const anyMinimized = allPanels.some(p => panelState.get(p) === 'minimized');

    // Reset overrides first
    allPanels.forEach(p => {
      p.classList.remove('panel--fill');
      p.style.flex = savedFlex[pid(p)] || '';
    });

    // If any panel is minimized, let normal panels expand to fill the gap
    if (anyMinimized) {
      normalPanels.forEach(p => {
        p.classList.add('panel--fill');
        p.style.flex = '1';
      });
    }

    // Hide resize handles adjacent to minimized panels
    leftHandle.style.display = (panelState.get(palette) === 'minimized') ? 'none' : '';
    rightHandle.style.display = (panelState.get(contextPanel) === 'minimized') ? 'none' : '';
    // Hide both handles if pipeline is minimized
    if (panelState.get(pipeline) === 'minimized') {
      leftHandle.style.display = 'none';
      rightHandle.style.display = 'none';
    }
  }

  function restoreAll() {
    allPanels.forEach(p => {
      p.classList.remove('panel--minimized', 'panel--maximized', 'panel--fill');
      p.style.display = '';
      p.style.flex = savedFlex[pid(p)] || '';
      const sw = savedWidths[pid(p)];
      if (sw) p.style.width = sw;
      else p.style.width = '';
      panelState.set(p, 'normal');
      hideMinLabel(p);
    });
    handles.forEach(h => h.style.display = '');
    body.classList.remove('app__body--maximized');
    maximizedPanel = null;
    refreshButtons();
  }

  function showMinLabel(config) {
    let lbl = panelLabels.get(config.panel);
    if (!lbl) {
      lbl = el('div', { className: 'panel-min-label' });
      const span = el('span', {}, config.label);
      lbl.appendChild(span);
      lbl.addEventListener('click', () => toggleMinimize(config));
      config.panel.appendChild(lbl);
      panelLabels.set(config.panel, lbl);
    }
    lbl.style.display = 'flex';
  }

  function hideMinLabel(p) {
    const lbl = panelLabels.get(p);
    if (lbl) lbl.style.display = 'none';
  }

  function toggleMinimize(config) {
    const { panel } = config;
    if (maximizedPanel) restoreAll();

    if (panelState.get(panel) === 'minimized') {
      // Restore
      panel.classList.remove('panel--minimized');
      panel.style.display = '';
      panel.style.flex = savedFlex[pid(panel)] || '';
      const sw = savedWidths[pid(panel)];
      if (sw) panel.style.width = sw;
      else panel.style.width = '';
      panelState.set(panel, 'normal');
      hideMinLabel(panel);
    } else {
      // Minimize
      savedWidths[pid(panel)] = panel.style.width || '';
      savedFlex[pid(panel)] = panel.style.flex || '';
      panel.style.flex = '0 0 auto';
      panel.classList.add('panel--minimized');
      panelState.set(panel, 'minimized');
      showMinLabel(config);
    }
    redistributeSpace();
    refreshButtons();
  }

  function toggleMaximize(config) {
    const { panel } = config;
    if (maximizedPanel === panel) { restoreAll(); return; }

    allPanels.forEach(p => {
      savedWidths[pid(p)] = p.style.width || '';
      savedFlex[pid(p)] = p.style.flex || '';
      p.classList.remove('panel--minimized');
      hideMinLabel(p);
      if (p !== panel) {
        p.style.display = 'none';
      } else {
        p.style.width = '100%';
        p.style.flex = '1';
        p.classList.add('panel--maximized');
      }
      panelState.set(p, p === panel ? 'maximized' : 'normal');
    });
    handles.forEach(h => h.style.display = 'none');
    body.classList.add('app__body--maximized');
    maximizedPanel = panel;
    refreshButtons();
  }

  function refreshButtons() {
    panelConfigs.forEach(config => {
      const btns = panelBtns.get(config.panel);
      if (!btns) return;
      const state = panelState.get(config.panel) || 'normal';

      clearChildren(btns.minBtn);
      clearChildren(btns.maxBtn);

      if (state === 'minimized') {
        btns.minBtn.appendChild(icon(config.expandIcon, 13));
        btns.minBtn.dataset.tooltip = 'Expand ' + config.label;
        btns.maxBtn.style.display = 'none';
      } else if (state === 'maximized') {
        btns.maxBtn.appendChild(icon('minimize', 13));
        btns.maxBtn.dataset.tooltip = 'Restore ' + config.label;
        btns.minBtn.style.display = 'none';
      } else {
        btns.minBtn.appendChild(icon(config.collapseIcon, 13));
        btns.minBtn.dataset.tooltip = 'Collapse ' + config.label;
        btns.minBtn.style.display = '';
        btns.maxBtn.appendChild(icon('maximize', 13));
        btns.maxBtn.dataset.tooltip = 'Maximize ' + config.label;
        btns.maxBtn.style.display = '';
      }
    });
  }

  panelConfigs.forEach(config => {
    const headerEl = config.header();
    if (!headerEl) return;

    const btnGroup = el('div', { className: 'panel-btn-group' });
    const minBtn = el('button', { className: 'panel-ctrl-btn', onClick: () => toggleMinimize(config) });
    const maxBtn = el('button', { className: 'panel-ctrl-btn', onClick: () => toggleMaximize(config) });
    btnGroup.append(minBtn, maxBtn);
    headerEl.appendChild(btnGroup);
    panelBtns.set(config.panel, { minBtn, maxBtn });
    panelState.set(config.panel, 'normal');
  });

  refreshButtons();
}

// ─── Resizable Panel Handle ─────────────────────────────────────

function createResizeHandle(panel, side) {
  const handle = document.createElement('div');
  handle.className = 'resize-handle';
  handle.title = 'Drag to resize';

  let startX = 0;
  let startWidth = 0;
  let animFrame = null;

  function onMouseDown(e) {
    e.preventDefault();
    startX = e.clientX;
    startWidth = panel.getBoundingClientRect().width;
    handle.classList.add('resize-handle--active');
    document.body.classList.add('resizing');
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e) {
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(() => {
      const delta = e.clientX - startX;
      const newWidth = side === 'left'
        ? startWidth + delta
        : startWidth - delta;

      const min = parseInt(getComputedStyle(panel).minWidth) || 200;
      const max = parseInt(getComputedStyle(panel).maxWidth) || 600;
      const clamped = Math.max(min, Math.min(max, newWidth));

      panel.style.width = clamped + 'px';
    });
  }

  function onMouseUp() {
    handle.classList.remove('resize-handle--active');
    document.body.classList.remove('resizing');
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    if (animFrame) cancelAnimationFrame(animFrame);
  }

  handle.addEventListener('mousedown', onMouseDown);
  return handle;
}

// ─── Status Bar ─────────────────────────────────────────────────

function updateStatusBar(state) {
  const bar = document.getElementById('status-bar');
  if (!bar) return;
  clearChildren(bar);

  const instrCount = state.items.filter(i => i.type !== '__SECTION__').length;
  const varCount = state.requiredVariables.length + state.computedVariables.length;
  const errorCount = state.validationErrors.filter(e => e.severity === 'error').length;
  const warnCount = state.validationErrors.filter(e => e.severity === 'warning').length;

  bar.append(
    el('span', {}, `${instrCount} instruction${instrCount !== 1 ? 's' : ''}`),
    el('span', { className: 'status-bar__sep' }, '\u00b7'),
    el('span', {}, `${varCount} variable${varCount !== 1 ? 's' : ''}`),
  );

  if (errorCount > 0) {
    bar.append(
      el('span', { className: 'status-bar__sep' }, '\u00b7'),
      el('span', { className: 'status-bar__error' }, `${errorCount} error${errorCount !== 1 ? 's' : ''}`),
    );
  }
  if (warnCount > 0) {
    bar.append(
      el('span', { className: 'status-bar__sep' }, '\u00b7'),
      el('span', { className: 'status-bar__warn' }, `${warnCount} warning${warnCount !== 1 ? 's' : ''}`),
    );
  }
  if (errorCount === 0 && warnCount === 0 && instrCount > 0) {
    bar.append(
      el('span', { className: 'status-bar__sep' }, '\u00b7'),
      el('span', { className: 'status-bar__ok' }, 'No issues'),
    );
  }
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
