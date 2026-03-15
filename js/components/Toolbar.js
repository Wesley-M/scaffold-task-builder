// ─── Toolbar Component ───────────────────────────────────────────

import { el, clearChildren, showToast } from '../utils/dom.js';
import { store } from '../store.js';
import { serializeTask } from '../lib/serializer.js';
import { parseTaskFile } from '../lib/parser.js';
import { fileSystem } from '../lib/fileSystem.js';
import { icon } from '../icons.js';
import { showOnboarding } from './OnboardingGuide.js';
import { openHelpCenter } from './HelpCenter.js';

export function createToolbar() {
  const toolbar = el('header', { className: 'toolbar' });

  // ── Logo / Brand ──
  const brand = el('div', { className: 'toolbar__brand' },
    el('span', { className: 'toolbar__logo' }, icon('blocks', 22)),
    el('span', { className: 'toolbar__title' }, 'Scaffold Task Builder'),
  );

  // ── Task Name ──
  const taskNameGroup = el('div', {
    className: 'toolbar__group',
    dataset: { tooltip: 'Unique identifier for this task — used as the filename and CLI reference' },
  },
    el('label', { className: 'toolbar__label', htmlFor: 'taskName' }, 'task:'),
  );
  const taskNameInput = el('input', {
    type: 'text',
    id: 'taskName',
    className: 'toolbar__input toolbar__task-name',
    placeholder: 'myTaskName',
    spellcheck: 'false',
    onInput: (e) => store.setTaskName(e.target.value),
  });
  taskNameGroup.appendChild(taskNameInput);

  // ── Action Buttons ──
  const actions = el('div', { className: 'toolbar__actions' });

  // ── Open Folder ──
  const openFolderBtn = el('button', {
    className: 'toolbar__btn toolbar__btn--secondary toolbar__btn--root',
    dataset: { tooltip: 'Open a folder — all .task files become tabs for live editing' },
    onClick: handleOpenFolder,
  }, icon('folder', 14), 'Open Folder');

  function updateFolderBtn() {
    clearChildren(openFolderBtn);
    if (fileSystem.hasRoot) {
      openFolderBtn.classList.add('toolbar__btn--root-active');
      openFolderBtn.append(icon('folder', 14), ` ${fileSystem.rootName}`);
      openFolderBtn.dataset.tooltip = `Project: ${fileSystem.rootName} — ${fileSystem.getTaskFiles().length} task files. Click to change folder.`;
    } else {
      openFolderBtn.classList.remove('toolbar__btn--root-active');
      openFolderBtn.append(icon('folder', 14), ' Open Folder');
      openFolderBtn.dataset.tooltip = 'Open a folder — all .task files become tabs for live editing';
    }
  }

  fileSystem.onChange(() => updateFolderBtn());

  const isMac = navigator.platform.includes('Mac');
  const saveShortcut = isMac ? '⌘S' : 'Ctrl+S';

  const saveBtn = el('button', {
    className: 'toolbar__btn toolbar__btn--secondary',
    dataset: { tooltip: `Save current file (${saveShortcut})` },
    onClick: handleSave,
  }, icon('fileDown', 14), 'Save');

  const newBtn = el('button', {
    className: 'toolbar__btn toolbar__btn--secondary',
    dataset: { tooltip: 'Create a new .task file' },
    onClick: handleNewFile,
  }, icon('plus', 14), 'New');

  const undoBtn = el('button', {
    className: 'toolbar__btn toolbar__btn--secondary toolbar__btn--compact',
    dataset: { tooltip: 'Undo last action (Ctrl+Z / Cmd+Z)' },
    onClick: () => store.undo(),
  }, icon('undo', 14), 'Undo');

  const redoBtn = el('button', {
    className: 'toolbar__btn toolbar__btn--secondary toolbar__btn--compact',
    dataset: { tooltip: 'Redo (Ctrl+Shift+Z / Cmd+Shift+Z)' },
    onClick: () => store.redo(),
  }, icon('redo', 14), 'Redo');

  const shortcutsBtn = el('button', {
    className: 'toolbar__btn toolbar__btn--secondary toolbar__btn--compact',
    dataset: { tooltip: 'Keyboard shortcuts (press ? anytime)' },
    onClick: () => toggleShortcutsOverlay(),
  }, icon('keyboard', 14), 'Keys');

  // ── Theme Selector (Dropdown) ──
  const THEMES = [
    { key: 'light',     label: 'Light',          swatch: '#0969da',  group: 'light' },
    { key: 'solarized', label: 'Solarized',      swatch: '#268bd2',  group: 'light' },
    { key: 'latte',     label: 'Catppuccin Latte', swatch: '#1e66f5', group: 'light' },
    { key: 'dark',      label: 'Monokai Pro',    swatch: '#78dce8',  group: 'dark'  },
    { key: 'nord',      label: 'Nord',           swatch: '#88c0d0',  group: 'dark'  },
    { key: 'dracula',   label: 'Dracula',        swatch: '#bd93f9',  group: 'dark'  },
    { key: 'tokyo',     label: 'Tokyo Night',    swatch: '#7aa2f7',  group: 'dark'  },
  ];

  function currentThemeKey() {
    return document.documentElement.dataset.theme || 'light';
  }

  function applyTheme(key) {
    if (key === 'light') {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = key;
    }
    localStorage.setItem('scaffold-ui-theme', key);
    updateThemeBtn();
  }

  const themeWrap = el('div', { className: 'theme-selector' });

  const themeBtn = el('button', {
    className: 'toolbar__btn toolbar__btn--secondary toolbar__btn--compact',
    dataset: { tooltip: 'Change color theme' },
    onClick: () => toggleThemeDropdown(),
  });

  const themeDropdown = el('div', { className: 'theme-dropdown' });

  function buildDropdown() {
    clearChildren(themeDropdown);
    const current = currentThemeKey();
    let lastGroup = null;

    for (const t of THEMES) {
      if (t.group !== lastGroup) {
        const groupLabel = t.group === 'light' ? 'Light' : 'Dark';
        themeDropdown.appendChild(el('div', { className: 'theme-dropdown__group' }, groupLabel));
        lastGroup = t.group;
      }
      const item = el('button', {
        className: `theme-dropdown__item ${t.key === current ? 'theme-dropdown__item--active' : ''}`,
        onClick: () => { applyTheme(t.key); closeThemeDropdown(); },
      },
        el('span', { className: 'theme-dropdown__swatch', style: { background: t.swatch } }),
        t.label,
        t.key === current ? el('span', { className: 'theme-dropdown__check' }, '✓') : '',
      );
      themeDropdown.appendChild(item);
    }
  }

  let themeOpen = false;

  function toggleThemeDropdown() {
    themeOpen ? closeThemeDropdown() : openThemeDropdown();
  }

  function openThemeDropdown() {
    buildDropdown();
    themeDropdown.style.display = 'block';
    themeOpen = true;
    requestAnimationFrame(() => {
      document.addEventListener('click', onClickOutsideTheme, true);
    });
  }

  function closeThemeDropdown() {
    themeDropdown.style.display = 'none';
    themeOpen = false;
    document.removeEventListener('click', onClickOutsideTheme, true);
  }

  function onClickOutsideTheme(e) {
    if (!themeWrap.contains(e.target)) closeThemeDropdown();
  }

  function updateThemeBtn() {
    clearChildren(themeBtn);
    const theme = THEMES.find(t => t.key === currentThemeKey()) || THEMES[0];
    const isDark = theme.group === 'dark';
    themeBtn.append(icon(isDark ? 'moon' : 'sun', 14), theme.label, ' ', icon('chevronDown', 10));
  }
  updateThemeBtn();

  themeWrap.append(themeBtn, themeDropdown);

  // ── Global Font Size ──
  const GFONT_KEY = 'scaffold-ui-global-font';
  let fontOffset = parseInt(localStorage.getItem(GFONT_KEY), 10) || 0;

  const fontLabel = el('span', { className: 'toolbar__font-label' }, formatOffset(fontOffset));

  function formatOffset(n) { return n === 0 ? '0' : (n > 0 ? `+${n}` : String(n)); }

  function applyGlobalFont() {
    document.documentElement.style.setProperty('--font-offset', `${fontOffset}px`);
    fontLabel.textContent = formatOffset(fontOffset);
    localStorage.setItem(GFONT_KEY, fontOffset);
  }
  applyGlobalFont();

  const fontDown = el('button', {
    className: 'toolbar__btn toolbar__btn--icon toolbar__btn--sm',
    dataset: { tooltip: 'Decrease app font size' },
    onClick: () => { fontOffset = Math.max(-4, fontOffset - 1); applyGlobalFont(); },
  }, 'A\u2212');
  const fontUp = el('button', {
    className: 'toolbar__btn toolbar__btn--icon toolbar__btn--sm',
    dataset: { tooltip: 'Increase app font size' },
    onClick: () => { fontOffset = Math.min(6, fontOffset + 1); applyGlobalFont(); },
  }, 'A+');

  // ── Help / Tour button ──
  const helpBtn = el('button', {
    className: 'toolbar__btn toolbar__btn--secondary toolbar__btn--compact',
    dataset: { tooltip: 'Interactive walkthrough of the interface' },
    onClick: () => showOnboarding(0),
  }, icon('helpCircle', 14), 'Tour');

  const guideBtn = el('button', {
    className: 'toolbar__btn toolbar__btn--guide',
    dataset: { tooltip: 'Guides, reference docs & tips' },
    onClick: () => {
      guideBtn.classList.remove('toolbar__btn--guide-pulse');
      localStorage.setItem('scaffold-ui-guide-seen', '1');
      openHelpCenter();
    },
  }, icon('lightbulb', 15), 'Guide');

  // Pulse animation for new users who haven't opened the guide yet
  if (!localStorage.getItem('scaffold-ui-guide-seen')) {
    guideBtn.classList.add('toolbar__btn--guide-pulse');
  }

  actions.append(undoBtn, redoBtn, shortcutsBtn, themeWrap, fontDown, fontLabel, fontUp, openFolderBtn, newBtn, saveBtn);

  toolbar.append(brand, guideBtn, helpBtn, taskNameGroup, actions);

  // ── Sync from store ──
  store.subscribe((state) => {
    if (taskNameInput.value !== state.taskName) {
      taskNameInput.value = state.taskName;
    }
  });

  return toolbar;
}

// ── Open Folder handler — pick directory, load all .task files as tabs ──
async function handleOpenFolder() {
  if (fileSystem.hasRoot) {
    // Already connected — offer to switch or disconnect
    const action = confirm(
      `Currently editing: ${fileSystem.rootName}\n` +
      `${fileSystem.getTaskFiles().length} task files loaded.\n\n` +
      `OK = open a different folder\nCancel = disconnect`
    );
    if (action) {
      await pickAndLoadFolder();
    } else {
      fileSystem.disconnect();
      store.closeAllTabs();
    }
  } else {
    await pickAndLoadFolder();
  }
}

async function pickAndLoadFolder() {
  const ok = await fileSystem.setProjectRoot();
  if (!ok) return;

  const taskFiles = fileSystem.getTaskFiles();
  if (taskFiles.length === 0) {
    showToast(`No .task files found in ${fileSystem.rootName}`);
    return;
  }

  // Close all existing tabs and open each .task file
  store.closeAllTabs();

  let firstTabId = null;
  let loaded = 0;
  let failed = 0;

  for (const file of taskFiles) {
    try {
      const text = await fileSystem.readFile(file.path);
      if (text === null) { failed++; continue; }
      const parsed = parseTaskFile(text);
      const tabId = store.addTabWithState(parsed, file.path);
      if (!firstTabId) firstTabId = tabId;
      loaded++;
    } catch (e) {
      console.error(`Failed to load ${file.path}:`, e);
      failed++;
    }
  }

  // Remove the empty "Untitled" tab created by closeAllTabs (if we loaded any files)
  if (loaded > 0) {
    const tabs = store.getTabs();
    const emptyTab = tabs.find(t => !t.filePath && t.name === 'Untitled');
    if (emptyTab && tabs.length > 1) {
      store.closeTab(emptyTab.id);
    }
    // Switch to first loaded tab
    if (firstTabId) store.switchTab(firstTabId);
  }

  const msg = `Loaded ${loaded} task file${loaded !== 1 ? 's' : ''}` +
    (failed > 0 ? ` (${failed} failed)` : '') +
    ` from ${fileSystem.rootName}`;
  showToast(msg);
}

// ── New File handler ──
async function handleNewFile() {
  if (fileSystem.hasRoot) {
    const name = prompt('New task file name (without .task extension):', 'newTask');
    if (!name) return;
    const fileName = name.endsWith('.task') ? name : name + '.task';

    // Find the tasks directory — look for common patterns
    const taskFiles = fileSystem.getTaskFiles();
    let defaultDir = '';
    if (taskFiles.length > 0) {
      // Use same directory as existing task files
      const firstPath = taskFiles[0].path;
      if (firstPath.includes('/')) {
        defaultDir = firstPath.substring(0, firstPath.lastIndexOf('/'));
      }
    }

    const result = await fileSystem.createFile(defaultDir, fileName, `task: ${name.replace('.task', '')}\n`);
    if (result) {
      try {
        const text = await fileSystem.readFile(result.path);
        const parsed = parseTaskFile(text || `task: ${name.replace('.task', '')}\n`);
        store.addTabWithState(parsed, result.path);
        showToast('Created ' + result.path);
      } catch (e) {
        store.addTab(name.replace('.task', ''));
      }
    } else {
      // Fallback — open as an in-memory tab
      store.addTab(name.replace('.task', ''));
    }
  } else {
    store.addTab('');
  }
}

// ── Save handler — write in place or download ──
async function handleSave() {
  const state = store.getState();
  const text = serializeTask(state);
  const filePath = store.getActiveFilePath();

  if (filePath && fileSystem.hasRoot) {
    // Save in place
    const ok = await fileSystem.writeFile(filePath, text);
    if (ok) {
      showToast('Saved ' + filePath.split('/').pop());
    } else {
      alert('Failed to save: ' + filePath);
    }
  } else if (fileSystem.hasRoot) {
    // No path yet — prompt and save to the tasks directory
    const taskFiles = fileSystem.getTaskFiles();
    let defaultDir = '';
    if (taskFiles.length > 0) {
      const firstPath = taskFiles[0].path;
      if (firstPath.includes('/')) {
        defaultDir = firstPath.substring(0, firstPath.lastIndexOf('/'));
      }
    }
    const name = (state.taskName || 'unnamed') + '.task';
    const fullPath = defaultDir ? `${defaultDir}/${name}` : name;
    const dir = prompt('Save as (relative to project root):', fullPath);
    if (!dir) return;

    const lastSlash = dir.lastIndexOf('/');
    const dirPath = lastSlash > 0 ? dir.substring(0, lastSlash) : '';
    const fileName = lastSlash > 0 ? dir.substring(lastSlash + 1) : dir;

    const result = await fileSystem.createFile(dirPath, fileName, text);
    if (result) {
      store.setActiveFilePath(result.path);
      showToast('Created ' + result.path);
    } else {
      downloadTask(text, fileName);
    }
  } else {
    // No project root — download
    const name = (state.taskName || 'unnamed') + '.task';
    downloadTask(text, name);
  }
}

function downloadTask(text, name) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Keyboard Shortcuts Overlay ──
let shortcutsVisible = false;

function toggleShortcutsOverlay() {
  if (shortcutsVisible) {
    document.getElementById('shortcuts-overlay')?.remove();
    shortcutsVisible = false;
    return;
  }

  const mod = navigator.platform.includes('Mac') ? '⌘' : 'Ctrl';
  const shortcuts = [
    [`${mod} + Z`, 'Undo'],
    [`${mod} + Shift + Z`, 'Redo'],
    [`${mod} + S`, 'Save current file'],
    [`${mod} + D`, 'Duplicate selected card'],
    ['Delete / Backspace', 'Remove selected card'],
    ['?', 'Toggle this help overlay'],
    ['Type ${', 'Trigger variable autocomplete'],
    ['Tab', 'Accept autocomplete suggestion'],
    ['Escape', 'Close dropdown / overlay'],
  ];

  const overlay = el('div', {
    className: 'shortcuts-overlay',
    id: 'shortcuts-overlay',
    onClick: (e) => {
      if (e.target === overlay) toggleShortcutsOverlay();
    },
  });

  const panel = el('div', { className: 'shortcuts-panel' });
  const header = el('div', { className: 'shortcuts-header' },
    el('h2', {}, icon('keyboard', 20), ' Keyboard Shortcuts'),
    el('button', {
      className: 'shortcuts-close',
      onClick: () => toggleShortcutsOverlay(),
    }, '\u00d7'),
  );

  const list = el('div', { className: 'shortcuts-list' });
  for (const [keys, desc] of shortcuts) {
    const row = el('div', { className: 'shortcuts-row' },
      el('div', { className: 'shortcuts-keys' }),
      el('div', { className: 'shortcuts-desc' }, desc),
    );
    // Build key badges
    const keysContainer = row.querySelector('.shortcuts-keys');
    for (const key of keys.split(' + ')) {
      keysContainer.appendChild(el('kbd', { className: 'shortcuts-kbd' }, key.trim()));
      if (key !== keys.split(' + ').pop()) {
        keysContainer.appendChild(document.createTextNode(' + '));
      }
    }
    list.appendChild(row);
  }

  panel.append(header, list);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  shortcutsVisible = true;
}

// Export for use by app.js
export { toggleShortcutsOverlay, handleSave };
