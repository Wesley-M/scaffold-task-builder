// ─── Context Panel (Right Sidebar) ───────────────────────────────
// Tabs: Preview | Variables | Validation

import { el, clearChildren } from '../utils/dom.js';
import { store } from '../store.js';
import { serializeTask, serializeTaskWithLineMap } from '../lib/serializer.js';
import { parseTaskFile } from '../lib/parser.js';
import { highlightTask } from '../lib/highlighter.js';
import { DEFAULT_VARIABLES } from '../types.js';
import { extractVariableRefs, resolveVariables, buildVariableMap } from '../lib/resolver.js';
import { icon } from '../icons.js';

const FONT_KEY = 'scaffold-ui-preview-font';
const MIN_FONT = 9;
const MAX_FONT = 20;
const DEFAULT_FONT = 12;

export function createContextPanel() {
  const panel = el('aside', { className: 'context-panel' });

  // ── Tab bar ──
  const tabs = el('div', { className: 'context-panel__tabs' });
  const tabPreview = el('button', {
    className: 'context-panel__tab context-panel__tab--active',
    dataset: { tooltip: 'Live preview of the generated .task file — editable with syntax highlighting' },
    onClick: () => switchTab('preview'),
  }, icon('eye', 14), 'Preview');
  const tabVars = el('button', {
    className: 'context-panel__tab',
    dataset: { tooltip: 'Variable usage table showing definitions, resolved values, and reference counts' },
    onClick: () => switchTab('variables'),
  }, icon('tag', 14), 'Variables');
  const tabValidation = el('button', {
    className: 'context-panel__tab',
    dataset: { tooltip: 'Real-time validation showing errors and warnings in your task definition' },
    onClick: () => switchTab('validation'),
  }, icon('checkCircle', 14), 'Validation');

  tabs.append(tabPreview, tabVars, tabValidation);

  // ── Tab content ──
  const previewContent = el('div', { className: 'context-panel__content context-panel__content--preview', id: 'tab-preview' });
  const varsContent = el('div', { className: 'context-panel__content', id: 'tab-variables', style: { display: 'none' } });
  const validationContent = el('div', { className: 'context-panel__content', id: 'tab-validation', style: { display: 'none' } });

  // ── Font size state ──
  let fontSize = parseInt(localStorage.getItem(FONT_KEY), 10) || DEFAULT_FONT;

  // ── Preview toolbar ──
  const previewToolbar = el('div', { className: 'preview__toolbar' });

  const copyBtn = el('button', {
    className: 'preview__action-btn',
    dataset: { tooltip: 'Copy to clipboard' },
    onClick: () => {
      navigator.clipboard.writeText(textarea.value).then(() => {
        clearChildren(copyBtn);
        copyBtn.append(icon('checkCircle', 12), ' Copied!');
        setTimeout(() => { clearChildren(copyBtn); copyBtn.append(icon('copy', 12), ' Copy'); }, 1500);
      });
    },
  }, icon('copy', 12), ' Copy');

  const fontLabel = el('span', { className: 'preview__font-label' }, `${fontSize}px`);
  const fontDown = el('button', {
    className: 'preview__font-btn',
    dataset: { tooltip: 'Decrease font size' },
    onClick: () => setFontSize(fontSize - 1),
  }, 'A\u2212');
  const fontUp = el('button', {
    className: 'preview__font-btn preview__font-btn--up',
    dataset: { tooltip: 'Increase font size' },
    onClick: () => setFontSize(fontSize + 1),
  }, 'A+');

  const syncIndicator = el('span', { className: 'preview__sync-indicator' });

  previewToolbar.append(
    el('span', { className: 'preview__toolbar-label' }, icon('pencil', 11), ' Editable'),
    syncIndicator,
    fontDown, fontLabel, fontUp,
    copyBtn,
  );

  // ── Editor overlay: textarea (input) on top, pre (highlight) behind ──
  const editorWrap = el('div', { className: 'preview__editor-wrap' });

  const hlPre = el('pre', { className: 'preview__hl' });
  hlPre.setAttribute('aria-hidden', 'true');
  const hlCode = el('code', { className: 'preview__hl-code' });
  hlPre.appendChild(hlCode);

  const textarea = el('textarea', {
    className: 'preview__input',
    spellcheck: 'false',
    autocomplete: 'off',
    autocapitalize: 'off',
    placeholder: '# Your .task file will appear here\n# Edit directly — changes sync to the pipeline',
  });

  editorWrap.append(hlPre, textarea);

  const parseErrorBar = el('div', { className: 'preview__error-bar' });

  previewContent.append(previewToolbar, editorWrap, parseErrorBar);

  // ── Font size logic ──
  function setFontSize(px) {
    fontSize = Math.max(MIN_FONT, Math.min(MAX_FONT, px));
    localStorage.setItem(FONT_KEY, fontSize);
    fontLabel.textContent = `${fontSize}px`;
    applyFontSize();
  }
  function applyFontSize() {
    editorWrap.style.fontSize = `${fontSize}px`;
  }
  applyFontSize();

  // ── Scroll sync ──
  textarea.addEventListener('scroll', () => {
    hlPre.scrollTop = textarea.scrollTop;
    hlPre.scrollLeft = textarea.scrollLeft;
  });

  // ── Highlighting ──
  function updateHighlight(text) {
    hlCode.innerHTML = highlightTask(text);
  }

  // ── Bidirectional sync logic ──
  let isUserEditing = false;
  let parseTimer = null;
  let lastSerializedText = '';
  let currentLineMap = new Map(); // 0-based line number → item.id

  function syncFromStore(state) {
    if (isUserEditing) return;
    const { text, lineMap } = serializeTaskWithLineMap(state);
    lastSerializedText = text;
    currentLineMap = lineMap;
    if (textarea.value !== text) {
      const st = textarea.scrollTop;
      textarea.value = text;
      textarea.scrollTop = st;
    }
    updateHighlight(textarea.value);
    clearParseError();
  }

  // ── Preview → Pipeline cursor linking ──
  function getLineAtCursor() {
    const pos = textarea.selectionStart;
    const textBefore = textarea.value.substring(0, pos);
    return textBefore.split('\n').length - 1; // 0-based line number
  }

  function selectItemAtCursor(opts = {}) {
    const line = getLineAtCursor();
    const itemId = currentLineMap.get(line);
    if (itemId) {
      store.selectItem(itemId, opts);
    }
  }

  textarea.addEventListener('click', selectItemAtCursor);
  textarea.addEventListener('keyup', (e) => {
    // Only on arrow keys / Home / End / PgUp / PgDn that move the cursor
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(e.key)) {
      selectItemAtCursor();
    }
  });

  function syncToStore() {
    clearTimeout(parseTimer);
    parseTimer = setTimeout(() => {
      const text = textarea.value;
      if (text === lastSerializedText) return;
      try {
        const parsed = parseTaskFile(text);
        store.loadState(parsed);
        lastSerializedText = text;

        // Rebuild lineMap with the new item IDs from the parse
        const result = serializeTaskWithLineMap(store.getState());
        currentLineMap = result.lineMap;

        // Re-select the item at the cursor position (loadState clears selectedItemId)
        if (isUserEditing) {
          selectItemAtCursor({ scroll: false });
        }

        // Run live lint on the parsed result to surface warnings
        const issues = lintPreviewText(text, parsed);
        if (issues.length > 0) {
          showParseWarnings(issues);
          showSyncStatus('synced');
        } else {
          clearParseError();
          showSyncStatus('synced');
        }
      } catch (err) {
        showParseError(err.message);
        showSyncStatus('error');
      }
    }, 600);
  }

  /**
   * Lightweight lint pass on the raw preview text + parsed result.
   * Returns an array of { line: number, message: string, severity: 'error'|'warning' }.
   */
  function lintPreviewText(text, parsed) {
    const issues = [];
    const lines = text.split('\n');

    // Check for unrecognized lines (now __RAW__ items in parsed result)
    const rawItems = (parsed.items || []).filter(i => i.type === '__RAW__');
    for (const raw of rawItems) {
      // Find the line number in the source text
      const lineIdx = lines.findIndex(l => l.trim() === raw.text);
      issues.push({
        line: lineIdx >= 0 ? lineIdx + 1 : null,
        message: `Unrecognized line: "${(raw.text || '').substring(0, 50)}${(raw.text || '').length > 50 ? '…' : ''}"`,
        severity: 'warning',
      });
    }

    // Check for empty required variables
    for (const v of parsed.requiredVariables || []) {
      if (!v.name || !v.name.trim()) {
        issues.push({ line: null, message: 'Empty required variable declaration (> with no name)', severity: 'error' });
      }
    }

    // Check for missing task name
    if (!parsed.taskName || !parsed.taskName.trim()) {
      issues.push({ line: null, message: 'Missing Task: declaration — add "Task: YourName" at the top', severity: 'warning' });
    }

    return issues;
  }

  function showParseError(msg) {
    parseErrorBar.style.display = 'flex';
    parseErrorBar.className = 'preview__error-bar preview__error-bar--error';
    clearChildren(parseErrorBar);
    parseErrorBar.append(icon('alertTriangle', 12), ` Parse error: ${msg}`);
  }

  function showParseWarnings(issues) {
    parseErrorBar.style.display = 'flex';
    parseErrorBar.className = 'preview__error-bar preview__error-bar--warning';
    clearChildren(parseErrorBar);
    const list = el('div', { className: 'preview__error-list' });
    for (const issue of issues) {
      const prefix = issue.line ? `Line ${issue.line}: ` : '';
      const item = el('div', { className: 'preview__error-item' },
        icon(issue.severity === 'error' ? 'alertTriangle' : 'info', 11),
        ` ${prefix}${issue.message}`
      );
      list.appendChild(item);
    }
    parseErrorBar.appendChild(list);
  }

  function clearParseError() { parseErrorBar.style.display = 'none'; }

  function showSyncStatus(status) {
    clearChildren(syncIndicator);
    if (status === 'synced') {
      syncIndicator.className = 'preview__sync-indicator preview__sync-indicator--ok';
      syncIndicator.append(icon('checkCircle', 10), ' Synced');
    } else if (status === 'error') {
      syncIndicator.className = 'preview__sync-indicator preview__sync-indicator--error';
      syncIndicator.append(icon('xCircle', 10), ' Error');
    } else if (status === 'editing') {
      syncIndicator.className = 'preview__sync-indicator preview__sync-indicator--editing';
      syncIndicator.append(icon('pencil', 10), ' Editing...');
    }
    if (status === 'synced') {
      setTimeout(() => {
        if (syncIndicator.classList.contains('preview__sync-indicator--ok')) {
          clearChildren(syncIndicator);
          syncIndicator.className = 'preview__sync-indicator';
        }
      }, 2000);
    }
  }

  textarea.addEventListener('focus', () => { isUserEditing = true; });
  textarea.addEventListener('blur', () => {
    isUserEditing = false;
    syncToStore();
    setTimeout(() => {
      store.selectItem(null);
      syncFromStore(store.getState());
    }, 700);
  });
  textarea.addEventListener('input', () => {
    updateHighlight(textarea.value);
    showSyncStatus('editing');
    syncToStore();
  });

  // Variables table
  const varsTable = el('div', { id: 'vars-table' });
  varsContent.appendChild(varsTable);

  // Validation list
  const validationList = el('div', { id: 'validation-list' });
  validationContent.appendChild(validationList);

  panel.append(tabs, previewContent, varsContent, validationContent);

  let activeTab = 'preview';

  function switchTab(tabName) {
    activeTab = tabName;
    [tabPreview, tabVars, tabValidation].forEach(t => t.classList.remove('context-panel__tab--active'));
    [previewContent, varsContent, validationContent].forEach(c => c.style.display = 'none');
    if (tabName === 'preview') { tabPreview.classList.add('context-panel__tab--active'); previewContent.style.display = 'flex'; }
    if (tabName === 'variables') { tabVars.classList.add('context-panel__tab--active'); varsContent.style.display = 'block'; }
    if (tabName === 'validation') { tabValidation.classList.add('context-panel__tab--active'); validationContent.style.display = 'block'; }
  }

  // ═══════ RENDER ═══════

  store.subscribe((state) => {
    syncFromStore(state);
    renderVariablesTable(varsTable, state);
    renderValidation(validationList, state);

    const errCount = state.validationErrors.filter(e => e.severity === 'error').length;
    const warnCount = state.validationErrors.filter(e => e.severity === 'warning').length;
    clearChildren(tabValidation);
    if (errCount > 0) {
      tabValidation.append(icon('xCircle', 14), `Validation (${errCount})`);
    } else if (warnCount > 0) {
      tabValidation.append(icon('alertTriangle', 14), `Validation (${warnCount})`);
    } else {
      tabValidation.append(icon('checkCircle', 14), 'Validation');
    }
  });

  return panel;
}

// ── Variables table ──
function renderVariablesTable(container, state) {
  clearChildren(container);

  // Build resolved value map
  const varMap = buildVariableMap(state, DEFAULT_VARIABLES);

  const table = el('table', { className: 'var-table' });
  const thead = el('thead', {},
    el('tr', {},
      el('th', {}, ''),
      el('th', {}, 'Name'),
      el('th', {}, 'Source'),
      el('th', { dataset: { tooltip: 'The expression or resolved value of the variable' } }, 'Value / Resolved'),
      el('th', { dataset: { tooltip: 'Number of times this variable is referenced in instructions or expressions' } }, 'Used'),
    ),
  );

  // Count usage
  const usageCounts = {};
  for (const item of state.items) {
    if (item.type === '__SECTION__') continue;
    for (const val of Object.values(item.args || {})) {
      for (const ref of extractVariableRefs(val)) {
        usageCounts[ref] = (usageCounts[ref] || 0) + 1;
      }
    }
  }
  for (const v of state.computedVariables) {
    for (const ref of extractVariableRefs(v.expression)) {
      usageCounts[ref] = (usageCounts[ref] || 0) + 1;
    }
  }

  const tbody = el('tbody');

  for (const v of state.requiredVariables) {
    const count = usageCounts[v.name] || 0;
    tbody.appendChild(el('tr', { className: count === 0 ? 'var-table__row--unused' : '' },
      el('td', {}, el('span', { className: 'var-type-dot var-type-dot--required' })),
      el('td', { className: 'var-table__name' }, v.name || '(empty)'),
      el('td', {}, 'Required'),
      el('td', { className: 'var-table__value var-table__value--placeholder' }, `<${v.name || '?'}>`),
      el('td', { className: count === 0 ? 'var-table__count--zero' : '' }, String(count)),
    ));
  }

  for (const v of state.computedVariables) {
    const count = usageCounts[v.name] || 0;
    const resolved = varMap[v.name] || '';
    const valueCell = el('td', { className: 'var-table__value' });

    if (v.expression) {
      valueCell.appendChild(el('div', { className: 'var-table__expr' }, v.expression));
      if (resolved && resolved !== v.expression) {
        valueCell.appendChild(el('div', { className: 'var-table__resolved' }, resolved));
      }
    } else {
      valueCell.textContent = '\u2014';
    }

    tbody.appendChild(el('tr', { className: count === 0 ? 'var-table__row--unused' : '' },
      el('td', {}, el('span', { className: 'var-type-dot var-type-dot--computed' })),
      el('td', { className: 'var-table__name' }, v.name || '(empty)'),
      el('td', {}, 'Computed'),
      valueCell,
      el('td', { className: count === 0 ? 'var-table__count--zero' : '' }, String(count)),
    ));
  }

  for (const [name, value] of Object.entries(DEFAULT_VARIABLES)) {
    const count = usageCounts[name] || 0;
    tbody.appendChild(el('tr', { className: `var-table__row--default ${count === 0 ? 'var-table__row--unused' : ''}` },
      el('td', {}, el('span', { className: 'var-type-dot var-type-dot--default' })),
      el('td', { className: 'var-table__name' }, name),
      el('td', {}, 'Default'),
      el('td', { className: 'var-table__value' }, value),
      el('td', { className: count === 0 ? 'var-table__count--zero' : '' }, String(count)),
    ));
  }

  table.append(thead, tbody);
  container.appendChild(table);
}

// ── Validation list ──
function renderValidation(container, state) {
  clearChildren(container);

  if (state.validationErrors.length === 0) {
    container.appendChild(el('div', { className: 'validation__empty' },
      icon('checkCircle', 32),
      el('div', {}, 'No issues found'),
      el('div', { className: 'validation__empty-hint' }, 'Your task definition looks good!'),
    ));
    return;
  }

  const errorList = state.validationErrors.filter(e => e.severity === 'error');
  const warnList = state.validationErrors.filter(e => e.severity === 'warning');

  if (errorList.length > 0) {
    container.appendChild(el('h4', { className: 'validation__heading validation__heading--error' },
      icon('xCircle', 14), `${errorList.length} Error${errorList.length > 1 ? 's' : ''}`));
    for (const err of errorList) {
      const item = el('div', { className: 'validation__item validation__item--error' },
        el('span', { className: 'validation__message' }, err.message),
      );
      // Click to select the erroring item
      if (err.itemId) {
        item.classList.add('validation__item--clickable');
        item.addEventListener('click', () => store.selectItem(err.itemId));
      }
      container.appendChild(item);
    }
  }

  if (warnList.length > 0) {
    container.appendChild(el('h4', { className: 'validation__heading validation__heading--warning' },
      icon('alertTriangle', 14), `${warnList.length} Warning${warnList.length > 1 ? 's' : ''}`));
    for (const warn of warnList) {
      const item = el('div', { className: 'validation__item validation__item--warning' },
        el('span', { className: 'validation__message' }, warn.message),
      );
      if (warn.itemId) {
        item.classList.add('validation__item--clickable');
        item.addEventListener('click', () => store.selectItem(warn.itemId));
      }
      container.appendChild(item);
    }
  }
}
