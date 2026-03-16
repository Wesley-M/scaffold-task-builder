// ─── Resolver Tests (Cypress) ────────────────────────────────────────────

describe('Resolver — extractVariableRefs basics', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('extracts single variable reference', () => {
    cy.getTestModules().then(({ extractVariableRefs }) => {
      const refs = extractVariableRefs('${myVar}');
      expect(refs).to.deep.equal(['myVar']);
    });
  });

  it('extracts multiple variable references', () => {
    cy.getTestModules().then(({ extractVariableRefs }) => {
      const refs = extractVariableRefs('${a}/path/${b}/file');
      expect(refs).to.have.length(2);
      expect(refs).to.include('a');
      expect(refs).to.include('b');
    });
  });

  it('returns empty array for no variables', () => {
    cy.getTestModules().then(({ extractVariableRefs }) => {
      const refs = extractVariableRefs('plain text');
      expect(refs).to.have.length(0);
    });
  });

  it('returns empty array for empty string', () => {
    cy.getTestModules().then(({ extractVariableRefs }) => {
      const refs = extractVariableRefs('');
      expect(refs).to.have.length(0);
    });
  });

  it('returns empty array for null/undefined', () => {
    cy.getTestModules().then(({ extractVariableRefs }) => {
      expect(extractVariableRefs(null)).to.have.length(0);
      expect(extractVariableRefs(undefined)).to.have.length(0);
    });
  });
});

describe('Resolver — extractVariableRefs edge cases', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('handles adjacent references', () => {
    cy.getTestModules().then(({ extractVariableRefs }) => {
      const refs = extractVariableRefs('${outer}${inner}');
      expect(refs).to.have.length(2);
      expect(refs).to.include('outer');
      expect(refs).to.include('inner');
    });
  });

  it('deduplicates repeated references', () => {
    cy.getTestModules().then(({ extractVariableRefs }) => {
      const refs = extractVariableRefs('${x}/${x}/${x}');
      expect(refs).to.have.length(1);
      expect(refs[0]).to.equal('x');
    });
  });

  it('handles complex path with many refs', () => {
    cy.getTestModules().then(({ extractVariableRefs }) => {
      const refs = extractVariableRefs('${a}/${b}/src/${c}/main/${d}.java');
      expect(refs).to.have.length(4);
    });
  });

  it('handles ref names with underscores and digits', () => {
    cy.getTestModules().then(({ extractVariableRefs }) => {
      const refs = extractVariableRefs('${my_var_2}');
      expect(refs).to.deep.equal(['my_var_2']);
    });
  });

  it('does not extract incomplete ${patterns', () => {
    cy.getTestModules().then(({ extractVariableRefs }) => {
      const refs = extractVariableRefs('${open but no close');
      expect(refs).to.have.length(0);
    });
  });

  it('does not extract empty ${}', () => {
    cy.getTestModules().then(({ extractVariableRefs }) => {
      const refs = extractVariableRefs('${}');
      expect(refs).to.have.length(0);
    });
  });
});

describe('Resolver — resolveVariables basics', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('resolves single variable', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { resolved } = resolveVariables('${name}', { name: 'John' });
      expect(resolved).to.equal('John');
    });
  });

  it('resolves multiple variables', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { resolved } = resolveVariables('${a}/${b}', { a: 'src', b: 'main' });
      expect(resolved).to.equal('src/main');
    });
  });

  it('resolves variable used multiple times', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { resolved } = resolveVariables('${x}-${x}', { x: 'hi' });
      expect(resolved).to.equal('hi-hi');
    });
  });

  it('handles no variables in input', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { resolved, unresolved } = resolveVariables('plain', {});
      expect(resolved).to.equal('plain');
      expect(unresolved).to.have.length(0);
    });
  });

  it('handles empty string input', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { resolved } = resolveVariables('', {});
      expect(resolved).to.equal('');
    });
  });

  it('handles null input', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { resolved } = resolveVariables(null, {});
      expect(resolved).to.equal('');
    });
  });

  it('handles undefined input', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { resolved } = resolveVariables(undefined, {});
      expect(resolved).to.equal('');
    });
  });
});

describe('Resolver — unresolved variables', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('reports unresolved variables', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { unresolved } = resolveVariables('${missing}', {});
      expect(unresolved).to.have.length(1);
      expect(unresolved).to.include('missing');
    });
  });

  it('keeps unresolved placeholders in output', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { resolved } = resolveVariables('${known}/${unknown}', { known: 'a' });
      expect(resolved).to.include('a');
      expect(resolved).to.include('${unknown}');
    });
  });

  it('reports multiple unresolved variables', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { unresolved } = resolveVariables('${a}/${b}/${c}', {});
      expect(unresolved).to.have.length(3);
    });
  });

  it('does not report resolved variables as unresolved', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { unresolved } = resolveVariables('${a}/${b}', { a: 'x', b: 'y' });
      expect(unresolved).to.have.length(0);
    });
  });
});

describe('Resolver — chained/recursive resolution', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('resolves chained variables (one level)', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { resolved } = resolveVariables('${tplDir}/file', {
        tplDir: '${base}/templates',
        base: 'scaffold',
      });
      expect(resolved).to.equal('scaffold/templates/file');
    });
  });

  it('resolves deeply chained variables', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { resolved } = resolveVariables('${c}', {
        a: 'root',
        b: '${a}/sub',
        c: '${b}/deep',
      });
      expect(resolved).to.equal('root/sub/deep');
    });
  });

  it('handles circular references gracefully (stops after MAX_PASSES)', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { resolved } = resolveVariables('${a}', {
        a: '${b}',
        b: '${a}',
      });
      expect(typeof resolved === 'string').to.be.true;
    });
  });

  it('resolves partial chains (some resolved, some not)', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { resolved, unresolved } = resolveVariables('${a}/${c}', {
        a: 'resolved',
      });
      expect(resolved).to.include('resolved');
      expect(unresolved).to.include('c');
    });
  });
});

describe('Resolver — escape handling', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('preserves escaped ${...} as literal text', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { resolved } = resolveVariables('\\${notAVar}', { notAVar: 'WRONG' });
      expect(resolved).to.equal('${notAVar}');
    });
  });

  it('resolves non-escaped while preserving escaped', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { resolved } = resolveVariables('${real}+\\${literal}', { real: 'YES' });
      expect(resolved).to.equal('YES+${literal}');
    });
  });

  it('multiple escaped refs stay escaped', () => {
    cy.getTestModules().then(({ resolveVariables }) => {
      const { resolved } = resolveVariables('\\${a}+\\${b}', {});
      expect(resolved).to.equal('${a}+${b}');
    });
  });
});

describe('Resolver — buildVariableMap basics', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('builds map from required variables (placeholder values)', () => {
    cy.getTestModules().then(({ buildVariableMap }) => {
      const map = buildVariableMap({
        requiredVariables: [{ id: '1', name: 'foo' }],
        computedVariables: [],
      });
      expect(map.foo).to.equal('<foo>');
    });
  });

  it('builds map from computed variables (resolved)', () => {
    cy.getTestModules().then(({ buildVariableMap }) => {
      const map = buildVariableMap({
        requiredVariables: [],
        computedVariables: [{ id: '1', name: 'bar', expression: 'value' }],
      });
      expect(map.bar).to.equal('value');
    });
  });

  it('includes default variables', () => {
    cy.getTestModules().then(({ buildVariableMap }) => {
      const defaults = { templatesDir: 'scaffold/templates' };
      const map = buildVariableMap({
        requiredVariables: [],
        computedVariables: [],
      }, defaults);
      expect(map.templatesDir).to.equal('scaffold/templates');
    });
  });
});

describe('Resolver — buildVariableMap ordering', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('computed variable can reference required variable', () => {
    cy.getTestModules().then(({ buildVariableMap }) => {
      const map = buildVariableMap({
        requiredVariables: [{ id: '1', name: 'mod' }],
        computedVariables: [{ id: '2', name: 'dir', expression: '${mod}/src' }],
      });
      expect(map.dir).to.equal('<mod>/src');
    });
  });

  it('computed variable can reference earlier computed variable', () => {
    cy.getTestModules().then(({ buildVariableMap }) => {
      const map = buildVariableMap({
        requiredVariables: [],
        computedVariables: [
          { id: '1', name: 'a', expression: 'base' },
          { id: '2', name: 'b', expression: '${a}/sub' },
        ],
      });
      expect(map.b).to.equal('base/sub');
    });
  });

  it('computed variable can reference defaults', () => {
    cy.getTestModules().then(({ buildVariableMap }) => {
      const defaults = { root: 'scaffold' };
      const map = buildVariableMap({
        requiredVariables: [],
        computedVariables: [{ id: '1', name: 'path', expression: '${root}/stuff' }],
      }, defaults);
      expect(map.path).to.equal('scaffold/stuff');
    });
  });

  it('user variables override defaults', () => {
    cy.getTestModules().then(({ buildVariableMap }) => {
      const defaults = { key: 'default' };
      const map = buildVariableMap({
        requiredVariables: [],
        computedVariables: [{ id: '1', name: 'key', expression: 'custom' }],
      }, defaults);
      expect(map.key).to.equal('custom');
    });
  });

  it('required variables do not override defaults', () => {
    cy.getTestModules().then(({ buildVariableMap }) => {
      const defaults = { key: 'default' };
      const map = buildVariableMap({
        requiredVariables: [{ id: '1', name: 'key' }],
        computedVariables: [],
      }, defaults);
      expect(map.key).to.equal('default');
    });
  });
});

describe('Resolver — buildVariableMap edge cases', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('skips variables with empty names', () => {
    cy.getTestModules().then(({ buildVariableMap }) => {
      const map = buildVariableMap({
        requiredVariables: [{ id: '1', name: '' }],
        computedVariables: [{ id: '2', name: '', expression: 'val' }],
      });
      expect(map['']).to.not.be.ok;
    });
  });

  it('skips computed variables with empty expressions', () => {
    cy.getTestModules().then(({ buildVariableMap }) => {
      const map = buildVariableMap({
        requiredVariables: [],
        computedVariables: [{ id: '1', name: 'empty', expression: '' }],
      });
      expect(map.empty).to.not.be.ok;
    });
  });

  it('handles empty state', () => {
    cy.getTestModules().then(({ buildVariableMap }) => {
      const map = buildVariableMap({
        requiredVariables: [],
        computedVariables: [],
      });
      expect(typeof map === 'object').to.be.true;
    });
  });
});
