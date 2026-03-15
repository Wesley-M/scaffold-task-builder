// ─── Left Palette: Variables + Instruction Types ─────────────────

import { el, clearChildren } from '../utils/dom.js';
import { store } from '../store.js';
import { INSTRUCTION_CATEGORIES, INSTRUCTION_SCHEMA, CATEGORY_DESCRIPTIONS, createInstruction, createSection } from '../types.js';
import { createVariableInput } from './shared/VariableInput.js';
import { icon } from '../icons.js';

export function createPalette() {
  const palette = el('aside', { className: 'palette' });

  // ═══════ REQUIRED VARIABLES ═══════
  const reqSection = el('section', { className: 'palette__section' });
  const reqHeader = el('div', { className: 'palette__section-header' },
    el('h3', {}, 'Required Variables'),
    el('span', {
      className: 'help-icon tooltip--right',
      dataset: { tooltip: 'Variables the user must provide when running the task. Declared as "> varName" in the .task file.' },
    }, '?'),
    el('button', {
      className: 'palette__add-btn',
      dataset: { tooltip: 'Add a new required variable' },
      onClick: () => {
        const id = store.addRequiredVariable('');
        requestAnimationFrame(() => {
          const input = reqList.querySelector(`[data-id="${id}"] input`);
          input?.focus();
        });
      },
    }, '+'),
  );

  const reqList = el('div', { className: 'palette__var-list', id: 'required-var-list' });
  reqSection.append(reqHeader, reqList);

  // ═══════ COMPUTED VARIABLES ═══════
  const compSection = el('section', { className: 'palette__section' });
  const compHeader = el('div', { className: 'palette__section-header' },
    el('h3', {}, 'Computed Variables'),
    el('span', {
      className: 'help-icon tooltip--right',
      dataset: { tooltip: 'Variables calculated from expressions. Can reference other variables with ${name}. Declared as: name = "expression"' },
    }, '?'),
    el('button', {
      className: 'palette__add-btn',
      dataset: { tooltip: 'Add a new computed variable' },
      onClick: () => {
        const id = store.addComputedVariable('', '');
        requestAnimationFrame(() => {
          const input = compList.querySelector(`[data-id="${id}"] input`);
          input?.focus();
        });
      },
    }, '+'),
  );

  const compList = el('div', { className: 'palette__var-list', id: 'computed-var-list' });
  compSection.append(compHeader, compList);

  // ═══════ INSTRUCTION PALETTE ═══════
  const instrSection = el('section', { className: 'palette__section palette__section--instructions' });

  // Search filter
  const searchWrapper = el('div', { className: 'palette__search-wrapper' });
  const searchInput = el('input', {
    type: 'text',
    className: 'palette__search-input',
    placeholder: 'Filter instructions...',
    spellcheck: 'false',
    onInput: (e) => filterInstructions(e.target.value),
  });
  searchWrapper.append(
    el('span', { className: 'palette__search-icon' }, icon('search', 13)),
    searchInput,
  );

  instrSection.append(
    el('div', { className: 'palette__section-header' },
      el('h3', {}, 'Instructions'),
      el('span', {
        className: 'help-icon tooltip--right',
        dataset: { tooltip: 'Click or drag instructions into the pipeline. Each instruction becomes a step in the scaffold task.' },
      }, '?'),
    ),
    searchWrapper,
  );

  const instrList = el('div', { className: 'palette__instr-list' });
  const instrNoResults = el('div', {
    className: 'palette__empty palette__empty--filter',
    style: { display: 'none' },
  }, icon('search', 16), ' No matching instructions. Try "create", "insert", or "replace".');
  instrList.appendChild(instrNoResults);

  for (const category of INSTRUCTION_CATEGORIES) {
    const catDesc = CATEGORY_DESCRIPTIONS[category.name] || '';
    const catHeader = el('div', {
      className: 'palette__cat-header',
      dataset: { category: category.name, ...(catDesc ? { tooltip: catDesc } : {}) },
    },
      el('span', {}, category.name),
    );
    instrList.appendChild(catHeader);

    for (const type of category.types) {
      const schema = INSTRUCTION_SCHEMA[type];
      let justDragged = false;

      const item = el('div', {
        className: 'palette__instr-item',
        draggable: 'true',
        dataset: {
          instructionType: type,
          tooltip: schema.description || schema.label,
        },
        onClick: () => {
          if (justDragged) return; // avoid duplicate from short drag
          store.addItem(createInstruction(type));
        },
      },
        el('span', { className: 'palette__instr-icon' }, icon(schema.icon, 14)),
        el('span', { className: 'palette__instr-label' }, schema.label),
      );

      // Drag start — for drag-to-pipeline
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/x-instruction-type', type);
        e.dataTransfer.effectAllowed = 'copy';
        item.classList.add('palette__instr-item--dragging');
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('palette__instr-item--dragging');
        justDragged = true;
        setTimeout(() => { justDragged = false; }, 100);
      });

      instrList.appendChild(item);
    }
  }

  // Add section divider button
  const orgDesc = CATEGORY_DESCRIPTIONS['Organization'] || '';
  instrList.appendChild(el('div', {
    className: 'palette__cat-header',
    style: { marginTop: '12px' },
    dataset: { category: 'Organization', ...(orgDesc ? { tooltip: orgDesc } : {}) },
  },
    el('span', {}, 'Organization'),
  ));
  instrList.appendChild(
    el('div', {
      className: 'palette__instr-item',
      dataset: { tooltip: 'Add a visual separator to organize related instructions into groups' },
      onClick: () => store.addItem(createSection()),
    },
      el('span', { className: 'palette__instr-icon' }, icon('minus', 14)),
      el('span', { className: 'palette__instr-label' }, 'Section Divider'),
    )
  );

  instrSection.appendChild(instrList);

  // Title bar
  const paletteHeader = el('div', { className: 'palette__header' },
    el('h2', { className: 'palette__title' }, 'Toolbox'),
  );

  palette.append(paletteHeader, reqSection, compSection, instrSection);

  // ── Search filter logic ──
  function filterInstructions(query) {
    const q = query.toLowerCase().trim();
    const items = instrList.querySelectorAll('.palette__instr-item');
    const headers = instrList.querySelectorAll('.palette__cat-header');

    // Track which categories have visible items
    const catVisibility = {};

    items.forEach(item => {
      const label = item.querySelector('.palette__instr-label')?.textContent || '';
      const type = item.dataset.instructionType || '';
      const matches = !q || label.toLowerCase().includes(q) || type.toLowerCase().includes(q);
      item.style.display = matches ? '' : 'none';

      // Find parent category
      let prev = item.previousElementSibling;
      while (prev && !prev.classList.contains('palette__cat-header')) {
        prev = prev.previousElementSibling;
      }
      if (prev) {
        const cat = prev.dataset.category;
        if (matches) catVisibility[cat] = true;
      }
    });

    headers.forEach(h => {
      const cat = h.dataset.category;
      h.style.display = (!q || catVisibility[cat]) ? '' : 'none';
    });

    // Show/hide no-results message
    const anyVisible = Object.keys(catVisibility).length > 0;
    instrNoResults.style.display = (q && !anyVisible) ? 'flex' : 'none';
  }

  // ═══════ RENDER LOOP ═══════
  store.subscribe((state) => {
    // Skip re-render while user is typing in that section
    if (!reqList.contains(document.activeElement)) {
      renderRequiredVars(reqList, state.requiredVariables, state.validationErrors);
    }
    if (!compList.contains(document.activeElement)) {
      renderComputedVars(compList, state.computedVariables, state.validationErrors);
    }
  });

  // Catch-up re-render when focus leaves variable lists
  reqList.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (!reqList.contains(document.activeElement)) {
        const s = store.getState();
        renderRequiredVars(reqList, s.requiredVariables, s.validationErrors);
      }
    });
  });
  compList.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (!compList.contains(document.activeElement)) {
        const s = store.getState();
        renderComputedVars(compList, s.computedVariables, s.validationErrors);
      }
    });
  });

  return palette;
}

// ── Render required variables list ──
function renderRequiredVars(container, vars, errors) {
  clearChildren(container);
  for (const v of vars) {
    const hasError = errors.some(e => e.itemId === v.id && e.severity === 'error');
    const hasWarning = errors.some(e => e.itemId === v.id && e.severity === 'warning');

    const row = el('div', {
      className: `palette__var-row ${hasError ? 'palette__var-row--error' : ''} ${hasWarning ? 'palette__var-row--warning' : ''}`,
      dataset: { id: v.id },
    });

    const prefix = el('span', { className: 'palette__var-prefix' }, '>');
    const input = el('input', {
      type: 'text',
      className: 'palette__var-input',
      placeholder: 'variableName',
      value: undefined,
      spellcheck: 'false',
      onInput: (e) => store.updateRequiredVariable(v.id, e.target.value),
    });
    input.value = v.name;

    const removeBtn = el('button', {
      className: 'palette__var-remove',
      title: 'Remove',
      onClick: () => store.removeRequiredVariable(v.id),
    }, '\u00d7');

    row.append(prefix, input, removeBtn);
    container.appendChild(row);
  }

  if (vars.length === 0) {
    container.appendChild(el('div', { className: 'palette__empty' },
      'No required variables yet. Click ', el('b', {}, '+'), ' to add one.',
      el('br'),
      el('span', { className: 'palette__empty-example' }, 'e.g. pmsName, moduleName, version'),
    ));
  }
}

// ── Render computed variables list ──
function renderComputedVars(container, vars, errors) {
  clearChildren(container);
  for (const v of vars) {
    const hasError = errors.some(e => e.itemId === v.id && e.severity === 'error');

    const card = el('div', {
      className: `comp-var ${hasError ? 'comp-var--error' : ''}`,
      dataset: { id: v.id },
    });

    // Top row: name badge + remove button
    const header = el('div', { className: 'comp-var__header' });

    const nameWrap = el('div', { className: 'comp-var__name-wrap' });
    const nameInput = el('input', {
      type: 'text',
      className: 'comp-var__name',
      placeholder: 'variableName',
      value: undefined,
      spellcheck: 'false',
      onInput: (e) => store.updateComputedVariable(v.id, { name: e.target.value }),
    });
    nameInput.value = v.name;
    nameWrap.append(icon('tag', 10), nameInput);

    const removeBtn = el('button', {
      className: 'comp-var__remove',
      dataset: { tooltip: 'Remove variable' },
      onClick: () => store.removeComputedVariable(v.id),
    }, '\u00d7');

    header.append(nameWrap, removeBtn);

    // Expression area
    const exprWrap = el('div', { className: 'comp-var__expr-wrap' });
    const arrow = el('span', { className: 'comp-var__arrow' }, '\u2192');

    const exprInput = createVariableInput({
      value: v.expression,
      placeholder: '"${templatesDir}/...',
      className: 'comp-var__expr',
      onChange: (val) => store.updateComputedVariable(v.id, { expression: val }),
    });

    exprWrap.append(arrow, exprInput);
    card.append(header, exprWrap);
    container.appendChild(card);
  }

  if (vars.length === 0) {
    container.appendChild(el('div', { className: 'palette__empty' },
      'No computed variables yet. Click ', el('b', {}, '+'), ' to add one.',
      el('br'),
      el('span', { className: 'palette__empty-example' }, 'e.g. baseDir = "${templatesDir}/myFeature"'),
    ));
  }
}
