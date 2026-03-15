// ─── Validator Tests ─────────────────────────────────────────────

import { describe, it, assert } from './framework.js';
import { validate } from '../js/lib/validator.js';

function makeState(overrides = {}) {
  return {
    taskName: 'validTask',
    requiredVariables: [],
    computedVariables: [],
    items: [],
    ...overrides,
  };
}

export default function validatorTests() {

  // ═══════════════════════════════════════════════════════════════
  // TASK NAME VALIDATION
  // ═══════════════════════════════════════════════════════════════

  describe('Validator — task name', () => {
    it('errors on empty task name', () => {
      const errors = validate(makeState({ taskName: '' }));
      const nameErr = errors.find(e => e.message.toLowerCase().includes('task name'));
      assert.truthy(nameErr, 'Should have task name error');
      assert.equal(nameErr.severity, 'error');
    });

    it('errors on whitespace-only task name', () => {
      const errors = validate(makeState({ taskName: '   ' }));
      const nameErr = errors.find(e => e.message.toLowerCase().includes('task name'));
      assert.truthy(nameErr);
    });

    it('errors on task name starting with digit', () => {
      const errors = validate(makeState({ taskName: '123task' }));
      const nameErr = errors.find(e => e.severity === 'error' && e.message.toLowerCase().includes('task name'));
      assert.truthy(nameErr, 'Should reject names starting with digit');
    });

    it('errors on task name with spaces', () => {
      const errors = validate(makeState({ taskName: 'has spaces' }));
      const nameErr = errors.find(e => e.severity === 'error' && e.message.toLowerCase().includes('task name'));
      assert.truthy(nameErr, 'Should reject spaces in task name');
    });

    it('errors on task name with special chars', () => {
      const errors = validate(makeState({ taskName: 'my@task!' }));
      const nameErr = errors.find(e => e.severity === 'error' && e.message.toLowerCase().includes('task name'));
      assert.truthy(nameErr);
    });

    it('accepts valid camelCase task name', () => {
      const errors = validate(makeState({ taskName: 'myValidTask' }));
      const nameErr = errors.find(e => e.message.toLowerCase().includes('task name') && e.severity === 'error');
      assert.falsy(nameErr, 'Should accept valid task name');
    });

    it('accepts task name with hyphens and underscores', () => {
      const errors = validate(makeState({ taskName: 'my-task_v2' }));
      const nameErr = errors.find(e => e.message.toLowerCase().includes('task name') && e.severity === 'error');
      assert.falsy(nameErr);
    });

    it('accepts single character task name', () => {
      const errors = validate(makeState({ taskName: 'a' }));
      const nameErr = errors.find(e => e.message.toLowerCase().includes('task name') && e.severity === 'error');
      assert.falsy(nameErr);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // REQUIRED VARIABLE VALIDATION
  // ═══════════════════════════════════════════════════════════════

  describe('Validator — required variables', () => {
    it('errors on empty variable name', () => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: '' }],
      }));
      const varErr = errors.find(e => e.itemId === 'rv1' && e.severity === 'error');
      assert.truthy(varErr, 'Should flag empty variable name');
    });

    it('errors on whitespace-only name', () => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: '   ' }],
      }));
      const varErr = errors.find(e => e.itemId === 'rv1' && e.severity === 'error');
      assert.truthy(varErr);
    });

    it('errors on invalid variable name starting with digit', () => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: '123invalid' }],
      }));
      const varErr = errors.find(e => e.itemId === 'rv1' && e.severity === 'error');
      assert.truthy(varErr, 'Should reject names starting with digit');
    });

    it('errors on variable name with spaces', () => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'has space' }],
      }));
      const varErr = errors.find(e => e.itemId === 'rv1' && e.severity === 'error');
      assert.truthy(varErr);
    });

    it('errors on variable name with special chars', () => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'my-var' }],
      }));
      const varErr = errors.find(e => e.itemId === 'rv1' && e.severity === 'error');
      assert.truthy(varErr, 'Hyphens not allowed in identifiers');
    });

    it('accepts valid variable name', () => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'validName' }],
      }));
      const varErr = errors.find(e => e.itemId === 'rv1' && e.severity === 'error');
      assert.falsy(varErr);
    });

    it('accepts underscored variable name', () => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: '_private' }],
      }));
      const varErr = errors.find(e => e.itemId === 'rv1' && e.severity === 'error' && e.message.includes('identifier'));
      assert.falsy(varErr);
    });

    it('accepts names starting with underscore', () => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: '__foo' }],
      }));
      const varErr = errors.find(e => e.itemId === 'rv1' && e.severity === 'error' && e.message.includes('identifier'));
      assert.falsy(varErr);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // COMPUTED VARIABLE VALIDATION
  // ═══════════════════════════════════════════════════════════════

  describe('Validator — computed variables', () => {
    it('warns on empty expression', () => {
      const errors = validate(makeState({
        computedVariables: [{ id: 'cv1', name: 'myVar', expression: '' }],
      }));
      const err = errors.find(e => e.itemId === 'cv1' && e.severity === 'warning');
      assert.truthy(err, 'Should flag empty expression as warning');
    });

    it('warns on whitespace-only expression', () => {
      const errors = validate(makeState({
        computedVariables: [{ id: 'cv1', name: 'myVar', expression: '   ' }],
      }));
      const err = errors.find(e => e.itemId === 'cv1' && e.message.includes('no expression'));
      assert.truthy(err);
    });

    it('errors on empty computed variable name', () => {
      const errors = validate(makeState({
        computedVariables: [{ id: 'cv1', name: '', expression: 'x' }],
      }));
      const err = errors.find(e => e.itemId === 'cv1' && e.severity === 'error');
      assert.truthy(err);
    });

    it('errors on invalid computed variable name', () => {
      const errors = validate(makeState({
        computedVariables: [{ id: 'cv1', name: '123bad', expression: 'x' }],
      }));
      const err = errors.find(e => e.itemId === 'cv1' && e.severity === 'error' && e.message.includes('identifier'));
      assert.truthy(err);
    });

    it('errors on undefined variable reference in expression', () => {
      const errors = validate(makeState({
        computedVariables: [{ id: 'cv1', name: 'cv', expression: '${nonexistent}/path' }],
      }));
      const err = errors.find(e => e.itemId === 'cv1' && e.field === 'expression' && e.severity === 'error');
      assert.truthy(err, 'Should flag undefined ref');
      assert.includes(err.message, 'nonexistent');
    });

    it('accepts expression referencing defined variables', () => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'base' }],
        computedVariables: [{ id: 'cv1', name: 'dir', expression: '${base}/path' }],
      }));
      const err = errors.find(e => e.itemId === 'cv1' && e.field === 'expression' && e.message.includes('Undefined'));
      assert.falsy(err);
    });

    it('accepts expression referencing default variables', () => {
      const errors = validate(makeState({
        computedVariables: [{ id: 'cv1', name: 'tpl', expression: '${templatesDir}/my-module' }],
      }));
      const err = errors.find(e => e.itemId === 'cv1' && e.field === 'expression' && e.message.includes('Undefined'));
      assert.falsy(err);
    });

    it('errors on self-referencing computed variable', () => {
      const errors = validate(makeState({
        computedVariables: [{ id: 'cv1', name: 'loop', expression: '${loop}/sub' }],
      }));
      const err = errors.find(e => e.itemId === 'cv1' && e.message.includes('references itself'));
      assert.truthy(err);
      assert.equal(err.severity, 'error');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DUPLICATE VARIABLES
  // ═══════════════════════════════════════════════════════════════

  describe('Validator — duplicate variables', () => {
    it('errors on duplicate required variable names', () => {
      const errors = validate(makeState({
        requiredVariables: [
          { id: 'rv1', name: 'dupName' },
          { id: 'rv2', name: 'dupName' },
        ],
      }));
      const dupErr = errors.find(e => e.message.toLowerCase().includes('duplicate'));
      assert.truthy(dupErr, 'Should detect duplicate variable names');
      assert.equal(dupErr.severity, 'error');
    });

    it('errors on duplicate across required and computed', () => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'shared' }],
        computedVariables: [{ id: 'cv1', name: 'shared', expression: 'x' }],
      }));
      const dupErr = errors.find(e => e.message.toLowerCase().includes('duplicate'));
      assert.truthy(dupErr);
    });

    it('errors on duplicate computed variable names', () => {
      const errors = validate(makeState({
        computedVariables: [
          { id: 'cv1', name: 'same', expression: 'a' },
          { id: 'cv2', name: 'same', expression: 'b' },
        ],
      }));
      const dupErr = errors.find(e => e.message.includes('Duplicate'));
      assert.truthy(dupErr);
    });

    it('no duplicate error for different names', () => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'a' }, { id: 'rv2', name: 'b' }],
      }));
      const dupErr = errors.find(e => e.message.includes('Duplicate'));
      assert.falsy(dupErr);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SHADOWING
  // ═══════════════════════════════════════════════════════════════

  describe('Validator — default variable shadowing', () => {
    it('warns when required variable shadows a default', () => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'templatesDir' }],
      }));
      const shadow = errors.find(e => e.message.includes('shadows'));
      assert.truthy(shadow);
      assert.equal(shadow.severity, 'warning');
    });

    it('warns when computed variable shadows a default', () => {
      const errors = validate(makeState({
        computedVariables: [{ id: 'cv1', name: 'tasksDir', expression: 'custom/path' }],
      }));
      const shadow = errors.find(e => e.message.includes('shadows'));
      assert.truthy(shadow);
    });

    it('no shadow warning for non-default names', () => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'myCustomVar' }],
      }));
      const shadow = errors.find(e => e.message.includes('shadows'));
      assert.falsy(shadow);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // INSTRUCTION FIELD VALIDATION
  // ═══════════════════════════════════════════════════════════════

  describe('Validator — instruction fields', () => {
    it('errors on instruction with empty required field', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'CreateFile', args: { path: '' } }],
      }));
      const fieldErr = errors.find(e => e.itemId === 'i1' && e.severity === 'error');
      assert.truthy(fieldErr, 'Should flag empty required field');
    });

    it('errors on whitespace-only field', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'CreateFile', args: { path: '   ' } }],
      }));
      const fieldErr = errors.find(e => e.itemId === 'i1' && e.severity === 'error');
      assert.truthy(fieldErr);
    });

    it('errors on missing args key', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'CreateFile', args: {} }],
      }));
      const fieldErr = errors.find(e => e.itemId === 'i1' && e.field === 'path' && e.severity === 'error');
      assert.truthy(fieldErr);
    });

    it('passes on instruction with all fields filled', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'CreateFile', args: { path: 'some/file.txt' } }],
      }));
      const fieldErr = errors.find(e => e.itemId === 'i1' && e.field === 'path' && e.severity === 'error');
      assert.falsy(fieldErr, 'Should not flag filled field');
    });

    it('errors on ReplaceFile with empty targetPath', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'ReplaceFile', args: { targetPath: '', templatePath: 'b.tpl' } }],
      }));
      const err = errors.find(e => e.itemId === 'i1' && e.field === 'targetPath');
      assert.truthy(err);
    });

    it('errors on ReplaceFile with empty templatePath', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'ReplaceFile', args: { targetPath: 'a', templatePath: '' } }],
      }));
      const err = errors.find(e => e.itemId === 'i1' && e.field === 'templatePath');
      assert.truthy(err);
    });

    it('validates InsertAtAnchorInline — all 3 fields', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'InsertAtAnchorInline', args: { targetPath: '', inlineContent: '', anchor: '' } }],
      }));
      const fieldErrs = errors.filter(e => e.itemId === 'i1' && e.severity === 'error');
      assert.lengthOf(fieldErrs, 3, 'Should flag all 3 empty fields');
    });

    it('errors on unknown instruction type', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'NonExistent', args: {} }],
      }));
      const err = errors.find(e => e.itemId === 'i1' && e.message.includes('Unknown'));
      assert.truthy(err);
      assert.equal(err.severity, 'error');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // UNDEFINED VARIABLE REFS IN INSTRUCTIONS
  // ═══════════════════════════════════════════════════════════════

  describe('Validator — undefined variable refs in instructions', () => {
    it('warns on undefined ${ref} in instruction field', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'CreateFile', args: { path: '${noSuchVar}/file' } }],
      }));
      const warn = errors.find(e => e.itemId === 'i1' && e.severity === 'warning' && e.message.includes('Undefined'));
      assert.truthy(warn);
    });

    it('no warning for defined variable ref', () => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'myDir' }],
        items: [{ id: 'i1', type: 'CreateFile', args: { path: '${myDir}/file' } }],
      }));
      const warn = errors.find(e => e.itemId === 'i1' && e.message.includes('Undefined'));
      assert.falsy(warn);
    });

    it('no warning for default variable ref (templatesDir)', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'CreateFile', args: { path: '${templatesDir}/file' } }],
      }));
      const warn = errors.find(e => e.itemId === 'i1' && e.message.includes('Undefined') && e.message.includes('templatesDir'));
      assert.falsy(warn);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEMPLATE PATH HINTS
  // ═══════════════════════════════════════════════════════════════

  describe('Validator — template path hints', () => {
    it('warns when template path does not end in .tpl/.template/.ftl', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'ReplaceFile', args: { targetPath: 'a.txt', templatePath: 'plain.txt' } }],
      }));
      const warn = errors.find(e => e.itemId === 'i1' && e.field === 'templatePath' && e.message.includes('.tpl'));
      assert.truthy(warn);
      assert.equal(warn.severity, 'warning');
    });

    it('no warning when template ends in .tpl', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'ReplaceFile', args: { targetPath: 'a.txt', templatePath: 'build.tpl' } }],
      }));
      const warn = errors.find(e => e.itemId === 'i1' && e.field === 'templatePath' && e.message.includes('.tpl'));
      assert.falsy(warn);
    });

    it('no warning when template ends in .template', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'ReplaceFile', args: { targetPath: 'a', templatePath: 'my.template' } }],
      }));
      const warn = errors.find(e => e.field === 'templatePath' && e.message.includes('.tpl'));
      assert.falsy(warn);
    });

    it('no warning when template ends in .ftl', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'ReplaceFile', args: { targetPath: 'a', templatePath: 'my.ftl' } }],
      }));
      const warn = errors.find(e => e.field === 'templatePath' && e.message.includes('.tpl'));
      assert.falsy(warn);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ANCHOR FORMAT HINTS
  // ═══════════════════════════════════════════════════════════════

  describe('Validator — anchor format hints', () => {
    it('warns on anchor without recognized patterns', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'InsertAtAnchor', args: { targetPath: 'f', templatePath: 't.tpl', anchor: 'plain text' } }],
      }));
      const warn = errors.find(e => e.field === 'anchor' && e.message.includes('format'));
      assert.truthy(warn);
      assert.equal(warn.severity, 'warning');
    });

    it('no warning for anchor with scaffold-anchor', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'InsertAtAnchor', args: { targetPath: 'f', templatePath: 't.tpl', anchor: '/* <scaffold-anchor-x> */' } }],
      }));
      const warn = errors.find(e => e.field === 'anchor' && e.message.includes('format'));
      assert.falsy(warn);
    });

    it('no warning for anchor with <', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'InsertAtAnchor', args: { targetPath: 'f', templatePath: 't.tpl', anchor: '<anchor-tag>' } }],
      }));
      const warn = errors.find(e => e.field === 'anchor' && e.message.includes('format'));
      assert.falsy(warn);
    });

    it('no warning for anchor with /*', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'InsertAtAnchor', args: { targetPath: 'f', templatePath: 't.tpl', anchor: '/* marker */' } }],
      }));
      const warn = errors.find(e => e.field === 'anchor' && e.message.includes('format'));
      assert.falsy(warn);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RAW ITEMS
  // ═══════════════════════════════════════════════════════════════

  describe('Validator — __RAW__ items', () => {
    it('warns on raw unrecognized lines', () => {
      const errors = validate(makeState({
        items: [{ id: 'r1', type: '__RAW__', text: 'garbage' }],
      }));
      const rawWarn = errors.find(e => e.itemId === 'r1' && e.severity === 'warning');
      assert.truthy(rawWarn, 'Should warn on raw items');
    });

    it('warning includes first 60 chars of text', () => {
      const longText = 'a'.repeat(80);
      const errors = validate(makeState({
        items: [{ id: 'r1', type: '__RAW__', text: longText }],
      }));
      const warn = errors.find(e => e.itemId === 'r1');
      assert.includes(warn.message, '…');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CROSS-CUTTING: UNUSED VARIABLES
  // ═══════════════════════════════════════════════════════════════

  describe('Validator — unused variable warnings', () => {
    it('warns on unused required variable', () => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'unusedVar' }],
        items: [{ id: 'i1', type: 'CreateFile', args: { path: 'file.txt' } }],
      }));
      const warn = errors.find(e => e.itemId === 'rv1' && e.message.includes('never used'));
      assert.truthy(warn);
      assert.equal(warn.severity, 'warning');
    });

    it('no warning when variable is used in instruction', () => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'mod' }],
        items: [{ id: 'i1', type: 'CreateFile', args: { path: '${mod}/file' } }],
      }));
      const warn = errors.find(e => e.itemId === 'rv1' && e.message.includes('never used'));
      assert.falsy(warn);
    });

    it('no warning when variable is used in computed expression', () => {
      const errors = validate(makeState({
        requiredVariables: [{ id: 'rv1', name: 'base' }],
        computedVariables: [{ id: 'cv1', name: 'dir', expression: '${base}/sub' }],
        items: [{ id: 'i1', type: 'CreateFile', args: { path: '${dir}/f' } }],
      }));
      const warn = errors.find(e => e.itemId === 'rv1' && e.message.includes('never used'));
      assert.falsy(warn);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CROSS-CUTTING: CREATEFILE WITHOUT REPLACEFILE
  // ═══════════════════════════════════════════════════════════════

  describe('Validator — CreateFile without ReplaceFile', () => {
    it('warns when CreateFile has no subsequent ReplaceFile', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'CreateFile', args: { path: 'file.txt' } }],
      }));
      const warn = errors.find(e => e.itemId === 'i1' && e.message.includes('ReplaceFile'));
      assert.truthy(warn);
      assert.equal(warn.severity, 'warning');
    });

    it('no warning when CreateFile is followed by matching ReplaceFile', () => {
      const errors = validate(makeState({
        items: [
          { id: 'i1', type: 'CreateFile', args: { path: 'file.txt' } },
          { id: 'i2', type: 'ReplaceFile', args: { targetPath: 'file.txt', templatePath: 't.tpl' } },
        ],
      }));
      const warn = errors.find(e => e.itemId === 'i1' && e.message.includes('ReplaceFile'));
      assert.falsy(warn);
    });

    it('warns when ReplaceFile target does not match CreateFile path', () => {
      const errors = validate(makeState({
        items: [
          { id: 'i1', type: 'CreateFile', args: { path: 'file.txt' } },
          { id: 'i2', type: 'ReplaceFile', args: { targetPath: 'other.txt', templatePath: 't.tpl' } },
        ],
      }));
      const warn = errors.find(e => e.itemId === 'i1' && e.message.includes('ReplaceFile'));
      assert.truthy(warn);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CROSS-CUTTING: DUPLICATE INSTRUCTIONS
  // ═══════════════════════════════════════════════════════════════

  describe('Validator — duplicate instructions', () => {
    it('warns on identical instructions', () => {
      const errors = validate(makeState({
        items: [
          { id: 'i1', type: 'CreateFile', args: { path: 'same.txt' } },
          { id: 'i2', type: 'CreateFile', args: { path: 'same.txt' } },
        ],
      }));
      const warn = errors.find(e => e.message.includes('Duplicate instruction'));
      assert.truthy(warn);
    });

    it('no warning for different instructions', () => {
      const errors = validate(makeState({
        items: [
          { id: 'i1', type: 'CreateFile', args: { path: 'a.txt' } },
          { id: 'i2', type: 'CreateFile', args: { path: 'b.txt' } },
        ],
      }));
      const warn = errors.find(e => e.message.includes('Duplicate instruction'));
      assert.falsy(warn);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CROSS-CUTTING: LONG PIPELINE / NO INSTRUCTIONS
  // ═══════════════════════════════════════════════════════════════

  describe('Validator — pipeline-level warnings', () => {
    it('warns when task has no instructions at all', () => {
      const errors = validate(makeState({ items: [] }));
      const warn = errors.find(e => e.message.includes('no instructions'));
      assert.truthy(warn);
      assert.equal(warn.severity, 'warning');
    });

    it('suggests sections for long pipelines (>8 instructions, 0 sections)', () => {
      const items = Array.from({ length: 9 }, (_, i) => ({
        id: `i${i}`, type: 'CreateFile', args: { path: `file${i}.txt` },
      }));
      const errors = validate(makeState({ items }));
      const warn = errors.find(e => e.message.toLowerCase().includes('section'));
      assert.truthy(warn);
    });

    it('no section suggestion when pipeline has sections', () => {
      const items = [
        { id: 's1', type: '__SECTION__', title: 'Group' },
        ...Array.from({ length: 9 }, (_, i) => ({
          id: `i${i}`, type: 'CreateFile', args: { path: `file${i}.txt` },
        })),
      ];
      const errors = validate(makeState({ items }));
      const warn = errors.find(e => e.message.toLowerCase().includes('section divider'));
      assert.falsy(warn);
    });

    it('no section suggestion for short pipelines', () => {
      const items = Array.from({ length: 3 }, (_, i) => ({
        id: `i${i}`, type: 'CreateFile', args: { path: `file${i}.txt` },
      }));
      const errors = validate(makeState({ items }));
      const warn = errors.find(e => e.message.toLowerCase().includes('section'));
      assert.falsy(warn);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CLEAN STATE
  // ═══════════════════════════════════════════════════════════════

  describe('Validator — clean state', () => {
    it('returns no errors for a minimal valid state', () => {
      const errors = validate(makeState({
        items: [{ id: 'i1', type: 'CreateFile', args: { path: 'file.txt' } }],
      }));
      const realErrors = errors.filter(e => e.severity === 'error');
      assert.lengthOf(realErrors, 0, 'Minimal valid state should have no errors');
    });

    it('returns no errors for a complete valid state', () => {
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
      assert.lengthOf(realErrors, 0, `Should have no errors, got: ${realErrors.map(e => e.message).join('; ')}`);
    });

    it('returns multiple error types for a messy state', () => {
      const errors = validate(makeState({
        taskName: '',
        requiredVariables: [{ id: 'rv1', name: '' }],
        computedVariables: [{ id: 'cv1', name: '', expression: '' }],
        items: [{ id: 'i1', type: 'CreateFile', args: { path: '' } }],
      }));
      const realErrors = errors.filter(e => e.severity === 'error');
      assert.greaterThan(realErrors.length, 2, 'Should have multiple errors');
    });
  });
}
