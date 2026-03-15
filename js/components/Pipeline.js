// ─── Pipeline Component (DnD Sortable List) ─────────────────────

import { el, clearChildren } from '../utils/dom.js';
import { store } from '../store.js';
import { createInstruction } from '../types.js';
import { createInstructionCard } from './InstructionCard.js';
import { icon } from '../icons.js';

export function createPipeline() {
  const pipeline = el('main', { className: 'pipeline' });

  const pipelineHeader = el('div', { className: 'pipeline__header' },
    el('h2', { className: 'pipeline__title' }, 'Instruction Pipeline'),
    el('span', { className: 'pipeline__count', id: 'pipeline-count' }, '0 instructions'),
  );

  const list = el('div', {
    className: 'pipeline__list',
    id: 'pipeline-list',
  });

  // ── Drop zone for new instructions from palette ──
  const emptyState = el('div', {
    className: 'pipeline__empty',
    id: 'pipeline-empty',
  },
    el('div', { className: 'pipeline__empty-icon' }, icon('blocks', 48)),
    el('div', { className: 'pipeline__empty-text' }, 'Your task pipeline is empty'),
    el('div', { className: 'pipeline__empty-hint' },
      'Click an instruction in the ',
      el('b', {}, 'Toolbox'),
      ' panel, or drag one here to get started.',
    ),
    el('div', { className: 'pipeline__empty-steps' },
      el('div', { className: 'pipeline__step' }, el('span', { className: 'pipeline__step-num' }, '1'), 'Define variables in the Toolbox'),
      el('div', { className: 'pipeline__step' }, el('span', { className: 'pipeline__step-num' }, '2'), 'Add instructions to this pipeline'),
      el('div', { className: 'pipeline__step' }, el('span', { className: 'pipeline__step-num' }, '3'), 'Export your .task file'),
    ),
    el('div', { className: 'pipeline__empty-shortcuts' },
      el('kbd', {}, 'Ctrl+Z'), ' undo  ',
      el('kbd', {}, '?'), ' shortcuts',
    ),
  );

  pipeline.append(pipelineHeader, list, emptyState);

  // ═══════ DRAG & DROP — Reordering ═══════

  let draggedIndex = null;
  let dragOverIndex = null;

  list.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const items = store.getState().items;
    draggedIndex = items.findIndex(i => i.id === card.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    card.classList.add('card--dragging');

    // Needed for Firefox
    e.dataTransfer.setData('text/plain', card.dataset.id);
  });

  list.addEventListener('dragend', (e) => {
    const card = e.target.closest('.card');
    if (card) card.classList.remove('card--dragging');
    clearDropIndicators();
    draggedIndex = null;
    dragOverIndex = null;
  });

  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation(); // keep dragover from bubbling to pipeline

    // Check if this is a palette drag (new instruction)
    const instrType = e.dataTransfer.types.includes('application/x-instruction-type');

    if (draggedIndex === null && !instrType) return;
    e.dataTransfer.dropEffect = instrType ? 'copy' : 'move';

    const card = e.target.closest('.card');
    if (!card) return;

    const items = store.getState().items;
    const overIdx = items.findIndex(i => i.id === card.dataset.id);
    if (overIdx === -1) return;

    // Determine if dropping above or below
    const rect = card.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const isAbove = e.clientY < midY;

    clearDropIndicators();
    card.classList.add(isAbove ? 'card--drop-above' : 'card--drop-below');
    dragOverIndex = isAbove ? overIdx : overIdx + 1;
  });

  list.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation(); // prevent bubble to pipeline handler (avoids duplicates)

    // Handle palette drop (new instruction)
    const instrType = e.dataTransfer.getData('application/x-instruction-type');
    if (instrType) {
      const newItem = createInstruction(instrType);
      store.addItem(newItem, dragOverIndex ?? -1);
      clearDropIndicators();
      dragOverIndex = null;
      return;
    }

    // Handle reorder
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const adjustedTo = dragOverIndex > draggedIndex ? dragOverIndex - 1 : dragOverIndex;
      store.moveItem(draggedIndex, adjustedTo);
    }

    clearDropIndicators();
    dragOverIndex = null;
  });

  // Also allow drop on the pipeline itself (for empty state)
  pipeline.addEventListener('dragover', (e) => {
    if (e.dataTransfer.types.includes('application/x-instruction-type')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      pipeline.classList.add('pipeline--drop-active');
    }
  });

  pipeline.addEventListener('dragleave', () => {
    pipeline.classList.remove('pipeline--drop-active');
  });

  pipeline.addEventListener('drop', (e) => {
    pipeline.classList.remove('pipeline--drop-active');
    const instrType = e.dataTransfer.getData('application/x-instruction-type');
    if (instrType && dragOverIndex === null) {
      e.preventDefault();
      store.addItem(createInstruction(instrType));
    }
  });

  function clearDropIndicators() {
    list.querySelectorAll('.card--drop-above, .card--drop-below')
      .forEach(c => c.classList.remove('card--drop-above', 'card--drop-below'));
  }

  // ═══════ RENDER ═══════

  store.subscribe((state) => {
    // Skip re-render while user is typing inside a card input
    const ae = document.activeElement;
    const isEditing = list.contains(ae) && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA');
    if (!isEditing) {
      renderPipeline(list, state);
    }

    // Update count
    const count = state.items.filter(i => i.type !== '__SECTION__').length;
    const countEl = document.getElementById('pipeline-count');
    if (countEl) countEl.textContent = `${count} instruction${count !== 1 ? 's' : ''}`;

    // Toggle empty state
    emptyState.style.display = state.items.length === 0 ? 'flex' : 'none';
    list.style.display = state.items.length === 0 ? 'none' : 'block';
  });

  // Catch-up re-render when focus leaves the pipeline
  list.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (!list.contains(document.activeElement)) {
        renderPipeline(list, store.getState());
      }
    });
  });

  return pipeline;
}

function renderPipeline(container, state) {
  clearChildren(container);
  let selectedCard = null;
  for (const item of state.items) {
    const card = createInstructionCard(item, state.validationErrors);

    // Make cards draggable for reorder
    card.draggable = true;

    // Highlight selected
    if (state.selectedItemId === item.id) {
      card.classList.add('card--selected');
      selectedCard = card;
    }

    container.appendChild(card);
  }

  // Scroll selected card into view (smooth, only if off-screen)
  if (selectedCard) {
    requestAnimationFrame(() => {
      selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
}
