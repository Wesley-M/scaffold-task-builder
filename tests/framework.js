// ─── Minimal Browser Test Framework ──────────────────────────────
// Zero dependencies. Run via test.html.

let _suiteCount = 0;
let _passCount = 0;
let _failCount = 0;
let _currentSuite = '';
const _results = [];
const _asyncQueue = [];

export function describe(name, fn) {
  _currentSuite = name;
  _suiteCount++;
  const suiteResult = { name, tests: [] };
  _results.push(suiteResult);
  try {
    fn();
  } catch (e) {
    suiteResult.tests.push({ name: '(suite error)', pass: false, error: e.message });
    _failCount++;
  }
}

export function it(name, fn) {
  const suite = _results[_results.length - 1];

  // Async test: fn accepts a `done` callback (fn.length > 0)
  if (fn.length > 0) {
    const placeholder = { name, pass: null, error: null };
    suite.tests.push(placeholder);
    const p = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        placeholder.pass = false;
        placeholder.error = 'Async test timed out (5s)';
        _failCount++;
        resolve();
      }, 5000);
      try {
        fn(() => {
          clearTimeout(timeout);
          if (placeholder.pass !== null) return; // already resolved
          placeholder.pass = true;
          _passCount++;
          resolve();
        });
      } catch (e) {
        clearTimeout(timeout);
        placeholder.pass = false;
        placeholder.error = e.message;
        _failCount++;
        resolve();
      }
    });
    _asyncQueue.push(p);
    return;
  }

  // Sync test
  try {
    fn();
    _passCount++;
    suite.tests.push({ name, pass: true });
  } catch (e) {
    _failCount++;
    suite.tests.push({ name, pass: false, error: e.message });
  }
}

/** Wait for all async tests to complete. */
export async function waitForAsync() {
  if (_asyncQueue.length > 0) {
    await Promise.all(_asyncQueue);
  }
}

// ── Assertions ──

export function assert(condition, message = 'Assertion failed') {
  if (!condition) throw new Error(message);
}

assert.equal = function (actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

assert.deepEqual = function (actual, expected, msg) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(msg || `Deep equal failed.\nExpected: ${b}\nActual:   ${a}`);
  }
};

assert.includes = function (haystack, needle, msg) {
  if (typeof haystack === 'string') {
    if (!haystack.includes(needle)) {
      throw new Error(msg || `Expected string to include ${JSON.stringify(needle)}`);
    }
  } else if (Array.isArray(haystack)) {
    if (!haystack.includes(needle)) {
      throw new Error(msg || `Expected array to include ${JSON.stringify(needle)}`);
    }
  } else {
    throw new Error('assert.includes requires string or array');
  }
};

assert.truthy = function (val, msg) {
  if (!val) throw new Error(msg || `Expected truthy, got ${JSON.stringify(val)}`);
};

assert.falsy = function (val, msg) {
  if (val) throw new Error(msg || `Expected falsy, got ${JSON.stringify(val)}`);
};

assert.throws = function (fn, msg) {
  let threw = false;
  try { fn(); } catch (e) { threw = true; }
  if (!threw) throw new Error(msg || 'Expected function to throw');
};

assert.lengthOf = function (arr, len, msg) {
  if (arr.length !== len) {
    throw new Error(msg || `Expected length ${len}, got ${arr.length}`);
  }
};

assert.greaterThan = function (a, b, msg) {
  if (!(a > b)) throw new Error(msg || `Expected ${a} > ${b}`);
};

assert.match = function (str, regex, msg) {
  if (!regex.test(str)) {
    throw new Error(msg || `Expected ${JSON.stringify(str)} to match ${regex}`);
  }
};

// ── Reporting ──

export function getResults() {
  return { suites: _suiteCount, passed: _passCount, failed: _failCount, results: _results };
}

export function renderResults(container) {
  const { suites, passed, failed, results } = getResults();

  const summary = document.createElement('div');
  summary.className = `test-summary ${failed > 0 ? 'test-summary--fail' : 'test-summary--pass'}`;
  summary.textContent = `${passed + failed} tests in ${suites} suites — ${passed} passed, ${failed} failed`;
  container.appendChild(summary);

  for (const suite of results) {
    const suiteEl = document.createElement('div');
    suiteEl.className = 'test-suite';

    const header = document.createElement('h3');
    header.className = 'test-suite__header';
    const allPassed = suite.tests.every(t => t.pass);
    header.textContent = `${allPassed ? '✓' : '✗'} ${suite.name}`;
    header.style.color = allPassed ? 'var(--pass)' : 'var(--fail)';
    suiteEl.appendChild(header);

    for (const test of suite.tests) {
      const testEl = document.createElement('div');
      testEl.className = `test-case ${test.pass ? 'test-case--pass' : 'test-case--fail'}`;
      testEl.textContent = `${test.pass ? '  ✓' : '  ✗'} ${test.name}`;
      if (!test.pass) {
        const errEl = document.createElement('pre');
        errEl.className = 'test-error';
        errEl.textContent = `    ${test.error}`;
        testEl.appendChild(errEl);
      }
      suiteEl.appendChild(testEl);
    }

    container.appendChild(suiteEl);
  }
}
