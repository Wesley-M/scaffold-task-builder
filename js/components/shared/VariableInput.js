// ─── Variable Input with ${} Autocomplete ───────────────────────

import { el, clearChildren } from '../../utils/dom.js';
import { store } from '../../store.js';
import { resolveVariables, buildVariableMap } from '../../lib/resolver.js';
import { DEFAULT_VARIABLES } from '../../types.js';

/**
 * Create a variable-aware text input with autocomplete dropdown.
 */
export function createVariableInput({ value = '', placeholder = '', className = '', multiline = false, fieldType = '', onChange }) {
  const wrapper = el('div', { className: `var-input-wrapper ${className}` });

  const input = multiline
    ? el('textarea', {
        className: 'var-input var-input--multiline',
        placeholder,
        rows: '3',
        spellcheck: 'false',
      })
    : el('input', {
        type: 'text',
        className: 'var-input',
        placeholder,
        spellcheck: 'false',
      });

  input.value = value;

  const dropdown = el('div', { className: 'var-dropdown', style: { display: 'none' } });

  // Resolved value preview (shown below input when it contains variables)
  const preview = el('div', { className: 'var-preview', style: { display: 'none' } });

  // Trigger hint (subtle text below input)
  const hint = el('div', { className: 'var-hint' }, 'Type ${ to autocomplete variables');

  wrapper.append(input, dropdown, preview, hint);

  let dropdownVisible = false;
  let activeIndex = -1;

  function showDropdown(filter = '') {
    const vars = store.getAllVariables();
    const filtered = filter
      ? vars.filter(v => v.name.toLowerCase().includes(filter.toLowerCase()))
      : vars;

    if (filtered.length === 0) { hideDropdown(); return; }

    clearChildren(dropdown);
    activeIndex = -1;

    // Build resolved value map for preview
    const state = store.getState();
    const varMap = buildVariableMap(state, DEFAULT_VARIABLES);

    for (let i = 0; i < filtered.length; i++) {
      const v = filtered[i];
      const resolvedValue = varMap[v.name] || '';

      const item = el('div', {
        className: 'var-dropdown-item',
        dataset: { index: String(i), varName: v.name },
        onMousedown: (e) => { e.preventDefault(); insertVariable(v.name); },
        onMouseenter: () => setActive(i),
      });

      // Icon dot
      item.appendChild(
        el('span', { className: 'var-dropdown-icon' },
          el('span', { className: `var-type-dot var-type-dot--${v.source}` }))
      );

      // Name with matching text highlighted
      const nameEl = el('span', { className: 'var-dropdown-name' });
      if (filter) {
        const idx = v.name.toLowerCase().indexOf(filter.toLowerCase());
        if (idx >= 0) {
          nameEl.appendChild(document.createTextNode(v.name.substring(0, idx)));
          nameEl.appendChild(el('strong', { className: 'var-dropdown-match' }, v.name.substring(idx, idx + filter.length)));
          nameEl.appendChild(document.createTextNode(v.name.substring(idx + filter.length)));
        } else {
          nameEl.textContent = v.name;
        }
      } else {
        nameEl.textContent = v.name;
      }
      item.appendChild(nameEl);

      // Source badge
      item.appendChild(el('span', { className: `var-dropdown-badge var-dropdown-badge--${v.source}` }, v.source));

      // Resolved value preview (truncated)
      if (resolvedValue && resolvedValue !== `<${v.name}>`) {
        const truncated = resolvedValue.length > 40 ? resolvedValue.substring(0, 37) + '...' : resolvedValue;
        item.appendChild(el('div', { className: 'var-dropdown-value' }, truncated));
      }

      dropdown.appendChild(item);
    }
    dropdown.style.display = 'block';
    dropdownVisible = true;
    hint.style.display = 'none';
  }

  function hideDropdown() {
    dropdown.style.display = 'none';
    dropdownVisible = false;
    activeIndex = -1;
  }

  function setActive(index) {
    const items = dropdown.querySelectorAll('.var-dropdown-item');
    items.forEach(it => it.classList.remove('var-dropdown-item--active'));
    if (index >= 0 && index < items.length) {
      items[index].classList.add('var-dropdown-item--active');
      items[index].scrollIntoView({ block: 'nearest' });
      activeIndex = index;
    }
  }

  function insertVariable(name) {
    const cursorPos = input.selectionStart;
    const text = input.value;
    const before = text.substring(0, cursorPos);
    const dollarIdx = before.lastIndexOf('${');

    if (dollarIdx !== -1) {
      const after = text.substring(cursorPos);
      input.value = text.substring(0, dollarIdx) + '${' + name + '}' + after;
      const newPos = dollarIdx + name.length + 3;
      input.setSelectionRange(newPos, newPos);
    } else {
      input.value = text.substring(0, cursorPos) + '${' + name + '}' + text.substring(cursorPos);
    }

    hideDropdown();
    input.focus();
    if (onChange) onChange(input.value);
    updatePreview();
  }

  function updatePreview() {
    const val = input.value;
    if (!val || !val.includes('${')) {
      preview.style.display = 'none';
      if (!dropdownVisible && val === '') hint.style.display = '';
      return;
    }
    hint.style.display = 'none';

    const state = store.getState();
    const varMap = buildVariableMap(state, DEFAULT_VARIABLES);
    const { resolved, unresolved } = resolveVariables(val, varMap);

    if (resolved !== val) {
      clearChildren(preview);
      preview.appendChild(el('span', { className: 'var-preview-label' }, 'Resolves to: '));
      preview.appendChild(el('span', { className: 'var-preview-value' }, resolved));
      if (unresolved.length > 0) {
        preview.appendChild(el('span', { className: 'var-preview-warn' }, ` (${unresolved.length} unresolved)`));
      }
      preview.style.display = '';
    } else {
      preview.style.display = 'none';
    }
  }

  input.addEventListener('input', () => {
    if (onChange) onChange(input.value);
    const cursorPos = input.selectionStart;
    const before = input.value.substring(0, cursorPos);
    const dollarIdx = before.lastIndexOf('${');
    if (dollarIdx !== -1) {
      const between = before.substring(dollarIdx + 2);
      if (!between.includes('}')) { showDropdown(between); return; }
    }
    hideDropdown();
    updatePreview();
  });

  input.addEventListener('keydown', (e) => {
    if (!dropdownVisible) return;

    if (e.key === 'Escape') {
      hideDropdown();
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const items = dropdown.querySelectorAll('.var-dropdown-item');
      setActive(Math.min(activeIndex + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if ((e.key === 'Enter' || e.key === 'Tab') && dropdownVisible) {
      const active = dropdown.querySelector('.var-dropdown-item--active');
      if (active) {
        e.preventDefault();
        const name = active.dataset.varName;
        if (name) insertVariable(name);
      } else if (e.key === 'Tab') {
        // Tab accepts the first item
        const first = dropdown.querySelector('.var-dropdown-item');
        if (first) {
          e.preventDefault();
          const name = first.dataset.varName;
          if (name) insertVariable(name);
        }
      }
    }
  });

  input.addEventListener('focus', () => {
    if (!input.value) hint.style.display = '';
    updatePreview();
  });

  input.addEventListener('blur', () => {
    setTimeout(hideDropdown, 150);
    hint.style.display = 'none';
  });

  wrapper.setValue = (v) => { input.value = v; updatePreview(); };
  wrapper.getValue = () => input.value;
  wrapper.focus = () => input.focus();

  // Initial preview
  if (value && value.includes('${')) {
    requestAnimationFrame(updatePreview);
  }

  return wrapper;
}
