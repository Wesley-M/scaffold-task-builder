// ─── Tab Bar Component ───────────────────────────────────────────

import { el, clearChildren } from '../utils/dom.js';
import { store } from '../store.js';
import { icon } from '../icons.js';

export function createTabBar() {
  const bar = el('div', { className: 'tab-bar' });

  const tabList = el('div', { className: 'tab-bar__list' });
  const addBtn = el('button', {
    className: 'tab-bar__add',
    dataset: { tooltip: 'New tab (empty task)' },
    onClick: () => store.addTab(''),
  }, icon('plus', 12));

  bar.append(tabList, addBtn);

  function render(tabs) {
    clearChildren(tabList);
    for (const tab of tabs) {
      const tabEl = el('div', {
        className: `tab-bar__tab ${tab.active ? 'tab-bar__tab--active' : ''}`,
        onClick: () => store.switchTab(tab.id),
      });

      // Dirty dot indicator
      if (tab.dirty) {
        tabEl.appendChild(el('span', { className: 'tab-bar__dirty', dataset: { tooltip: 'Unsaved changes' } }, '●'));
      }

      // File icon if associated with a file
      if (tab.filePath) {
        tabEl.appendChild(el('span', { className: 'tab-bar__file-icon' }, icon('fileTemplate', 10)));
      }

      const label = el('span', { className: 'tab-bar__label' }, tab.name || 'Untitled');
      tabEl.appendChild(label);

      // Show abbreviated path on hover
      if (tab.filePath) {
        tabEl.dataset.tooltip = tab.filePath;
      }

      // Close button (only if >1 tab)
      if (tabs.length > 1) {
        const closeBtn = el('button', {
          className: 'tab-bar__close',
          dataset: { tooltip: 'Close tab' },
          onClick: (e) => {
            e.stopPropagation();
            if (tab.dirty) {
              if (!confirm(`Close "${tab.name || 'Untitled'}"? Unsaved changes will be lost.`)) return;
            }
            store.closeTab(tab.id);
          },
        }, '\u00d7');
        tabEl.appendChild(closeBtn);
      }

      tabList.appendChild(tabEl);
    }
  }

  // Initial render + subscribe
  render(store.getTabs());
  store.subscribeTabs(render);

  return bar;
}
