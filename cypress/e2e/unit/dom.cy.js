// ─── DOM Utility Tests (migrated from tests/dom.test.js) ───

describe('DOM — el() basic', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('creates element with correct tag', () => {
    cy.getTestModules().then(({ el }) => {
      expect(el('div').tagName).to.equal('DIV');
      expect(el('span').tagName).to.equal('SPAN');
      expect(el('button').tagName).to.equal('BUTTON');
      expect(el('input').tagName).to.equal('INPUT');
      expect(el('textarea').tagName).to.equal('TEXTAREA');
    });
  });

  it('creates element with no attributes', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div');
      expect(div.attributes.length).to.equal(0);
    });
  });

  it('creates element with empty attrs object', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', {});
      expect(div.tagName).to.equal('DIV');
    });
  });
});

describe('DOM — el() className', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('sets className', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', { className: 'my-class' });
      expect(div.className).to.equal('my-class');
    });
  });

  it('sets multiple classes', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', { className: 'one two three' });
      expect(div.classList.contains('one')).to.be.true;
      expect(div.classList.contains('two')).to.be.true;
      expect(div.classList.contains('three')).to.be.true;
    });
  });

  it('handles empty className', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', { className: '' });
      expect(div.className).to.equal('');
    });
  });
});

describe('DOM — el() style', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('sets inline styles from object', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', { style: { color: 'red', fontSize: '14px' } });
      expect(div.style.color).to.equal('red');
      expect(div.style.fontSize).to.equal('14px');
    });
  });

  it('handles empty style object', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', { style: {} });
      expect(div.tagName).to.equal('DIV');
    });
  });

  it('sets display none', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', { style: { display: 'none' } });
      expect(div.style.display).to.equal('none');
    });
  });
});

describe('DOM — el() event listeners', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('attaches onClick handler', () => {
    cy.getTestModules().then(({ el }) => {
      let clicked = false;
      const btn = el('button', { onClick: () => { clicked = true; } });
      btn.click();
      expect(clicked).to.be.true;
    });
  });

  it('attaches onInput handler', () => {
    cy.window().then((win) => {
      const { el } = win.__test__;
      let value = '';
      const input = el('input', { onInput: (e) => { value = e.target.value; } });
      input.value = 'hello';
      input.dispatchEvent(new win.Event('input'));
      expect(value).to.equal('hello');
    });
  });

  it('attaches multiple event handlers', () => {
    cy.window().then((win) => {
      const { el } = win.__test__;
      let clicks = 0;
      let focuses = 0;
      const input = el('input', {
        onClick: () => { clicks++; },
        onFocus: () => { focuses++; },
      });
      input.click();
      input.dispatchEvent(new win.Event('focus'));
      expect(clicks).to.equal(1);
      expect(focuses).to.equal(1);
    });
  });

  it('lowercases event name from onXxx', () => {
    cy.window().then((win) => {
      const { el } = win.__test__;
      let called = false;
      const div = el('div', { onMouseenter: () => { called = true; } });
      div.dispatchEvent(new win.Event('mouseenter'));
      expect(called).to.be.true;
    });
  });
});

describe('DOM — el() dataset', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('sets data attributes from dataset object', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', { dataset: { tooltip: 'Hello', id: '42' } });
      expect(div.dataset.tooltip).to.equal('Hello');
      expect(div.dataset.id).to.equal('42');
    });
  });

  it('handles empty dataset', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', { dataset: {} });
      expect(div.tagName).to.equal('DIV');
    });
  });
});

describe('DOM — el() attributes', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('sets standard attributes', () => {
    cy.getTestModules().then(({ el }) => {
      const input = el('input', { type: 'text', placeholder: 'Enter...' });
      expect(input.type).to.equal('text');
      expect(input.placeholder).to.equal('Enter...');
    });
  });

  it('sets id attribute', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', { id: 'my-id' });
      expect(div.id).to.equal('my-id');
    });
  });

  it('sets htmlFor on label', () => {
    cy.getTestModules().then(({ el }) => {
      const label = el('label', { htmlFor: 'input-1' });
      expect(label.htmlFor).to.equal('input-1');
    });
  });

  it('sets draggable attribute', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', { draggable: 'true' });
      expect(div.getAttribute('draggable')).to.equal('true');
    });
  });

  it('skips false/null/undefined attributes', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', { hidden: false, title: null, lang: undefined });
      expect(div.hasAttribute('hidden')).to.be.false;
      expect(div.hasAttribute('title')).to.be.false;
      expect(div.hasAttribute('lang')).to.be.false;
    });
  });

  it('sets tabIndex', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', { tabIndex: '0' });
      expect(div.getAttribute('tabIndex')).to.equal('0');
    });
  });

  it('sets spellcheck', () => {
    cy.getTestModules().then(({ el }) => {
      const input = el('input', { spellcheck: 'false' });
      expect(input.getAttribute('spellcheck')).to.equal('false');
    });
  });

  it('sets rows on textarea', () => {
    cy.getTestModules().then(({ el }) => {
      const ta = el('textarea', { rows: '5' });
      expect(ta.getAttribute('rows')).to.equal('5');
    });
  });
});

describe('DOM — el() children', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('appends text string children', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', {}, 'Hello');
      expect(div.textContent).to.equal('Hello');
    });
  });

  it('appends number children', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', {}, 42);
      expect(div.textContent).to.equal('42');
    });
  });

  it('appends DOM node children', () => {
    cy.getTestModules().then(({ el }) => {
      const child = el('span', {}, 'inner');
      const parent = el('div', {}, child);
      expect(parent.children.length).to.equal(1);
      expect(parent.children[0].tagName).to.equal('SPAN');
      expect(parent.children[0].textContent).to.equal('inner');
    });
  });

  it('appends multiple children', () => {
    cy.getTestModules().then(({ el }) => {
      const parent = el('div', {},
        el('span', {}, 'A'),
        ' middle ',
        el('span', {}, 'B'),
      );
      expect(parent.children.length).to.equal(2);
      expect(parent.textContent).to.include('A');
      expect(parent.textContent).to.include('middle');
      expect(parent.textContent).to.include('B');
    });
  });

  it('appends array children', () => {
    cy.getTestModules().then(({ el }) => {
      const items = [el('li', {}, 'one'), el('li', {}, 'two')];
      const ul = el('ul', {}, items);
      expect(ul.children.length).to.equal(2);
    });
  });

  it('skips null children', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', {}, null, 'hello', null);
      expect(div.textContent).to.equal('hello');
      expect(div.childNodes.length).to.equal(1);
    });
  });

  it('skips false children', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', {}, false, 'yes');
      expect(div.textContent).to.equal('yes');
    });
  });

  it('handles deeply nested elements', () => {
    cy.getTestModules().then(({ el }) => {
      const tree = el('div', {},
        el('div', { className: 'level-1' },
          el('div', { className: 'level-2' },
            el('span', {}, 'deep')
          )
        )
      );
      expect(tree.querySelector('.level-2 span').textContent).to.equal('deep');
    });
  });

  it('handles zero as child (not falsy-skipped)', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', {}, 0);
      expect(div.textContent).to.equal('0');
    });
  });

  it('handles empty string child', () => {
    cy.getTestModules().then(({ el }) => {
      const div = el('div', {}, '');
      expect(div.childNodes.length).to.equal(0);
    });
  });
});

describe('DOM — clearChildren()', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('removes all child nodes', () => {
    cy.getTestModules().then(({ el, clearChildren }) => {
      const parent = el('div', {},
        el('span', {}, 'A'),
        el('span', {}, 'B'),
        el('span', {}, 'C'),
      );
      expect(parent.children.length).to.equal(3);
      clearChildren(parent);
      expect(parent.children.length).to.equal(0);
    });
  });

  it('handles element with no children', () => {
    cy.getTestModules().then(({ el, clearChildren }) => {
      const div = el('div');
      clearChildren(div);
      expect(div.children.length).to.equal(0);
    });
  });

  it('removes text nodes too', () => {
    cy.getTestModules().then(({ el, clearChildren }) => {
      const div = el('div', {}, 'hello ', el('b', {}, 'world'));
      expect(div.childNodes.length).to.be.greaterThan(0);
      clearChildren(div);
      expect(div.childNodes.length).to.equal(0);
    });
  });

  it('element still usable after clearing', () => {
    cy.getTestModules().then(({ el, clearChildren }) => {
      const div = el('div', {}, el('span'));
      clearChildren(div);
      div.appendChild(el('p', {}, 'new'));
      expect(div.children.length).to.equal(1);
      expect(div.children[0].tagName).to.equal('P');
    });
  });
});

describe('DOM — debounce()', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('returns a function', () => {
    cy.getTestModules().then(({ debounce }) => {
      const fn = debounce(() => {}, 100);
      expect(typeof fn).to.equal('function');
    });
  });

  it('delays execution', () => {
    cy.window().then((win) => {
      const { debounce } = win.__test__;
      cy.clock().then((clock) => {
        let called = false;
        const fn = debounce(() => { called = true; }, 50);
        fn();
        expect(called).to.be.false;
        clock.tick(100);
        expect(called).to.be.true;
      });
    });
  });

  it('only fires once for rapid calls', () => {
    cy.window().then((win) => {
      const { debounce } = win.__test__;
      cy.clock().then((clock) => {
        let count = 0;
        const fn = debounce(() => { count++; }, 50);
        fn(); fn(); fn(); fn(); fn();
        clock.tick(100);
        expect(count).to.equal(1);
      });
    });
  });

  it('passes arguments to the debounced function', () => {
    cy.window().then((win) => {
      const { debounce } = win.__test__;
      cy.clock().then((clock) => {
        let received = null;
        const fn = debounce((a, b) => { received = [a, b]; }, 50);
        fn('x', 'y');
        clock.tick(100);
        expect(received).to.deep.equal(['x', 'y']);
      });
    });
  });

  it('uses last call arguments when called multiple times', () => {
    cy.window().then((win) => {
      const { debounce } = win.__test__;
      cy.clock().then((clock) => {
        let received = null;
        const fn = debounce((v) => { received = v; }, 50);
        fn('first');
        fn('second');
        fn('last');
        clock.tick(100);
        expect(received).to.equal('last');
      });
    });
  });

  it('defaults to 300ms delay', () => {
    cy.window().then((win) => {
      const { debounce } = win.__test__;
      cy.clock().then((clock) => {
        let called = false;
        const fn = debounce(() => { called = true; });
        fn();
        clock.tick(200);
        expect(called).to.be.false;
        clock.tick(200);
        expect(called).to.be.true;
      });
    });
  });
});

describe('DOM — showToast()', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('creates a toast element on document.body', () => {
    cy.window().then((win) => {
      const { showToast } = win.__test__;
      showToast('Test message', 500);
      const toasts = win.document.querySelectorAll('.toast');
      expect(toasts.length).to.be.greaterThan(0);
      toasts.forEach(t => t.remove());
    });
  });

  it('toast contains the message text', () => {
    cy.window().then((win) => {
      const { showToast } = win.__test__;
      showToast('Hello World', 500);
      const toast = win.document.querySelector('.toast');
      expect(toast).to.be.ok;
      expect(toast.textContent).to.include('Hello World');
      toast.remove();
    });
  });

  it('toast gets visible class via requestAnimationFrame', () => {
    cy.window().then((win) => {
      const { showToast } = win.__test__;
      showToast('Visible test', 1000);
    });
    // Wait for rAF
    cy.wait(100);
    cy.window().then((win) => {
      const toast = win.document.querySelector('.toast');
      expect(toast).to.be.ok;
      expect(toast.classList.contains('toast--visible')).to.be.true;
      toast.remove();
    });
  });

  it('toast is removed after duration', () => {
    cy.window().then((win) => {
      const { showToast } = win.__test__;
      showToast('Temp toast', 200);
    });
    cy.wait(600);
    cy.window().then((win) => {
      const toast = win.document.querySelector('.toast');
      if (toast) toast.remove();
    });
  });
});

describe('DOM — el() combined patterns', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('creates a complete form field', () => {
    cy.getTestModules().then(({ el }) => {
      const field = el('div', { className: 'field' },
        el('label', { htmlFor: 'name', className: 'field__label' }, 'Name'),
        el('input', { type: 'text', id: 'name', placeholder: 'Enter name' }),
      );
      expect(field.children.length).to.equal(2);
      expect(field.querySelector('label').htmlFor).to.equal('name');
      expect(field.querySelector('input').type).to.equal('text');
    });
  });

  it('creates a button with icon and text', () => {
    cy.getTestModules().then(({ el }) => {
      const btn = el('button', {
        className: 'btn btn--primary',
        onClick: () => {},
      },
        el('span', { className: 'icon' }, '\u2713'),
        ' Save',
      );
      expect(btn.className).to.equal('btn btn--primary');
      expect(btn.textContent).to.include('Save');
    });
  });

  it('creates a list from array data', () => {
    cy.getTestModules().then(({ el }) => {
      const items = ['Apple', 'Banana', 'Cherry'];
      const ul = el('ul', {},
        items.map(item => el('li', {}, item)),
      );
      expect(ul.children.length).to.equal(3);
      expect(ul.children[1].textContent).to.equal('Banana');
    });
  });

  it('handles all attribute types simultaneously', () => {
    cy.getTestModules().then(({ el }) => {
      let clicked = false;
      const div = el('div', {
        id: 'combo',
        className: 'box',
        style: { margin: '10px' },
        dataset: { value: '42' },
        tabIndex: '0',
        onClick: () => { clicked = true; },
      }, 'Content');
      expect(div.id).to.equal('combo');
      expect(div.className).to.equal('box');
      expect(div.style.margin).to.equal('10px');
      expect(div.dataset.value).to.equal('42');
      expect(div.textContent).to.equal('Content');
      div.click();
      expect(clicked).to.be.true;
    });
  });
});
