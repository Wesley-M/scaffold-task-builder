// ─── Instruction Card Component ──────────────────────────────────
// Renders a single instruction as a configurable card.

import { el } from '../utils/dom.js';
import { store } from '../store.js';
import { INSTRUCTION_SCHEMA } from '../types.js';
import { createVariableInput } from './shared/VariableInput.js';
import { openFileBrowser } from './shared/FileBrowser.js';
import { icon } from '../icons.js';

/**
 * Create a card element for an instruction or section divider.
 */
export function createInstructionCard(item, errors = []) {
  // ── Section Divider ──
  if (item.type === '__SECTION__') {
    return createSectionCard(item);
  }

  // ── Raw / unparsed line ──
  if (item.type === '__RAW__') {
    return createRawCard(item);
  }

  const schema = INSTRUCTION_SCHEMA[item.type];
  if (!schema) return el('div', { className: 'card card--error' }, `Unknown: ${item.type}`);

  const itemErrors = errors.filter(e => e.itemId === item.id);
  const hasErrors = itemErrors.some(e => e.severity === 'error');
  const hasWarnings = itemErrors.some(e => e.severity === 'warning');

  const card = el('div', {
    className: `card ${hasErrors ? 'card--has-error' : ''} ${hasWarnings ? 'card--has-warning' : ''} ${item.collapsed ? 'card--collapsed' : ''}`,
    dataset: { id: item.id, category: schema.category },
  });

  // ── Header ──
  const header = el('div', { className: 'card__header' });

  const dragHandle = el('span', {
    className: 'card__drag-handle',
    dataset: { tooltip: 'Drag to reorder' },
  }, icon('grip', 14));

  const typeLabel = el('span', { className: 'card__type' },
    el('span', { className: 'card__icon' }, icon(schema.icon, 14)),
    ` ${schema.label}`,
  );

  const headerActions = el('div', { className: 'card__header-actions' });

  // Move up/down buttons
  const items = store.getState().items;
  const itemIndex = items.findIndex(i => i.id === item.id);

  if (itemIndex > 0) {
    const moveUpBtn = el('button', {
      className: 'card__action-btn',
      dataset: { tooltip: 'Move up' },
      onClick: (e) => { e.stopPropagation(); store.moveItem(itemIndex, itemIndex - 1); },
    }, icon('chevronUp', 12));
    headerActions.appendChild(moveUpBtn);
  }

  if (itemIndex < items.length - 1) {
    const moveDownBtn = el('button', {
      className: 'card__action-btn',
      dataset: { tooltip: 'Move down' },
      onClick: (e) => { e.stopPropagation(); store.moveItem(itemIndex, itemIndex + 1); },
    }, icon('chevronDown', 12));
    headerActions.appendChild(moveDownBtn);
  }

  const dupBtn = el('button', {
    className: 'card__action-btn',
    dataset: { tooltip: 'Duplicate this instruction (Ctrl+D)' },
    onClick: (e) => { e.stopPropagation(); store.duplicateItem(item.id); },
  }, icon('copy', 12));

  const collapseBtn = el('button', {
    className: 'card__action-btn',
    dataset: { tooltip: item.collapsed ? 'Expand fields' : 'Collapse fields' },
    onClick: (e) => { e.stopPropagation(); store.toggleItemCollapsed(item.id); },
  }, item.collapsed ? icon('chevronDown', 12) : icon('chevronUp', 12));

  const removeBtn = el('button', {
    className: 'card__action-btn card__action-btn--danger',
    dataset: { tooltip: 'Remove instruction' },
    onClick: (e) => { e.stopPropagation(); store.removeItem(item.id); },
  }, '\u00d7');

  headerActions.append(dupBtn, collapseBtn, removeBtn);

  // Error badge visible when collapsed
  if (item.collapsed && itemErrors.length > 0) {
    const severity = hasErrors ? 'error' : 'warning';
    const badgeIcon = hasErrors ? 'xCircle' : 'alertTriangle';
    const errorBadge = el('span', {
      className: `card__error-badge card__error-badge--${severity}`,
      dataset: { tooltip: `${itemErrors.length} ${severity === 'error' ? 'error' : 'warning'}${itemErrors.length > 1 ? 's' : ''}` },
    }, icon(badgeIcon, 11), ` ${itemErrors.length}`);
    header.append(dragHandle, typeLabel, errorBadge, headerActions);
  } else {
    header.append(dragHandle, typeLabel, headerActions);
  }

  // Click header to select
  header.addEventListener('click', () => store.selectItem(item.id));

  card.appendChild(header);

  // ── Body (fields) — hidden when collapsed ──
  if (!item.collapsed) {
    const body = el('div', { className: 'card__body' });

    // Description banner
    if (schema.description) {
      const descBanner = el('div', { className: 'info-banner' },
        icon('info', 14),
        el('span', {}, schema.description),
      );
      body.appendChild(descBanner);
    }

    for (const field of schema.fields) {
      const fieldErrors = itemErrors.filter(e => e.field === field.key);
      const fieldWrapper = el('div', {
        className: `card__field ${fieldErrors.length ? 'card__field--error' : ''}`,
      });

      const labelRow = el('div', { className: 'card__field-label-row' });
      const label = el('label', { className: 'card__field-label' }, field.label);
      labelRow.appendChild(label);

      // Field help icon
      if (field.help) {
        const helpEl = el('span', {
          className: 'help-icon tooltip--right',
          dataset: { tooltip: field.help },
        }, '?');
        labelRow.appendChild(helpEl);
      }

      // Template field: add "create template" and "browse" actions
      if (field.type === 'template') {
        const browseBtn = el('button', {
          className: 'card__field-action',
          dataset: { tooltip: 'Browse project files to find a template' },
          onClick: () => openFileBrowser({
            title: 'Select Template File',
            fieldType: 'template',
            currentValue: item.args?.[field.key] || '',
            onSelect: (path) => store.updateItemArgs(item.id, { [field.key]: path }),
          }),
        }, icon('search', 11), 'Browse');
        labelRow.appendChild(browseBtn);

        const createTplBtn = el('button', {
          className: 'card__field-action',
          dataset: { tooltip: 'Create a template file scaffold for this field' },
          onClick: () => showTemplateCreator(item, field),
        }, icon('fileTemplate', 11), 'Create template');
        labelRow.appendChild(createTplBtn);
      }

      // Path fields: add "browse" action
      if (field.type === 'path' && field.key !== 'template') {
        const browseBtn = el('button', {
          className: 'card__field-action',
          dataset: { tooltip: 'Browse project files to select a path' },
          onClick: () => openFileBrowser({
            title: 'Select File',
            fieldType: 'path',
            currentValue: item.args?.[field.key] || '',
            onSelect: (path) => store.updateItemArgs(item.id, { [field.key]: path }),
          }),
        }, icon('search', 11), 'Browse');
        labelRow.appendChild(browseBtn);
      }

      const isMultiline = field.type === 'code';
      const inputWrapper = createVariableInput({
        value: item.args?.[field.key] || '',
        placeholder: field.placeholder || '',
        className: 'card__field-input',
        multiline: isMultiline,
        fieldType: field.type,
        onChange: (val) => store.updateItemArgs(item.id, { [field.key]: val }),
      });

      fieldWrapper.append(labelRow, inputWrapper);

      // Show field-level errors
      for (const err of fieldErrors) {
        const errIcon = err.severity === 'error' ? icon('xCircle', 12) : icon('alertTriangle', 12);
        fieldWrapper.appendChild(
          el('div', { className: `card__field-error card__field-error--${err.severity}` },
            errIcon, err.message
          )
        );
      }

      body.appendChild(fieldWrapper);
    }

    // Tip
    if (schema.tip) {
      const tipEl = el('div', { className: 'card__tip' },
        icon('lightbulb', 12),
        el('span', {}, schema.tip),
      );
      body.appendChild(tipEl);
    }

    // Show item-level errors (not tied to a specific field)
    const itemLevelErrors = itemErrors.filter(e => !e.field);
    for (const err of itemLevelErrors) {
      const errIcon = err.severity === 'error' ? icon('xCircle', 12) : icon('alertTriangle', 12);
      body.appendChild(
        el('div', { className: `card__error card__error--${err.severity}` },
          errIcon, err.message
        )
      );
    }

    card.appendChild(body);
  }

  return card;
}

// ── Section Divider Card ──
function createSectionCard(item) {
  const card = el('div', {
    className: 'card card--section',
    dataset: { id: item.id },
  });

  const dragHandle = el('span', { className: 'card__drag-handle' }, icon('grip', 12));

  const input = el('input', {
    type: 'text',
    className: 'card__section-input',
    placeholder: 'Section Name',
    value: undefined,
    onInput: (e) => store.updateSectionTitle(item.id, e.target.value),
  });
  input.value = item.title || '';

  const removeBtn = el('button', {
    className: 'card__action-btn card__action-btn--danger',
    dataset: { tooltip: 'Remove section' },
    onClick: () => store.removeItem(item.id),
  }, '\u00d7');

  card.append(dragHandle, el('span', { className: 'card__section-dash' }, '\u2500\u2500\u2500\u2500'), input, el('span', { className: 'card__section-dash' }, '\u2500\u2500\u2500\u2500'), removeBtn);
  return card;
}

// ── Raw / unparsed line card ──
function createRawCard(item) {
  const card = el('div', {
    className: 'card card--raw',
    dataset: { id: item.id },
  });

  const dragHandle = el('span', { className: 'card__drag-handle' }, icon('grip', 12));

  const header = el('div', { className: 'card__header' });
  const badge = el('span', { className: 'card__type-badge card__type-badge--raw' }, icon('alertTriangle', 12), ' Unrecognized');
  const removeBtn = el('button', {
    className: 'card__action-btn card__action-btn--danger',
    dataset: { tooltip: 'Remove this line' },
    onClick: () => store.removeItem(item.id),
  }, '\u00d7');
  const actions = el('span', { className: 'card__header-actions' }, removeBtn);
  header.append(badge, actions);

  const body = el('div', { className: 'card__body' });
  const input = el('input', {
    type: 'text',
    className: 'card__raw-input',
    value: undefined,
    placeholder: 'Raw line content',
    onInput: (e) => store.updateRawText(item.id, e.target.value),
  });
  input.value = item.text || '';
  body.appendChild(input);

  card.append(dragHandle, header, body);
  return card;
}

// ── Template Creator Dialog ──
function showTemplateCreator(item, field) {
  const currentPath = item.args?.[field.key] || '';
  const suggestedName = currentPath
    ? currentPath.split('/').pop().replace(/\$\{[^}]*\}/g, 'example')
    : 'template.tpl';

  const overlay = el('div', {
    className: 'modal-overlay',
    onClick: (e) => { if (e.target === overlay) overlay.remove(); },
  });

  const modal = el('div', { className: 'modal' });
  const header = el('div', { className: 'modal__header' },
    el('h3', {}, icon('fileTemplate', 18), ' Create Template File'),
    el('button', { className: 'modal__close', onClick: () => overlay.remove() }, '\u00d7'),
  );

  const body = el('div', { className: 'modal__body' });

  const nameGroup = el('div', { className: 'modal__field' },
    el('label', { className: 'modal__label' }, 'Filename'),
    el('input', {
      type: 'text',
      className: 'modal__input',
      id: 'tpl-filename',
      value: undefined,
      placeholder: 'template-name.tpl',
    }),
  );
  nameGroup.querySelector('input').value = suggestedName;

  const contentGroup = el('div', { className: 'modal__field' },
    el('label', { className: 'modal__label' }, 'Template Content'),
    el('div', { className: 'modal__hint' }, 'Use ${variableName} for dynamic values. Variables from your task are available.'),
    el('textarea', {
      className: 'modal__textarea',
      id: 'tpl-content',
      rows: '12',
      placeholder: '// Template content here...\n// Use ${variableName} for dynamic values',
      spellcheck: 'false',
    }),
  );

  // Variable chips for easy insertion
  const varsBar = el('div', { className: 'modal__vars-bar' },
    el('span', { className: 'modal__vars-label' }, 'Insert variable:'),
  );
  const allVars = store.getAllVariables();
  for (const v of allVars) {
    const chip = el('button', {
      className: 'modal__var-chip',
      onClick: () => {
        const textarea = document.getElementById('tpl-content');
        const pos = textarea.selectionStart;
        const text = textarea.value;
        textarea.value = text.substring(0, pos) + '${' + v.name + '}' + text.substring(pos);
        textarea.focus();
        const newPos = pos + v.name.length + 3;
        textarea.setSelectionRange(newPos, newPos);
      },
    }, '${' + v.name + '}');
    varsBar.appendChild(chip);
  }

  const footer = el('div', { className: 'modal__footer' },
    el('button', {
      className: 'modal__btn modal__btn--secondary',
      onClick: () => overlay.remove(),
    }, 'Cancel'),
    el('button', {
      className: 'modal__btn modal__btn--primary',
      onClick: () => {
        const filename = document.getElementById('tpl-filename')?.value || suggestedName;
        const content = document.getElementById('tpl-content')?.value || '';
        downloadTemplateFile(filename, content);
        overlay.remove();
      },
    }, icon('fileDown', 14), ' Download .tpl'),
  );

  body.append(nameGroup, contentGroup, varsBar);
  modal.append(header, body, footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Focus the textarea
  requestAnimationFrame(() => document.getElementById('tpl-content')?.focus());
}

function downloadTemplateFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.tpl') ? filename : filename + '.tpl';
  a.click();
  URL.revokeObjectURL(url);
}
