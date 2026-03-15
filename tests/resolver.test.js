// ─── Resolver Tests ──────────────────────────────────────────────

import { describe, it, assert } from './framework.js';
import { resolveVariables, extractVariableRefs, buildVariableMap } from '../js/lib/resolver.js';

export default function resolverTests() {

  // ═══════════════════════════════════════════════════════════════
  // extractVariableRefs
  // ═══════════════════════════════════════════════════════════════

  describe('Resolver — extractVariableRefs basics', () => {
    it('extracts single variable reference', () => {
      const refs = extractVariableRefs('${myVar}');
      assert.deepEqual(refs, ['myVar']);
    });

    it('extracts multiple variable references', () => {
      const refs = extractVariableRefs('${a}/path/${b}/file');
      assert.lengthOf(refs, 2);
      assert.includes(refs, 'a');
      assert.includes(refs, 'b');
    });

    it('returns empty array for no variables', () => {
      const refs = extractVariableRefs('plain text');
      assert.lengthOf(refs, 0);
    });

    it('returns empty array for empty string', () => {
      const refs = extractVariableRefs('');
      assert.lengthOf(refs, 0);
    });

    it('returns empty array for null/undefined', () => {
      assert.lengthOf(extractVariableRefs(null), 0);
      assert.lengthOf(extractVariableRefs(undefined), 0);
    });
  });

  describe('Resolver — extractVariableRefs edge cases', () => {
    it('handles adjacent references', () => {
      const refs = extractVariableRefs('${outer}${inner}');
      assert.lengthOf(refs, 2);
      assert.includes(refs, 'outer');
      assert.includes(refs, 'inner');
    });

    it('deduplicates repeated references', () => {
      const refs = extractVariableRefs('${x}/${x}/${x}');
      assert.lengthOf(refs, 1);
      assert.equal(refs[0], 'x');
    });

    it('handles complex path with many refs', () => {
      const refs = extractVariableRefs('${a}/${b}/src/${c}/main/${d}.java');
      assert.lengthOf(refs, 4);
    });

    it('handles ref names with underscores and digits', () => {
      const refs = extractVariableRefs('${my_var_2}');
      assert.deepEqual(refs, ['my_var_2']);
    });

    it('does not extract incomplete ${patterns', () => {
      const refs = extractVariableRefs('${open but no close');
      assert.lengthOf(refs, 0);
    });

    it('does not extract empty ${}', () => {
      const refs = extractVariableRefs('${}');
      assert.lengthOf(refs, 0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // resolveVariables — basic resolution
  // ═══════════════════════════════════════════════════════════════

  describe('Resolver — resolveVariables basics', () => {
    it('resolves single variable', () => {
      const { resolved } = resolveVariables('${name}', { name: 'John' });
      assert.equal(resolved, 'John');
    });

    it('resolves multiple variables', () => {
      const { resolved } = resolveVariables('${a}/${b}', { a: 'src', b: 'main' });
      assert.equal(resolved, 'src/main');
    });

    it('resolves variable used multiple times', () => {
      const { resolved } = resolveVariables('${x}-${x}', { x: 'hi' });
      assert.equal(resolved, 'hi-hi');
    });

    it('handles no variables in input', () => {
      const { resolved, unresolved } = resolveVariables('plain', {});
      assert.equal(resolved, 'plain');
      assert.lengthOf(unresolved, 0);
    });

    it('handles empty string input', () => {
      const { resolved } = resolveVariables('', {});
      assert.equal(resolved, '');
    });

    it('handles null input', () => {
      const { resolved } = resolveVariables(null, {});
      assert.equal(resolved, '');
    });

    it('handles undefined input', () => {
      const { resolved } = resolveVariables(undefined, {});
      assert.equal(resolved, '');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // resolveVariables — unresolved tracking
  // ═══════════════════════════════════════════════════════════════

  describe('Resolver — unresolved variables', () => {
    it('reports unresolved variables', () => {
      const { unresolved } = resolveVariables('${missing}', {});
      assert.lengthOf(unresolved, 1);
      assert.includes(unresolved, 'missing');
    });

    it('keeps unresolved placeholders in output', () => {
      const { resolved } = resolveVariables('${known}/${unknown}', { known: 'a' });
      assert.includes(resolved, 'a');
      assert.includes(resolved, '${unknown}');
    });

    it('reports multiple unresolved variables', () => {
      const { unresolved } = resolveVariables('${a}/${b}/${c}', {});
      assert.lengthOf(unresolved, 3);
    });

    it('does not report resolved variables as unresolved', () => {
      const { unresolved } = resolveVariables('${a}/${b}', { a: 'x', b: 'y' });
      assert.lengthOf(unresolved, 0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // resolveVariables — recursive/chained resolution
  // ═══════════════════════════════════════════════════════════════

  describe('Resolver — chained/recursive resolution', () => {
    it('resolves chained variables (one level)', () => {
      const { resolved } = resolveVariables('${tplDir}/file', {
        tplDir: '${base}/templates',
        base: 'scaffold',
      });
      assert.equal(resolved, 'scaffold/templates/file');
    });

    it('resolves deeply chained variables', () => {
      const { resolved } = resolveVariables('${c}', {
        a: 'root',
        b: '${a}/sub',
        c: '${b}/deep',
      });
      assert.equal(resolved, 'root/sub/deep');
    });

    it('handles circular references gracefully (stops after MAX_PASSES)', () => {
      const { resolved, unresolved } = resolveVariables('${a}', {
        a: '${b}',
        b: '${a}',
      });
      // Should not hang — just stop with unresolved
      assert.truthy(typeof resolved === 'string');
    });

    it('resolves partial chains (some resolved, some not)', () => {
      const { resolved, unresolved } = resolveVariables('${a}/${c}', {
        a: 'resolved',
      });
      assert.includes(resolved, 'resolved');
      assert.includes(unresolved, 'c');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // resolveVariables — escape handling
  // ═══════════════════════════════════════════════════════════════

  describe('Resolver — escape handling', () => {
    it('preserves escaped ${...} as literal text', () => {
      const { resolved } = resolveVariables('\\${notAVar}', { notAVar: 'WRONG' });
      assert.equal(resolved, '${notAVar}');
    });

    it('resolves non-escaped while preserving escaped', () => {
      const { resolved } = resolveVariables('${real}+\\${literal}', { real: 'YES' });
      assert.equal(resolved, 'YES+${literal}');
    });

    it('multiple escaped refs stay escaped', () => {
      const { resolved } = resolveVariables('\\${a}+\\${b}', {});
      assert.equal(resolved, '${a}+${b}');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // buildVariableMap
  // ═══════════════════════════════════════════════════════════════

  describe('Resolver — buildVariableMap basics', () => {
    it('builds map from required variables (placeholder values)', () => {
      const map = buildVariableMap({
        requiredVariables: [{ id: '1', name: 'foo' }],
        computedVariables: [],
      });
      assert.equal(map.foo, '<foo>');
    });

    it('builds map from computed variables (resolved)', () => {
      const map = buildVariableMap({
        requiredVariables: [],
        computedVariables: [{ id: '1', name: 'bar', expression: 'value' }],
      });
      assert.equal(map.bar, 'value');
    });

    it('includes default variables', () => {
      const defaults = { templatesDir: 'scaffold/templates' };
      const map = buildVariableMap({
        requiredVariables: [],
        computedVariables: [],
      }, defaults);
      assert.equal(map.templatesDir, 'scaffold/templates');
    });
  });

  describe('Resolver — buildVariableMap ordering', () => {
    it('computed variable can reference required variable', () => {
      const map = buildVariableMap({
        requiredVariables: [{ id: '1', name: 'mod' }],
        computedVariables: [{ id: '2', name: 'dir', expression: '${mod}/src' }],
      });
      assert.equal(map.dir, '<mod>/src');
    });

    it('computed variable can reference earlier computed variable', () => {
      const map = buildVariableMap({
        requiredVariables: [],
        computedVariables: [
          { id: '1', name: 'a', expression: 'base' },
          { id: '2', name: 'b', expression: '${a}/sub' },
        ],
      });
      assert.equal(map.b, 'base/sub');
    });

    it('computed variable can reference defaults', () => {
      const defaults = { root: 'scaffold' };
      const map = buildVariableMap({
        requiredVariables: [],
        computedVariables: [{ id: '1', name: 'path', expression: '${root}/stuff' }],
      }, defaults);
      assert.equal(map.path, 'scaffold/stuff');
    });

    it('user variables override defaults', () => {
      const defaults = { key: 'default' };
      const map = buildVariableMap({
        requiredVariables: [],
        computedVariables: [{ id: '1', name: 'key', expression: 'custom' }],
      }, defaults);
      assert.equal(map.key, 'custom');
    });

    it('required variables do not override defaults', () => {
      const defaults = { key: 'default' };
      const map = buildVariableMap({
        requiredVariables: [{ id: '1', name: 'key' }],
        computedVariables: [],
      }, defaults);
      assert.equal(map.key, 'default');
    });
  });

  describe('Resolver — buildVariableMap edge cases', () => {
    it('skips variables with empty names', () => {
      const map = buildVariableMap({
        requiredVariables: [{ id: '1', name: '' }],
        computedVariables: [{ id: '2', name: '', expression: 'val' }],
      });
      assert.falsy(map['']);
    });

    it('skips computed variables with empty expressions', () => {
      const map = buildVariableMap({
        requiredVariables: [],
        computedVariables: [{ id: '1', name: 'empty', expression: '' }],
      });
      assert.falsy(map.empty);
    });

    it('handles empty state', () => {
      const map = buildVariableMap({
        requiredVariables: [],
        computedVariables: [],
      });
      assert.truthy(typeof map === 'object');
    });
  });
}
