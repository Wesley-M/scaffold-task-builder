// ─── Tooltip Manager ─────────────────────────────────────────────
// JS-based tooltip system that renders tooltips in a fixed-position
// overlay on <body>, so they are never clipped by overflow containers.

let tooltipEl = null;
let arrowEl = null;
let showTimer = null;
let currentTarget = null;

const DELAY = 400;   // ms before showing
const MARGIN = 8;    // gap between tooltip and element
const VIEWPORT_PAD = 6; // min distance from viewport edge

function ensureTooltipEl() {
  if (tooltipEl) return;
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'tt';
  tooltipEl.setAttribute('role', 'tooltip');

  arrowEl = document.createElement('div');
  arrowEl.className = 'tt__arrow';
  tooltipEl.appendChild(arrowEl);

  document.body.appendChild(tooltipEl);
}

function show(target) {
  const text = target.dataset.tooltip;
  if (!text) return;

  ensureTooltipEl();
  currentTarget = target;

  // Set content (after arrow)
  tooltipEl.childNodes.forEach((n, i) => { if (i > 0) n.remove(); });
  // Clear all text nodes after arrow
  while (tooltipEl.childNodes.length > 1) {
    tooltipEl.removeChild(tooltipEl.lastChild);
  }
  tooltipEl.appendChild(document.createTextNode(text));

  // Make visible but off-screen to measure
  tooltipEl.style.opacity = '0';
  tooltipEl.style.display = 'block';
  tooltipEl.style.left = '0px';
  tooltipEl.style.top = '0px';

  requestAnimationFrame(() => {
    if (currentTarget !== target) return;
    position(target);
    tooltipEl.style.opacity = '1';
  });
}

function position(target) {
  const rect = target.getBoundingClientRect();
  const ttRect = tooltipEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Try positions in order: bottom, top, right, left
  const positions = bestPositionOrder(rect, ttRect, vw, vh);

  for (const pos of positions) {
    const coords = calcPosition(pos, rect, ttRect, vw, vh);
    if (coords) {
      applyPosition(pos, coords, rect, ttRect);
      return;
    }
  }

  // Fallback: bottom, clamped
  const coords = calcPosition('bottom', rect, ttRect, vw, vh, true);
  applyPosition('bottom', coords, rect, ttRect);
}

function bestPositionOrder(rect, ttRect, vw, vh) {
  // Prefer bottom for toolbar items near the top
  if (rect.top < 80) return ['bottom', 'right', 'left', 'top'];
  // Prefer right for left-panel items
  if (rect.left < 300) return ['right', 'bottom', 'top', 'left'];
  // Prefer left for right-panel items
  if (rect.right > vw - 300) return ['left', 'bottom', 'top', 'right'];
  // Default: top first
  return ['top', 'bottom', 'right', 'left'];
}

function calcPosition(pos, rect, ttRect, vw, vh, force = false) {
  let left, top;

  switch (pos) {
    case 'top':
      left = rect.left + rect.width / 2 - ttRect.width / 2;
      top = rect.top - ttRect.height - MARGIN;
      break;
    case 'bottom':
      left = rect.left + rect.width / 2 - ttRect.width / 2;
      top = rect.bottom + MARGIN;
      break;
    case 'left':
      left = rect.left - ttRect.width - MARGIN;
      top = rect.top + rect.height / 2 - ttRect.height / 2;
      break;
    case 'right':
      left = rect.right + MARGIN;
      top = rect.top + rect.height / 2 - ttRect.height / 2;
      break;
  }

  // Clamp to viewport
  const clampedLeft = Math.max(VIEWPORT_PAD, Math.min(left, vw - ttRect.width - VIEWPORT_PAD));
  const clampedTop = Math.max(VIEWPORT_PAD, Math.min(top, vh - ttRect.height - VIEWPORT_PAD));

  // Check if it fits without clamping (or we're forcing)
  if (force) return { left: clampedLeft, top: clampedTop };

  const fits = (
    left >= VIEWPORT_PAD &&
    left + ttRect.width <= vw - VIEWPORT_PAD &&
    top >= VIEWPORT_PAD &&
    top + ttRect.height <= vh - VIEWPORT_PAD
  );

  return fits ? { left, top } : null;
}

function applyPosition(pos, coords, triggerRect, ttRect) {
  tooltipEl.style.left = `${Math.round(coords.left)}px`;
  tooltipEl.style.top = `${Math.round(coords.top)}px`;

  // Position arrow
  tooltipEl.dataset.pos = pos;
  const arrowSize = 5;

  switch (pos) {
    case 'top':
      arrowEl.style.left = `${Math.round(triggerRect.left + triggerRect.width / 2 - coords.left - arrowSize)}px`;
      arrowEl.style.top = '';
      arrowEl.style.bottom = `-${arrowSize * 2}px`;
      arrowEl.style.right = '';
      break;
    case 'bottom':
      arrowEl.style.left = `${Math.round(triggerRect.left + triggerRect.width / 2 - coords.left - arrowSize)}px`;
      arrowEl.style.top = `-${arrowSize * 2}px`;
      arrowEl.style.bottom = '';
      arrowEl.style.right = '';
      break;
    case 'left':
      arrowEl.style.top = `${Math.round(triggerRect.top + triggerRect.height / 2 - coords.top - arrowSize)}px`;
      arrowEl.style.right = `-${arrowSize * 2}px`;
      arrowEl.style.left = '';
      arrowEl.style.bottom = '';
      break;
    case 'right':
      arrowEl.style.top = `${Math.round(triggerRect.top + triggerRect.height / 2 - coords.top - arrowSize)}px`;
      arrowEl.style.left = `-${arrowSize * 2}px`;
      arrowEl.style.right = '';
      arrowEl.style.bottom = '';
      break;
  }
}

function hide() {
  clearTimeout(showTimer);
  currentTarget = null;
  if (tooltipEl) {
    tooltipEl.style.display = 'none';
    tooltipEl.style.opacity = '0';
  }
}

/**
 * Initialize the tooltip system. Call once on app boot.
 * Delegates mouseenter/mouseleave on any [data-tooltip] element.
 */
export function initTooltips() {
  document.addEventListener('mouseenter', (e) => {
    const target = e.target.closest?.('[data-tooltip]');
    if (!target || !target.dataset.tooltip) return;

    // Don't show tooltips when a focusable child is focused (e.g. inputs)
    if (target.querySelector(':focus')) return;

    clearTimeout(showTimer);
    showTimer = setTimeout(() => show(target), DELAY);
  }, true);

  document.addEventListener('mouseleave', (e) => {
    const target = e.target.closest?.('[data-tooltip]');
    if (target) hide();
  }, true);

  // Also hide on scroll, resize, click, keydown
  document.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
  document.addEventListener('mousedown', hide);
  document.addEventListener('keydown', hide);
}
