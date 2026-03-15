// ─── DOM Utility Helpers ─────────────────────────────────────────
// Tiny helpers to keep component code clean.

/**
 * Create a DOM element with optional attributes, classes, and children.
 */
export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      const event = key.slice(2).toLowerCase();
      element.addEventListener(event, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      for (const [dk, dv] of Object.entries(value)) {
        element.dataset[dk] = dv;
      }
    } else if (key === 'htmlFor') {
      element.htmlFor = value;
    } else if (value !== false && value !== null && value !== undefined) {
      element.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (child == null || child === false || child === '') continue;
    if (typeof child === 'string' || typeof child === 'number') {
      element.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      element.appendChild(child);
    } else if (Array.isArray(child)) {
      for (const c of child) {
        if (c instanceof Node) element.appendChild(c);
        else if (c != null) element.appendChild(document.createTextNode(String(c)));
      }
    }
  }

  return element;
}

/**
 * Clear all children from a DOM element.
 */
export function clearChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Simple debounce function.
 */
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Show a toast notification.
 */
export function showToast(message, duration = 3000) {
  const toast = el('div', { className: 'toast' }, message);
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
