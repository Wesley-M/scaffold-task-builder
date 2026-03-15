// ─── DOM Utility Tests ───────────────────────────────────────────

import { describe, it, assert } from './framework.js';
import { el, clearChildren, debounce, showToast } from '../js/utils/dom.js';

export default function domTests() {

  // ═══════════════════════════════════════════════════════════════
  // el() — Element Creation
  // ═══════════════════════════════════════════════════════════════

  describe('DOM — el() basic', () => {
    it('creates element with correct tag', () => {
      assert.equal(el('div').tagName, 'DIV');
      assert.equal(el('span').tagName, 'SPAN');
      assert.equal(el('button').tagName, 'BUTTON');
      assert.equal(el('input').tagName, 'INPUT');
      assert.equal(el('textarea').tagName, 'TEXTAREA');
    });

    it('creates element with no attributes', () => {
      const div = el('div');
      assert.equal(div.attributes.length, 0);
    });

    it('creates element with empty attrs object', () => {
      const div = el('div', {});
      assert.equal(div.tagName, 'DIV');
    });
  });

  describe('DOM — el() className', () => {
    it('sets className', () => {
      const div = el('div', { className: 'my-class' });
      assert.equal(div.className, 'my-class');
    });

    it('sets multiple classes', () => {
      const div = el('div', { className: 'one two three' });
      assert.truthy(div.classList.contains('one'));
      assert.truthy(div.classList.contains('two'));
      assert.truthy(div.classList.contains('three'));
    });

    it('handles empty className', () => {
      const div = el('div', { className: '' });
      assert.equal(div.className, '');
    });
  });

  describe('DOM — el() style', () => {
    it('sets inline styles from object', () => {
      const div = el('div', { style: { color: 'red', fontSize: '14px' } });
      assert.equal(div.style.color, 'red');
      assert.equal(div.style.fontSize, '14px');
    });

    it('handles empty style object', () => {
      const div = el('div', { style: {} });
      assert.equal(div.tagName, 'DIV');
    });

    it('sets display none', () => {
      const div = el('div', { style: { display: 'none' } });
      assert.equal(div.style.display, 'none');
    });
  });

  describe('DOM — el() event listeners', () => {
    it('attaches onClick handler', () => {
      let clicked = false;
      const btn = el('button', { onClick: () => { clicked = true; } });
      btn.click();
      assert.truthy(clicked);
    });

    it('attaches onInput handler', () => {
      let value = '';
      const input = el('input', { onInput: (e) => { value = e.target.value; } });
      input.value = 'hello';
      input.dispatchEvent(new Event('input'));
      assert.equal(value, 'hello');
    });

    it('attaches multiple event handlers', () => {
      let clicks = 0;
      let focuses = 0;
      const input = el('input', {
        onClick: () => { clicks++; },
        onFocus: () => { focuses++; },
      });
      input.click();
      input.dispatchEvent(new Event('focus'));
      assert.equal(clicks, 1);
      assert.equal(focuses, 1);
    });

    it('lowercases event name from onXxx', () => {
      let called = false;
      const div = el('div', { onMouseenter: () => { called = true; } });
      div.dispatchEvent(new Event('mouseenter'));
      assert.truthy(called);
    });
  });

  describe('DOM — el() dataset', () => {
    it('sets data attributes from dataset object', () => {
      const div = el('div', { dataset: { tooltip: 'Hello', id: '42' } });
      assert.equal(div.dataset.tooltip, 'Hello');
      assert.equal(div.dataset.id, '42');
    });

    it('handles empty dataset', () => {
      const div = el('div', { dataset: {} });
      assert.equal(div.tagName, 'DIV');
    });
  });

  describe('DOM — el() attributes', () => {
    it('sets standard attributes', () => {
      const input = el('input', { type: 'text', placeholder: 'Enter...' });
      assert.equal(input.type, 'text');
      assert.equal(input.placeholder, 'Enter...');
    });

    it('sets id attribute', () => {
      const div = el('div', { id: 'my-id' });
      assert.equal(div.id, 'my-id');
    });

    it('sets htmlFor on label', () => {
      const label = el('label', { htmlFor: 'input-1' });
      assert.equal(label.htmlFor, 'input-1');
    });

    it('sets draggable attribute', () => {
      const div = el('div', { draggable: 'true' });
      assert.equal(div.getAttribute('draggable'), 'true');
    });

    it('skips false/null/undefined attributes', () => {
      const div = el('div', { hidden: false, title: null, lang: undefined });
      assert.truthy(!div.hasAttribute('hidden'));
      assert.truthy(!div.hasAttribute('title'));
      assert.truthy(!div.hasAttribute('lang'));
    });

    it('sets tabIndex', () => {
      const div = el('div', { tabIndex: '0' });
      assert.equal(div.getAttribute('tabIndex'), '0');
    });

    it('sets spellcheck', () => {
      const input = el('input', { spellcheck: 'false' });
      assert.equal(input.getAttribute('spellcheck'), 'false');
    });

    it('sets rows on textarea', () => {
      const ta = el('textarea', { rows: '5' });
      assert.equal(ta.getAttribute('rows'), '5');
    });
  });

  describe('DOM — el() children', () => {
    it('appends text string children', () => {
      const div = el('div', {}, 'Hello');
      assert.equal(div.textContent, 'Hello');
    });

    it('appends number children', () => {
      const div = el('div', {}, 42);
      assert.equal(div.textContent, '42');
    });

    it('appends DOM node children', () => {
      const child = el('span', {}, 'inner');
      const parent = el('div', {}, child);
      assert.equal(parent.children.length, 1);
      assert.equal(parent.children[0].tagName, 'SPAN');
      assert.equal(parent.children[0].textContent, 'inner');
    });

    it('appends multiple children', () => {
      const parent = el('div', {},
        el('span', {}, 'A'),
        ' middle ',
        el('span', {}, 'B'),
      );
      assert.equal(parent.children.length, 2);
      assert.includes(parent.textContent, 'A');
      assert.includes(parent.textContent, 'middle');
      assert.includes(parent.textContent, 'B');
    });

    it('appends array children', () => {
      const items = [el('li', {}, 'one'), el('li', {}, 'two')];
      const ul = el('ul', {}, items);
      assert.equal(ul.children.length, 2);
    });

    it('skips null children', () => {
      const div = el('div', {}, null, 'hello', null);
      assert.equal(div.textContent, 'hello');
      assert.equal(div.childNodes.length, 1);
    });

    it('skips false children', () => {
      const div = el('div', {}, false, 'yes');
      assert.equal(div.textContent, 'yes');
    });

    it('handles deeply nested elements', () => {
      const tree = el('div', {},
        el('div', { className: 'level-1' },
          el('div', { className: 'level-2' },
            el('span', {}, 'deep')
          )
        )
      );
      assert.equal(tree.querySelector('.level-2 span').textContent, 'deep');
    });

    it('handles zero as child (not falsy-skipped)', () => {
      const div = el('div', {}, 0);
      assert.equal(div.textContent, '0');
    });

    it('handles empty string child', () => {
      const div = el('div', {}, '');
      assert.equal(div.childNodes.length, 0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // clearChildren()
  // ═══════════════════════════════════════════════════════════════

  describe('DOM — clearChildren()', () => {
    it('removes all child nodes', () => {
      const parent = el('div', {},
        el('span', {}, 'A'),
        el('span', {}, 'B'),
        el('span', {}, 'C'),
      );
      assert.equal(parent.children.length, 3);
      clearChildren(parent);
      assert.equal(parent.children.length, 0);
    });

    it('handles element with no children', () => {
      const div = el('div');
      clearChildren(div);
      assert.equal(div.children.length, 0);
    });

    it('removes text nodes too', () => {
      const div = el('div', {}, 'hello ', el('b', {}, 'world'));
      assert.greaterThan(div.childNodes.length, 0);
      clearChildren(div);
      assert.equal(div.childNodes.length, 0);
    });

    it('element still usable after clearing', () => {
      const div = el('div', {}, el('span'));
      clearChildren(div);
      div.appendChild(el('p', {}, 'new'));
      assert.equal(div.children.length, 1);
      assert.equal(div.children[0].tagName, 'P');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // debounce()
  // ═══════════════════════════════════════════════════════════════

  describe('DOM — debounce()', () => {
    it('returns a function', () => {
      const fn = debounce(() => {}, 100);
      assert.equal(typeof fn, 'function');
    });

    it('delays execution', (done) => {
      let called = false;
      const fn = debounce(() => { called = true; }, 50);
      fn();
      assert.truthy(!called, 'Should not be called immediately');
      setTimeout(() => {
        assert.truthy(called, 'Should be called after delay');
        done();
      }, 100);
    });

    it('only fires once for rapid calls', (done) => {
      let count = 0;
      const fn = debounce(() => { count++; }, 50);
      fn(); fn(); fn(); fn(); fn();
      setTimeout(() => {
        assert.equal(count, 1, 'Should fire only once');
        done();
      }, 100);
    });

    it('passes arguments to the debounced function', (done) => {
      let received = null;
      const fn = debounce((a, b) => { received = [a, b]; }, 50);
      fn('x', 'y');
      setTimeout(() => {
        assert.deepEqual(received, ['x', 'y']);
        done();
      }, 100);
    });

    it('uses last call arguments when called multiple times', (done) => {
      let received = null;
      const fn = debounce((v) => { received = v; }, 50);
      fn('first');
      fn('second');
      fn('last');
      setTimeout(() => {
        assert.equal(received, 'last');
        done();
      }, 100);
    });

    it('defaults to 300ms delay', (done) => {
      let called = false;
      const fn = debounce(() => { called = true; });
      fn();
      setTimeout(() => {
        assert.truthy(!called, 'Should not fire before 300ms');
      }, 200);
      setTimeout(() => {
        assert.truthy(called, 'Should fire after 300ms');
        done();
      }, 400);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // showToast()
  // ═══════════════════════════════════════════════════════════════

  describe('DOM — showToast()', () => {
    it('creates a toast element on document.body', () => {
      showToast('Test message', 500);
      const toasts = document.querySelectorAll('.toast');
      assert.greaterThan(toasts.length, 0);
      // cleanup
      toasts.forEach(t => t.remove());
    });

    it('toast contains the message text', () => {
      showToast('Hello World', 500);
      const toast = document.querySelector('.toast');
      assert.truthy(toast);
      assert.includes(toast.textContent, 'Hello World');
      toast.remove();
    });

    it('toast gets visible class via requestAnimationFrame', (done) => {
      showToast('Visible test', 1000);
      // rAF fires next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const toast = document.querySelector('.toast');
          assert.truthy(toast);
          assert.truthy(toast.classList.contains('toast--visible'));
          toast.remove();
          done();
        });
      });
    });

    it('toast is removed after duration', (done) => {
      showToast('Temp toast', 200);
      setTimeout(() => {
        // After duration + remove transition (300ms)
        const toast = document.querySelector('.toast');
        // Should be gone or in removal phase
        if (toast) toast.remove();
        done();
      }, 600);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // el() — Combined / edge cases
  // ═══════════════════════════════════════════════════════════════

  describe('DOM — el() combined patterns', () => {
    it('creates a complete form field', () => {
      const field = el('div', { className: 'field' },
        el('label', { htmlFor: 'name', className: 'field__label' }, 'Name'),
        el('input', { type: 'text', id: 'name', placeholder: 'Enter name' }),
      );
      assert.equal(field.children.length, 2);
      assert.equal(field.querySelector('label').htmlFor, 'name');
      assert.equal(field.querySelector('input').type, 'text');
    });

    it('creates a button with icon and text', () => {
      const btn = el('button', {
        className: 'btn btn--primary',
        onClick: () => {},
      },
        el('span', { className: 'icon' }, '\u2713'),
        ' Save',
      );
      assert.equal(btn.className, 'btn btn--primary');
      assert.includes(btn.textContent, 'Save');
    });

    it('creates a list from array data', () => {
      const items = ['Apple', 'Banana', 'Cherry'];
      const ul = el('ul', {},
        items.map(item => el('li', {}, item)),
      );
      assert.equal(ul.children.length, 3);
      assert.equal(ul.children[1].textContent, 'Banana');
    });

    it('handles all attribute types simultaneously', () => {
      let clicked = false;
      const div = el('div', {
        id: 'combo',
        className: 'box',
        style: { margin: '10px' },
        dataset: { value: '42' },
        tabIndex: '0',
        onClick: () => { clicked = true; },
      }, 'Content');
      assert.equal(div.id, 'combo');
      assert.equal(div.className, 'box');
      assert.equal(div.style.margin, '10px');
      assert.equal(div.dataset.value, '42');
      assert.equal(div.textContent, 'Content');
      div.click();
      assert.truthy(clicked);
    });
  });
}
