// ─── Validator Tests (Cypress) ────────────────────────────────────────────

function makeState(overrides = {}) {
  return {
    taskName: 'validTask',
    requiredVariables: [],
    computedVariables: [],
    items: [],
    ...overrides,
  };
}

describe('Validator — task name', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('errors on empty task name', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({ taskName: '' }));
      const nameErr = errors.find(e => e.message.toLowerCase().includes('task name'));
      expect(!!nameErr, 'Should have task name error').to.be.true;
      expect(nameErr.severity).to.equal('error');
    });
  });

  it('errors on whitespace-only task name', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({ taskName: '   ' }));
      const nameErr = errors.find(e => e.message.toLowerCase().includes('task name'));
      expect(!!nameErr).to.be.true;
    });
  });

  it('errors on task name starting with digit', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({ taskName: '123task' }));
      const nameErr = errors.find(e => e.severity === 'error' && e.message.toLowerCase().includes('task name'));
      expect(!!nameErr, 'Should reject names starting with digit').to.be.true;
    });
  });

  it('errors on task name with spaces', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({ taskName: 'has spaces' }));
      const nameErr = errors.find(e => e.severity === 'error' && e.message.toLowerCase().includes('task name'));
      expect(!!nameErr, 'Should reject spaces in task name').to.be.true;
    });
  });

  it('errors on task name with special chars', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({ taskName: 'my@task!' }));
      const nameErr = errors.find(e => e.severity === 'error' && e.message.toLowerCase().includes('task name'));
      expect(!!nameErr).to.be.true;
    });
  });

  it('accepts valid camelCase task name', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({ taskName: 'myValidTask' }));
      const nameErr = errors.find(e => e.message.toLowerCase().includes('task name') && e.severity === 'error');
      expect(!!nameErr, 'Should accept valid task name').to.be.false;
    });
  });

  it('accepts task name with hyphens and underscores', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({ taskName: 'my-task_v2' }));
      const nameErr = errors.find(e => e.message.toLowerCase().includes('task name') && e.severity === 'error');
      expect(!!nameErr).to.be.false;
    });
  });

  it('accepts single character task name', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({ taskName: 'a' }));
      const nameErr = errors.find(e => e.message.toLowerCase().includes('task name') && e.severity === 'error');
      expect(!!nameErr).to.be.false;
    });
  });
});

describe('Validator — required variables', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('errors on empty variable name', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: '' }],
      }));
      const varErr = errors.find(e => e.itemId === 'rv1' && e.severity === 'error');
      expect(!!varErr, 'Should flag empty variable name').to.be.true;
    });
  });

  it('errors on whitespace-only name', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: '   ' }],
      }));
      const varErr = errors.find(e => e.itemId === 'rv1' && e.severity === 'error');
      expect(!!varErr).to.be.true;
    });
  });

  it('errors on invalid variable name starting with digit', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: '123invalid' }],
      }));
      const varErr = errors.find(e => e.itemId === 'rv1' && e.severity === 'error');
      expect(!!varErr, 'Should reject names starting with digit').to.be.true;
    });
  });

  it('errors on variable name with spaces', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'has space' }],
      }));
      const varErr = errors.find(e => e.itemId === 'rv1' && e.severity === 'error');
      expect(!!varErr).to.be.true;
    });
  });

  it('errors on variable name with special chars', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'my-var' }],
      }));
      const varErr = errors.find(e => e.itemId === 'rv1' && e.severity === 'error');
      expect(!!varErr, 'Hyphens not allowed in identifiers').to.be.true;
    });
  });

  it('accepts valid variable name', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'validName' }],
      }));
      const varErr = errors.find(e => e.itemId === 'rv1' && e.severity === 'error');
      expect(!!varErr).to.be.false;
    });
  });

  it('accepts underscored variable name', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: '_private' }],
      }));
      const varErr = errors.find(e => e.itemId === 'rv1' && e.severity === 'error' && e.message.includes('identifier'));
      expect(!!varErr).to.be.false;
    });
  });

  it('accepts names starting with underscore', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: '__foo' }],
      }));
      const varErr = errors.find(e => e.itemId === 'rv1' && e.severity === 'error' && e.message.includes('identifier'));
      expect(!!varErr).to.be.false;
    });
  });
});

describe('Validator — computed variables', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('warns on empty expression', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        computedVariables: [{ id: 'cv1', name: 'myVar', expression: '' }],
      }));
      const err = errors.find(e => e.itemId === 'cv1' && e.severity === 'warning');
      expect(!!err, 'Should flag empty expression as warning').to.be.true;
    });
  });

  it('warns on whitespace-only expression', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        computedVariables: [{ id: 'cv1', name: 'myVar', expression: '   ' }],
      }));
      const err = errors.find(e => e.itemId === 'cv1' && e.message.includes('no expression'));
      expect(!!err).to.be.true;
    });
  });

  it('errors on empty computed variable name', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        computedVariables: [{ id: 'cv1', name: '', expression: 'x' }],
      }));
      const err = errors.find(e => e.itemId === 'cv1' && e.severity === 'error');
      expect(!!err).to.be.true;
    });
  });

  it('errors on invalid computed variable name', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        computedVariables: [{ id: 'cv1', name: '123bad', expression: 'x' }],
      }));
      const err = errors.find(e => e.itemId === 'cv1' && e.severity === 'error' && e.message.includes('identifier'));
      expect(!!err).to.be.true;
    });
  });

  it('errors on undefined variable reference in expression', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        computedVariables: [{ id: 'cv1', name: 'cv', expression: '${nonexistent}/path' }],
      }));
      const err = errors.find(e => e.itemId === 'cv1' && e.field === 'expression' && e.severity === 'error');
      expect(!!err, 'Should flag undefined ref').to.be.true;
      expect(err.message).to.include('nonexistent');
    });
  });

  it('accepts expression referencing defined variables', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'base' }],
        computedVariables: [{ id: 'cv1', name: 'dir', expression: '${base}/path' }],
      }));
      const err = errors.find(e => e.itemId === 'cv1' && e.field === 'expression' && e.message.includes('Undefined'));
      expect(!!err).to.be.false;
    });
  });

  it('accepts expression referencing default variables', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        computedVariables: [{ id: 'cv1', name: 'tpl', expression: '${templatesDir}/my-module' }],
      }));
      const err = errors.find(e => e.itemId === 'cv1' && e.field === 'expression' && e.message.includes('Undefined'));
      expect(!!err).to.be.false;
    });
  });

  it('errors on self-referencing computed variable', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        computedVariables: [{ id: 'cv1', name: 'loop', expression: '${loop}/sub' }],
      }));
      const err = errors.find(e => e.itemId === 'cv1' && e.message.includes('references itself'));
      expect(!!err).to.be.true;
      expect(err.severity).to.equal('error');
    });
  });
});

describe('Validator — duplicate variables', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('errors on duplicate required variable names', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [
          { id: 'rv1', name: 'dupName' },
          { id: 'rv2', name: 'dupName' },
        ],
      }));
      const dupErr = errors.find(e => e.message.toLowerCase().includes('duplicate'));
      expect(!!dupErr, 'Should detect duplicate variable names').to.be.true;
      expect(dupErr.severity).to.equal('error');
    });
  });

  it('errors on duplicate across required and computed', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'shared' }],
        computedVariables: [{ id: 'cv1', name: 'shared', expression: 'x' }],
      }));
      const dupErr = errors.find(e => e.message.toLowerCase().includes('duplicate'));
      expect(!!dupErr).to.be.true;
    });
  });

  it('errors on duplicate computed variable names', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        computedVariables: [
          { id: 'cv1', name: 'same', expression: 'a' },
          { id: 'cv2', name: 'same', expression: 'b' },
        ],
      }));
      const dupErr = errors.find(e => e.message.includes('Duplicate'));
      expect(!!dupErr).to.be.true;
    });
  });

  it('no duplicate error for different names', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'a' }, { id: 'rv2', name: 'b' }],
      }));
      const dupErr = errors.find(e => e.message.includes('Duplicate'));
      expect(!!dupErr).to.be.false;
    });
  });
});

describe('Validator — default variable shadowing', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('warns when required variable shadows a default', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'templatesDir' }],
      }));
      const shadow = errors.find(e => e.message.includes('shadows'));
      expect(!!shadow).to.be.true;
      expect(shadow.severity).to.equal('warning');
    });
  });

  it('warns when computed variable shadows a default', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        computedVariables: [{ id: 'cv1', name: 'tasksDir', expression: 'custom/path' }],
      }));
      const shadow = errors.find(e => e.message.includes('shadows'));
      expect(!!shadow).to.be.true;
    });
  });

  it('no shadow warning for non-default names', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'myCustomVar' }],
      }));
      const shadow = errors.find(e => e.message.includes('shadows'));
      expect(!!shadow).to.be.false;
    });
  });
});

describe('Validator — instruction fields', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('errors on instruction with empty required field', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'CreateFile', args: { path: '' } }],
      }));
      const fieldErr = errors.find(e => e.itemId === 'i1' && e.severity === 'error');
      expect(!!fieldErr, 'Should flag empty required field').to.be.true;
    });
  });

  it('errors on whitespace-only field', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'CreateFile', args: { path: '   ' } }],
      }));
      const fieldErr = errors.find(e => e.itemId === 'i1' && e.severity === 'error');
      expect(!!fieldErr).to.be.true;
    });
  });

  it('errors on missing args key', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'CreateFile', args: {} }],
      }));
      const fieldErr = errors.find(e => e.itemId === 'i1' && e.field === 'path' && e.severity === 'error');
      expect(!!fieldErr).to.be.true;
    });
  });

  it('passes on instruction with all fields filled', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'CreateFile', args: { path: 'some/file.txt' } }],
      }));
      const fieldErr = errors.find(e => e.itemId === 'i1' && e.field === 'path' && e.severity === 'error');
      expect(!!fieldErr, 'Should not flag filled field').to.be.false;
    });
  });

  it('errors on ReplaceFile with empty targetPath', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'ReplaceFile', args: { targetPath: '', templatePath: 'b.tpl' } }],
      }));
      const err = errors.find(e => e.itemId === 'i1' && e.field === 'targetPath');
      expect(!!err).to.be.true;
    });
  });

  it('errors on ReplaceFile with empty templatePath', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'ReplaceFile', args: { targetPath: 'a', templatePath: '' } }],
      }));
      const err = errors.find(e => e.itemId === 'i1' && e.field === 'templatePath');
      expect(!!err).to.be.true;
    });
  });

  it('validates InsertAtAnchorInline — all 3 fields', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'InsertAtAnchorInline', args: { targetPath: '', inlineContent: '', anchor: '' } }],
      }));
      const fieldErrs = errors.filter(e => e.itemId === 'i1' && e.severity === 'error');
      expect(fieldErrs).to.have.length(3);
    });
  });

  it('errors on unknown instruction type', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'NonExistent', args: {} }],
      }));
      const err = errors.find(e => e.itemId === 'i1' && e.message.includes('Unknown'));
      expect(!!err).to.be.true;
      expect(err.severity).to.equal('error');
    });
  });
});

describe('Validator — undefined variable refs in instructions', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('warns on undefined ${ref} in instruction field', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'CreateFile', args: { path: '${noSuchVar}/file' } }],
      }));
      const warn = errors.find(e => e.itemId === 'i1' && e.severity === 'warning' && e.message.includes('Undefined'));
      expect(!!warn).to.be.true;
    });
  });

  it('no warning for defined variable ref', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'myDir' }],
        items: [{ id: 'i1', type: 'CreateFile', args: { path: '${myDir}/file' } }],
      }));
      const warn = errors.find(e => e.itemId === 'i1' && e.message.includes('Undefined'));
      expect(!!warn).to.be.false;
    });
  });

  it('no warning for default variable ref (templatesDir)', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'CreateFile', args: { path: '${templatesDir}/file' } }],
      }));
      const warn = errors.find(e => e.itemId === 'i1' && e.message.includes('Undefined') && e.message.includes('templatesDir'));
      expect(!!warn).to.be.false;
    });
  });
});

describe('Validator — template path hints', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('warns when template path does not end in .tpl/.template/.ftl', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'ReplaceFile', args: { targetPath: 'a.txt', templatePath: 'plain.txt' } }],
      }));
      const warn = errors.find(e => e.itemId === 'i1' && e.field === 'templatePath' && e.message.includes('.tpl'));
      expect(!!warn).to.be.true;
      expect(warn.severity).to.equal('warning');
    });
  });

  it('no warning when template ends in .tpl', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'ReplaceFile', args: { targetPath: 'a.txt', templatePath: 'build.tpl' } }],
      }));
      const warn = errors.find(e => e.itemId === 'i1' && e.field === 'templatePath' && e.message.includes('.tpl'));
      expect(!!warn).to.be.false;
    });
  });

  it('no warning when template ends in .template', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'ReplaceFile', args: { targetPath: 'a', templatePath: 'my.template' } }],
      }));
      const warn = errors.find(e => e.field === 'templatePath' && e.message.includes('.tpl'));
      expect(!!warn).to.be.false;
    });
  });

  it('no warning when template ends in .ftl', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'ReplaceFile', args: { targetPath: 'a', templatePath: 'my.ftl' } }],
      }));
      const warn = errors.find(e => e.field === 'templatePath' && e.message.includes('.tpl'));
      expect(!!warn).to.be.false;
    });
  });
});

describe('Validator — anchor format hints', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('warns on anchor without recognized patterns', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'InsertAtAnchor', args: { targetPath: 'f', templatePath: 't.tpl', anchor: 'plain text' } }],
      }));
      const warn = errors.find(e => e.field === 'anchor' && e.message.includes('format'));
      expect(!!warn).to.be.true;
      expect(warn.severity).to.equal('warning');
    });
  });

  it('no warning for anchor with scaffold-anchor', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'InsertAtAnchor', args: { targetPath: 'f', templatePath: 't.tpl', anchor: '/* <scaffold-anchor-x> */' } }],
      }));
      const warn = errors.find(e => e.field === 'anchor' && e.message.includes('format'));
      expect(!!warn).to.be.false;
    });
  });

  it('no warning for anchor with <', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'InsertAtAnchor', args: { targetPath: 'f', templatePath: 't.tpl', anchor: '<anchor-tag>' } }],
      }));
      const warn = errors.find(e => e.field === 'anchor' && e.message.includes('format'));
      expect(!!warn).to.be.false;
    });
  });

  it('no warning for anchor with /*', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'InsertAtAnchor', args: { targetPath: 'f', templatePath: 't.tpl', anchor: '/* marker */' } }],
      }));
      const warn = errors.find(e => e.field === 'anchor' && e.message.includes('format'));
      expect(!!warn).to.be.false;
    });
  });
});

describe('Validator — __RAW__ items', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('warns on raw unrecognized lines', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'r1', type: '__RAW__', text: 'garbage' }],
      }));
      const rawWarn = errors.find(e => e.itemId === 'r1' && e.severity === 'warning');
      expect(!!rawWarn, 'Should warn on raw items').to.be.true;
    });
  });

  it('warning includes first 60 chars of text', () => {
    cy.getTestModules().then(({ validate }) => {
      const longText = 'a'.repeat(80);
      const errors = validate(makeState({
        items: [{ id: 'r1', type: '__RAW__', text: longText }],
      }));
      const warn = errors.find(e => e.itemId === 'r1');
      expect(warn.message).to.include('…');
    });
  });
});

describe('Validator — unused variable warnings', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('warns on unused required variable', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'unusedVar' }],
        items: [{ id: 'i1', type: 'CreateFile', args: { path: 'file.txt' } }],
      }));
      const warn = errors.find(e => e.itemId === 'rv1' && e.message.includes('never used'));
      expect(!!warn).to.be.true;
      expect(warn.severity).to.equal('warning');
    });
  });

  it('no warning when variable is used in instruction', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'mod' }],
        items: [{ id: 'i1', type: 'CreateFile', args: { path: '${mod}/file' } }],
      }));
      const warn = errors.find(e => e.itemId === 'rv1' && e.message.includes('never used'));
      expect(!!warn).to.be.false;
    });
  });

  it('no warning when variable is used in computed expression', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'base' }],
        computedVariables: [{ id: 'cv1', name: 'dir', expression: '${base}/sub' }],
        items: [{ id: 'i1', type: 'CreateFile', args: { path: '${dir}/f' } }],
      }));
      const warn = errors.find(e => e.itemId === 'rv1' && e.message.includes('never used'));
      expect(!!warn).to.be.false;
    });
  });
});

describe('Validator — CreateFile without ReplaceFile', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('warns when CreateFile has no subsequent ReplaceFile', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'CreateFile', args: { path: 'file.txt' } }],
      }));
      const warn = errors.find(e => e.itemId === 'i1' && e.message.includes('ReplaceFile'));
      expect(!!warn).to.be.true;
      expect(warn.severity).to.equal('warning');
    });
  });

  it('no warning when CreateFile is followed by matching ReplaceFile', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [
          { id: 'i1', type: 'CreateFile', args: { path: 'file.txt' } },
          { id: 'i2', type: 'ReplaceFile', args: { targetPath: 'file.txt', templatePath: 't.tpl' } },
        ],
      }));
      const warn = errors.find(e => e.itemId === 'i1' && e.message.includes('ReplaceFile'));
      expect(!!warn).to.be.false;
    });
  });

  it('warns when ReplaceFile target does not match CreateFile path', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [
          { id: 'i1', type: 'CreateFile', args: { path: 'file.txt' } },
          { id: 'i2', type: 'ReplaceFile', args: { targetPath: 'other.txt', templatePath: 't.tpl' } },
        ],
      }));
      const warn = errors.find(e => e.itemId === 'i1' && e.message.includes('ReplaceFile'));
      expect(!!warn).to.be.true;
    });
  });
});

describe('Validator — duplicate instructions', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('warns on identical instructions', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [
          { id: 'i1', type: 'CreateFile', args: { path: 'same.txt' } },
          { id: 'i2', type: 'CreateFile', args: { path: 'same.txt' } },
        ],
      }));
      const warn = errors.find(e => e.message.includes('Duplicate instruction'));
      expect(!!warn).to.be.true;
    });
  });

  it('no warning for different instructions', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [
          { id: 'i1', type: 'CreateFile', args: { path: 'a.txt' } },
          { id: 'i2', type: 'CreateFile', args: { path: 'b.txt' } },
        ],
      }));
      const warn = errors.find(e => e.message.includes('Duplicate instruction'));
      expect(!!warn).to.be.false;
    });
  });
});

describe('Validator — pipeline-level warnings', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('warns when task has no instructions at all', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({ items: [] }));
      const warn = errors.find(e => e.message.includes('no instructions'));
      expect(!!warn).to.be.true;
      expect(warn.severity).to.equal('warning');
    });
  });

  it('suggests sections for long pipelines (>8 instructions, 0 sections)', () => {
    cy.getTestModules().then(({ validate }) => {
      const items = Array.from({ length: 9 }, (_, i) => ({
        id: `i${i}`, type: 'CreateFile', args: { path: `file${i}.txt` },
      }));
      const errors = validate(makeState({ items }));
      const warn = errors.find(e => e.message.toLowerCase().includes('section'));
      expect(!!warn).to.be.true;
    });
  });

  it('no section suggestion when pipeline has sections', () => {
    cy.getTestModules().then(({ validate }) => {
      const items = [
        { id: 's1', type: '__SECTION__', title: 'Group' },
        ...Array.from({ length: 9 }, (_, i) => ({
          id: `i${i}`, type: 'CreateFile', args: { path: `file${i}.txt` },
        })),
      ];
      const errors = validate(makeState({ items }));
      const warn = errors.find(e => e.message.toLowerCase().includes('section divider'));
      expect(!!warn).to.be.false;
    });
  });

  it('no section suggestion for short pipelines', () => {
    cy.getTestModules().then(({ validate }) => {
      const items = Array.from({ length: 3 }, (_, i) => ({
        id: `i${i}`, type: 'CreateFile', args: { path: `file${i}.txt` },
      }));
      const errors = validate(makeState({ items }));
      const warn = errors.find(e => e.message.toLowerCase().includes('section'));
      expect(!!warn).to.be.false;
    });
  });
});

describe('Validator — clean state', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('returns no errors for a minimal valid state', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'CreateFile', args: { path: 'file.txt' } }],
      }));
      const realErrors = errors.filter(e => e.severity === 'error');
      expect(realErrors, 'Minimal valid state should have no errors').to.have.length(0);
    });
  });

  it('returns no errors for a complete valid state', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'mod' }],
        computedVariables: [{ id: 'cv1', name: 'dir', expression: '${mod}/src' }],
        items: [
          { id: 's1', type: '__SECTION__', title: 'Files' },
          { id: 'i1', type: 'CreateFile', args: { path: '${dir}/build.gradle' } },
          { id: 'i2', type: 'ReplaceFile', args: { targetPath: '${dir}/build.gradle', templatePath: '${templatesDir}/build.tpl' } },
        ],
      }));
      const realErrors = errors.filter(e => e.severity === 'error');
      expect(realErrors, `Should have no errors, got: ${realErrors.map(e => e.message).join('; ')}`).to.have.length(0);
    });
  });

  it('returns multiple error types for a messy state', () => {
    cy.getTestModules().then(({ validate }) => {
      const errors = validate(makeState({
        taskName: '',
        requiredVariables: [{ id: 'rv1', name: '' }],
        computedVariables: [{ id: 'cv1', name: '', expression: '' }],
        items: [{ id: 'i1', type: 'CreateFile', args: { path: '' } }],
      }));
      const realErrors = errors.filter(e => e.severity === 'error');
      expect(realErrors.length, 'Should have multiple errors').to.be.greaterThan(2);
    });
  });
});
