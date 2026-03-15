import { el, clearChildren } from '../utils/dom.js';
import { icon } from '../icons.js';

const STORAGE_KEY = 'scaffold-ui-onboarding-done';

const STEPS = [
  {
    target: '.tab-bar',
    title: 'Tabs',
    body: 'Each tab is an independent task file. Click "Open Folder" to load all .task files from a directory, or "New" to create a fresh one. All tabs are autosaved.',
    position: 'bottom',
  },
  {
    target: '.palette',
    title: 'Toolbox',
    body: 'Define your variables here and browse available instructions. Click an instruction to add it to the pipeline, or drag it over.',
    position: 'right',
  },
  {
    target: '.palette__section:first-child',
    title: 'Variables',
    body: 'Required variables are inputs the user provides at runtime. Computed variables are derived expressions — e.g. baseDir = "${templatesDir}/myFeature". Type ${ in any field for autocomplete.',
    position: 'right',
  },
  {
    target: '.pipeline',
    title: 'Pipeline',
    body: 'Your task steps live here. Each card is an operation — create files, insert content, anchor insertions. Drag cards to reorder, click to select, and use the arrow buttons to move them.',
    position: 'left',
  },
  {
    target: '.context-panel',
    title: 'Preview & Details',
    body: 'See a live .task file preview as you build — or edit the raw text directly (changes sync both ways). The Validation tab shows any issues.',
    position: 'left',
  },
  {
    target: '.toolbar',
    title: 'Toolbar',
    body: '"Open Folder" loads all .task files from a directory for live editing. Save writes back to the file (Ctrl+S). New creates a fresh task. Undo/Redo, theme toggle, and font size controls are all here. Press ? for keyboard shortcuts.',
    position: 'bottom',
  },
];

/**
 * Check if onboarding should be shown and launch it.
 * Call this from app.js after initial render.
 */
export function maybeShowOnboarding() {
  if (localStorage.getItem(STORAGE_KEY)) return;
  // Slight delay to let layout settle
  setTimeout(() => showOnboarding(), 400);
}

/** Show the onboarding from a specific step (default 0). */
export function showOnboarding(startStep = 0) {
  // Remove any existing overlay
  const existing = document.getElementById('onboarding-overlay');
  if (existing) existing.remove();

  let currentStep = startStep;

  // ── Overlay container ──
  const overlay = el('div', { id: 'onboarding-overlay', className: 'onboarding-overlay' });

  // ── Backdrop (dims everything except spotlight) ──
  const backdrop = el('div', { className: 'onboarding-backdrop' });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) finish();
  });

  // ── Spotlight hole (SVG mask) ──
  const spotlightSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  spotlightSvg.classList.add('onboarding-spotlight');
  spotlightSvg.setAttribute('width', '100%');
  spotlightSvg.setAttribute('height', '100%');
  spotlightSvg.innerHTML = `
    <defs>
      <mask id="onboarding-mask">
        <rect width="100%" height="100%" fill="white"/>
        <rect id="onboarding-hole" rx="8" ry="8" fill="black"/>
      </mask>
    </defs>
    <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#onboarding-mask)"/>
  `;

  // ── Tooltip ──
  const tooltip = el('div', { className: 'onboarding-tooltip' });

  overlay.append(spotlightSvg, tooltip);
  document.body.appendChild(overlay);

  function renderStep() {
    const step = STEPS[currentStep];
    const targetEl = document.querySelector(step.target);
    if (!targetEl) {
      // Skip this step if target doesn't exist
      if (currentStep < STEPS.length - 1) { currentStep++; renderStep(); }
      else finish();
      return;
    }

    // Position spotlight hole
    const rect = targetEl.getBoundingClientRect();
    const pad = 6;
    const hole = spotlightSvg.querySelector('#onboarding-hole');
    hole.setAttribute('x', rect.left - pad);
    hole.setAttribute('y', rect.top - pad);
    hole.setAttribute('width', rect.width + pad * 2);
    hole.setAttribute('height', rect.height + pad * 2);

    // Build tooltip content
    clearChildren(tooltip);

    const header = el('div', { className: 'onboarding-tooltip__header' },
      el('span', { className: 'onboarding-tooltip__step' }, `${currentStep + 1} / ${STEPS.length}`),
      el('button', {
        className: 'onboarding-tooltip__close',
        onClick: finish,
        dataset: { tooltip: 'Skip tour' },
      }, '\u00d7'),
    );

    const title = el('div', { className: 'onboarding-tooltip__title' }, step.title);
    const body = el('div', { className: 'onboarding-tooltip__body' }, step.body);

    const nav = el('div', { className: 'onboarding-tooltip__nav' });

    if (currentStep > 0) {
      nav.appendChild(el('button', {
        className: 'onboarding-tooltip__btn onboarding-tooltip__btn--secondary',
        onClick: () => { currentStep--; renderStep(); },
      }, icon('chevronLeft', 12), ' Back'));
    }

    const skipBtn = el('button', {
      className: 'onboarding-tooltip__btn onboarding-tooltip__btn--ghost',
      onClick: finish,
    }, 'Skip tour');
    nav.appendChild(skipBtn);

    if (currentStep < STEPS.length - 1) {
      nav.appendChild(el('button', {
        className: 'onboarding-tooltip__btn onboarding-tooltip__btn--primary',
        onClick: () => { currentStep++; renderStep(); },
      }, 'Next ', icon('chevronRight', 12)));
    } else {
      nav.appendChild(el('button', {
        className: 'onboarding-tooltip__btn onboarding-tooltip__btn--primary',
        onClick: finish,
      }, icon('check', 12), " Let's go!"));
    }

    tooltip.append(header, title, body, nav);

    // Position tooltip relative to target
    positionTooltip(tooltip, rect, step.position);
  }

  function positionTooltip(tip, rect, position) {
    // Reset
    tip.style.top = '';
    tip.style.left = '';
    tip.style.right = '';
    tip.style.bottom = '';
    tip.removeAttribute('data-position');
    tip.setAttribute('data-position', position);

    const tipWidth = 340;
    const gap = 16;

    switch (position) {
      case 'right':
        tip.style.top = `${rect.top + rect.height / 2}px`;
        tip.style.left = `${rect.right + gap}px`;
        tip.style.transform = 'translateY(-50%)';
        break;
      case 'left':
        tip.style.top = `${rect.top + rect.height / 2}px`;
        tip.style.right = `${window.innerWidth - rect.left + gap}px`;
        tip.style.transform = 'translateY(-50%)';
        break;
      case 'bottom':
        tip.style.top = `${rect.bottom + gap}px`;
        tip.style.left = `${rect.left + rect.width / 2}px`;
        tip.style.transform = 'translateX(-50%)';
        break;
      case 'top':
        tip.style.bottom = `${window.innerHeight - rect.top + gap}px`;
        tip.style.left = `${rect.left + rect.width / 2}px`;
        tip.style.transform = 'translateX(-50%)';
        break;
    }

    // Clamp to viewport
    requestAnimationFrame(() => {
      const tipRect = tip.getBoundingClientRect();
      if (tipRect.right > window.innerWidth - 8) {
        tip.style.left = `${window.innerWidth - tipWidth - 16}px`;
        tip.style.transform = position === 'bottom' || position === 'top' ? '' : 'translateY(-50%)';
      }
      if (tipRect.left < 8) {
        tip.style.left = '16px';
        tip.style.right = '';
        tip.style.transform = position === 'bottom' || position === 'top' ? '' : 'translateY(-50%)';
      }
    });
  }

  function finish() {
    localStorage.setItem(STORAGE_KEY, '1');
    overlay.classList.add('onboarding-overlay--fade-out');
    setTimeout(() => overlay.remove(), 300);
  }

  // Handle escape key
  function onKey(e) {
    if (e.key === 'Escape') { finish(); document.removeEventListener('keydown', onKey); }
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      if (currentStep < STEPS.length - 1) { currentStep++; renderStep(); }
      else finish();
    }
    if (e.key === 'ArrowLeft' && currentStep > 0) { currentStep--; renderStep(); }
  }
  document.addEventListener('keydown', onKey);

  // Handle window resize
  function onResize() { renderStep(); }
  window.addEventListener('resize', onResize);

  // Clean up listeners when overlay is removed
  const observer = new MutationObserver(() => {
    if (!document.getElementById('onboarding-overlay')) {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true });

  renderStep();
}

/** Reset onboarding so it shows again on next load. */
export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
}
