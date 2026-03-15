// ─── File Browser Modal ──────────────────────────────────────────
// Searchable file picker that uses the FileSystemService.

import { el, clearChildren } from '../../utils/dom.js';
import { fileSystem } from '../../lib/fileSystem.js';
import { icon } from '../../icons.js';

const EXT_FILTERS = [
  { label: 'All', extensions: [] },
  { label: 'Templates', extensions: ['tpl', 'template', 'ftl'] },
  { label: 'Java', extensions: ['java'] },
  { label: 'Gradle', extensions: ['gradle', 'kts'] },
  { label: 'Config', extensions: ['xml', 'json', 'yaml', 'yml', 'properties'] },
];

/**
 * Open a file browser modal and return the selected path.
 * @param {object} opts
 * @param {string} opts.title - Modal title
 * @param {string} opts.fieldType - 'path' | 'template' | 'text'
 * @param {string} opts.currentValue - Current field value
 * @param {function} opts.onSelect - Called with the chosen file path
 */
export function openFileBrowser({ title = 'Browse Files', fieldType = 'path', currentValue = '', onSelect }) {
  if (!fileSystem.hasRoot) {
    // Prompt to set project root first
    const proceed = confirm('To browse files, you need to set your project root directory first.\n\nWould you like to select it now?');
    if (!proceed) return;
    fileSystem.setProjectRoot().then(ok => {
      if (ok) openFileBrowser({ title, fieldType, currentValue, onSelect });
    });
    return;
  }

  let activeFilter = fieldType === 'template' ? 1 : 0; // default to Templates for template fields
  let searchQuery = '';

  const overlay = el('div', {
    className: 'modal-overlay',
    onClick: (e) => { if (e.target === overlay) overlay.remove(); },
  });

  const modal = el('div', { className: 'modal modal--file-browser' });

  // ── Header ──
  const header = el('div', { className: 'modal__header' },
    el('h3', {}, icon('search', 18), ` ${title}`),
    el('button', { className: 'modal__close', onClick: () => overlay.remove() }, '\u00d7'),
  );

  // ── Search bar ──
  const searchBar = el('div', { className: 'fb__search-bar' });
  const searchIcon = el('span', { className: 'fb__search-icon' }, icon('search', 14));
  const searchInput = el('input', {
    type: 'text',
    className: 'fb__search-input',
    placeholder: 'Search files by name or path...',
    spellcheck: 'false',
    onInput: (e) => { searchQuery = e.target.value; renderResults(); },
  });
  searchBar.append(searchIcon, searchInput);

  // ── Filter chips ──
  const filterBar = el('div', { className: 'fb__filter-bar' });
  const filterButtons = EXT_FILTERS.map((f, i) => {
    const btn = el('button', {
      className: `fb__filter-chip ${i === activeFilter ? 'fb__filter-chip--active' : ''}`,
      onClick: () => {
        activeFilter = i;
        filterButtons.forEach((b, j) => b.classList.toggle('fb__filter-chip--active', j === i));
        renderResults();
      },
    }, f.label);
    return btn;
  });
  filterBar.append(...filterButtons);

  // ── Results list ──
  const resultsList = el('div', { className: 'fb__results' });

  // ── Footer with project info ──
  const footer = el('div', { className: 'fb__footer' },
    el('span', { className: 'fb__root-info' },
      icon('folder', 12),
      ` ${fileSystem.rootName}`,
      ` \u2014 ${fileSystem.files.length} files indexed`,
    ),
    el('button', {
      className: 'fb__refresh-btn',
      dataset: { tooltip: 'Re-scan the project directory' },
      onClick: async () => {
        await fileSystem.reindex();
        renderResults();
      },
    }, icon('redo', 12), ' Refresh'),
  );

  function renderResults() {
    clearChildren(resultsList);
    const filter = EXT_FILTERS[activeFilter];
    const results = fileSystem.search(searchQuery, {
      extensions: filter.extensions,
      filesOnly: true,
      limit: 200,
    });

    if (results.length === 0) {
      resultsList.appendChild(
        el('div', { className: 'fb__empty' },
          icon('search', 24),
          el('div', {}, searchQuery ? 'No files match your search' : 'No files found with this filter'),
        )
      );
      return;
    }

    for (const file of results) {
      const isActive = currentValue && file.path === currentValue;
      const row = el('div', {
        className: `fb__result-row ${isActive ? 'fb__result-row--active' : ''}`,
        tabIndex: '0',
        onClick: () => {
          if (onSelect) onSelect(file.path);
          overlay.remove();
        },
      });

      const fileIcon = getFileIcon(file);
      const pathParts = file.path.split('/');
      const fileName = pathParts.pop();
      const dirPath = pathParts.join('/');

      row.append(
        el('span', { className: 'fb__result-icon' }, icon(fileIcon, 14)),
        el('span', { className: 'fb__result-name' }, highlightMatch(fileName, searchQuery)),
        el('span', { className: 'fb__result-path' }, dirPath ? dirPath + '/' : ''),
      );

      if (file.ext) {
        row.appendChild(el('span', { className: `fb__result-ext fb__result-ext--${file.ext}` }, `.${file.ext}`));
      }

      resultsList.appendChild(row);
    }
  }

  // ── Assemble ──
  const body = el('div', { className: 'modal__body modal__body--browser' });
  body.append(searchBar, filterBar, resultsList);

  modal.append(header, body, footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Initial render and focus
  renderResults();
  requestAnimationFrame(() => searchInput.focus());

  // Keyboard navigation
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const first = resultsList.querySelector('.fb__result-row');
      if (first) first.focus();
    } else if (e.key === 'Enter') {
      const first = resultsList.querySelector('.fb__result-row');
      if (first) first.click();
    }
  });

  resultsList.addEventListener('keydown', (e) => {
    const rows = Array.from(resultsList.querySelectorAll('.fb__result-row'));
    const focused = document.activeElement;
    const idx = rows.indexOf(focused);

    if (e.key === 'ArrowDown' && idx < rows.length - 1) {
      e.preventDefault();
      rows[idx + 1].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx > 0) rows[idx - 1].focus();
      else searchInput.focus();
    } else if (e.key === 'Enter' && focused) {
      focused.click();
    } else if (e.key === 'Escape') {
      overlay.remove();
    }
  });
}

function getFileIcon(file) {
  if (file.isDir) return 'folder';
  switch (file.ext) {
    case 'tpl': case 'template': case 'ftl': return 'fileTemplate';
    case 'java': return 'code';
    case 'gradle': case 'kts': return 'file';
    case 'xml': case 'json': case 'yaml': case 'yml': case 'properties': return 'file';
    default: return 'file';
  }
}

function highlightMatch(text, query) {
  if (!query) return document.createTextNode(text);
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return document.createTextNode(text);

  const frag = document.createDocumentFragment();
  frag.appendChild(document.createTextNode(text.substring(0, idx)));
  const mark = el('strong', { className: 'fb__match' }, text.substring(idx, idx + query.length));
  frag.appendChild(mark);
  frag.appendChild(document.createTextNode(text.substring(idx + query.length)));
  return frag;
}
