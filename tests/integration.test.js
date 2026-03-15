// ─── Integration Tests ───────────────────────────────────────────

import { describe, it, assert } from './framework.js';
import { parseTaskFile } from '../js/lib/parser.js';
import { serializeTask } from '../js/lib/serializer.js';
import { validate } from '../js/lib/validator.js';
import { resolveVariables, buildVariableMap } from '../js/lib/resolver.js';
import { SAMPLE_TASK_STATE } from '../js/sampleTask.js';
import { INSTRUCTION_SCHEMA, InstructionType, createInstruction, createSection, createVariable, createId, DEFAULT_VARIABLES } from '../js/types.js';

export default function integrationTests() {

  // ═══════════════════════════════════════════════════════════════
  // PARSE → SERIALIZE ROUNDTRIP
  // ═══════════════════════════════════════════════════════════════

  describe('Integration — simple roundtrip', () => {
    it('roundtrips a simple task', () => {
      const original = [
        'task: simpleTask',
        '',
        '> moduleName',
        '> version',
        '',
        'tplDir = "${templatesDir}/myModule"',
        '',
        'CreateFile("${moduleName}/build.gradle")',
        'ReplaceFile("${moduleName}/build.gradle", "${tplDir}/build.tpl")',
        '',
      ].join('\n');

      const parsed = parseTaskFile(original);
      assert.equal(parsed.taskName, 'simpleTask');
      assert.lengthOf(parsed.requiredVariables, 2);
      assert.lengthOf(parsed.computedVariables, 1);

      const serialized = serializeTask(parsed);
      assert.includes(serialized, 'task: simpleTask');
      assert.includes(serialized, '> moduleName');
      assert.includes(serialized, '> version');
      assert.includes(serialized, 'tplDir = "${templatesDir}/myModule"');
      assert.includes(serialized, 'CreateFile("${moduleName}/build.gradle")');
      assert.includes(serialized, 'ReplaceFile("${moduleName}/build.gradle", "${tplDir}/build.tpl")');
    });

    it('roundtrips task name only', () => {
      const parsed = parseTaskFile('task: lonely\n');
      const serialized = serializeTask(parsed);
      const reparsed = parseTaskFile(serialized);
      assert.equal(reparsed.taskName, 'lonely');
    });

    it('roundtrips variables only', () => {
      const original = 'task: t\n> v1\n> v2\ncv = "${v1}/path"\n';
      const parsed = parseTaskFile(original);
      const serialized = serializeTask(parsed);
      const reparsed = parseTaskFile(serialized);
      assert.lengthOf(reparsed.requiredVariables, 2);
      assert.lengthOf(reparsed.computedVariables, 1);
    });
  });

  describe('Integration — structural roundtrip', () => {
    it('re-parses to equivalent state (type + args match)', () => {
      const original = 'task: rt\n> var1\nfoo = "bar"\nCreateFile("test.txt")\n';
      const parsed1 = parseTaskFile(original);
      const serialized = serializeTask(parsed1);
      const parsed2 = parseTaskFile(serialized);

      assert.equal(parsed1.taskName, parsed2.taskName);
      assert.lengthOf(parsed2.requiredVariables, parsed1.requiredVariables.length);
      assert.lengthOf(parsed2.computedVariables, parsed1.computedVariables.length);
      assert.equal(parsed2.requiredVariables[0].name, parsed1.requiredVariables[0].name);
      assert.equal(parsed2.computedVariables[0].name, parsed1.computedVariables[0].name);

      const types1 = parsed1.items.filter(i => !i.type.startsWith('__')).map(i => i.type);
      const types2 = parsed2.items.filter(i => !i.type.startsWith('__')).map(i => i.type);
      assert.deepEqual(types1, types2);
    });

    it('roundtrips all 8 instruction types', () => {
      const text = [
        'task: allTypes',
        'CreateFile("a")',
        'CreateDirectory("b")',
        'ReplaceFile("c", "d.tpl")',
        'AppendToFile("e", "f.tpl")',
        'InsertAtAnchor("g", "h.tpl", "/* anchor */")',
        'InsertAtAnchorInline("i", "content", "/* anchor */")',
        'InsertIntoJavaClass("j", "k.tpl")',
        'InsertIntoJavaClassInline("l", "code")',
        '',
      ].join('\n');

      const parsed = parseTaskFile(text);
      assert.lengthOf(parsed.items, 8);

      const serialized = serializeTask(parsed);
      const reparsed = parseTaskFile(serialized);
      assert.lengthOf(reparsed.items, 8);

      for (let i = 0; i < 8; i++) {
        assert.equal(reparsed.items[i].type, parsed.items[i].type);
      }
    });
  });

  describe('Integration — complex roundtrip', () => {
    it('roundtrips a complex real-world task', () => {
      const complex = [
        'task: newIntegration',
        '',
        '> adapterType',
        '> className',
        '> packageName',
        '> version',
        '',
        'tplDir = "${templatesDir}/new-integration"',
        'srcDir = "${packageName}/src/main/java/com/example/${packageName}${version}"',
        '',
        '// ==================== DIRECTORIES ====================',
        'CreateDirectory("${srcDir}")',
        'CreateDirectory("${packageName}/src/test")',
        '',
        '// ==================== CONFIG FILES ====================',
        'CreateFile("${packageName}/build.gradle")',
        'ReplaceFile("${packageName}/build.gradle", "${tplDir}/build.tpl")',
        '',
        '// ==================== REGISTRATION ====================',
        'InsertAtAnchorInline("settings.gradle", "include \'${packageName}\'", "/* <scaffold-anchor> */")',
        '',
      ].join('\n');

      const parsed = parseTaskFile(complex);
      assert.equal(parsed.taskName, 'newIntegration');
      assert.lengthOf(parsed.requiredVariables, 4);
      assert.lengthOf(parsed.computedVariables, 2);

      const sections = parsed.items.filter(i => i.type === '__SECTION__');
      assert.lengthOf(sections, 3);

      const serialized = serializeTask(parsed);
      assert.includes(serialized, 'task: newIntegration');
      assert.includes(serialized, '> adapterType');
      assert.includes(serialized, 'CreateDirectory("${srcDir}")');
      assert.includes(serialized, 'InsertAtAnchorInline(');

      // Re-parse should produce same structure
      const reparsed = parseTaskFile(serialized);
      assert.equal(reparsed.taskName, 'newIntegration');
      assert.lengthOf(reparsed.requiredVariables, 4);
      assert.lengthOf(reparsed.computedVariables, 2);
    });

    it('roundtrips escaped content in args', () => {
      const state = {
        taskName: 'esc',
        requiredVariables: [],
        computedVariables: [],
        items: [{
          id: '1', type: 'InsertAtAnchorInline',
          args: { targetPath: 'f.java', inlineContent: 'say "hello"', anchor: '/* anchor */' },
        }],
      };
      const serialized = serializeTask(state);
      const parsed = parseTaskFile(serialized);
      assert.equal(parsed.items[0].args.inlineContent, 'say "hello"');
    });
  });

  describe('Integration — spacing roundtrip', () => {
    it('preserves blank lines between instruction groups', () => {
      const input = [
        'task: spacedTask',
        '',
        '> mod',
        '',
        'dir = "${mod}/src"',
        '',
        'CreateFile("${dir}/A.java")',
        '',
        '// ==================== Config ====================',
        'ReplaceFile("${dir}/A.java", "tpl/a.tpl")',
        '',
      ].join('\n');

      const parsed = parseTaskFile(input);
      const serialized = serializeTask(parsed);

      // Sections should have blank line before them
      const lines = serialized.split('\n');
      const sectionIdx = lines.findIndex(l => l.includes('CONFIG'));
      assert.greaterThan(sectionIdx, 0, 'Section should exist');
      assert.equal(lines[sectionIdx - 1], '', 'Should have blank line before section');
    });

    it('serialized output has no triple-blank-line blobs', () => {
      const input = [
        'task: t',
        '',
        '> v',
        '',
        'CreateFile("a")',
        '',
        '',
        '// ====== S1 ======',
        'CreateFile("b")',
        '',
        '// ====== S2 ======',
        'CreateFile("c")',
        '',
      ].join('\n');

      const parsed = parseTaskFile(input);
      const serialized = serializeTask(parsed);
      assert.truthy(!serialized.includes('\n\n\n'), 'Should not have triple newlines (blob)');
    });

    it('roundtripped file with sections has visual separation', () => {
      const input = [
        'task: nice',
        '> mod',
        '// ==================== Setup ====================',
        'CreateDirectory("${mod}")',
        '// ==================== Files ====================',
        'CreateFile("${mod}/build.gradle")',
        '',
      ].join('\n');

      const parsed = parseTaskFile(input);
      const serialized = serializeTask(parsed);
      const lines = serialized.split('\n');

      // Each section header should be preceded by a blank line (except maybe the first)
      const sectionIndices = lines.reduce((acc, l, i) => {
        if (l.includes('====')) acc.push(i);
        return acc;
      }, []);

      assert.lengthOf(sectionIndices, 2);
      // Second section must have blank before it
      if (sectionIndices[1] > 0) {
        assert.equal(lines[sectionIndices[1] - 1], '', 'Second section should have blank line before');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SAMPLE TASK VALIDITY
  // ═══════════════════════════════════════════════════════════════

  describe('Integration — sample task state', () => {
    it('has expected shape', () => {
      assert.truthy(SAMPLE_TASK_STATE.taskName);
      assert.greaterThan(SAMPLE_TASK_STATE.requiredVariables.length, 0);
      assert.greaterThan(SAMPLE_TASK_STATE.computedVariables.length, 0);
      assert.greaterThan(SAMPLE_TASK_STATE.items.length, 0);
    });

    it('passes validation with no errors', () => {
      const errors = validate(SAMPLE_TASK_STATE);
      const realErrors = errors.filter(e => e.severity === 'error');
      assert.lengthOf(realErrors, 0, `Should have no errors, got: ${realErrors.map(e => e.message).join('; ')}`);
    });

    it('serializes without crashing', () => {
      const output = serializeTask(SAMPLE_TASK_STATE);
      assert.truthy(output);
      assert.includes(output, 'task: sampleNewModule');
    });

    it('instruction types all exist in schema', () => {
      for (const item of SAMPLE_TASK_STATE.items) {
        if (item.type.startsWith('__')) continue;
        assert.truthy(INSTRUCTION_SCHEMA[item.type], `Schema missing for type: ${item.type}`);
      }
    });

    it('items have correct arg keys for their type', () => {
      for (const item of SAMPLE_TASK_STATE.items) {
        if (item.type.startsWith('__')) continue;
        const schema = INSTRUCTION_SCHEMA[item.type];
        const expectedKeys = schema.fields.map(f => f.key);
        for (const key of Object.keys(item.args)) {
          assert.includes(expectedKeys, key, `Unexpected arg key '${key}' in ${item.type}`);
        }
      }
    });

    it('serializes and re-parses to same structure', () => {
      const serialized = serializeTask(SAMPLE_TASK_STATE);
      const parsed = parseTaskFile(serialized);
      assert.equal(parsed.taskName, SAMPLE_TASK_STATE.taskName);
      assert.lengthOf(parsed.requiredVariables, SAMPLE_TASK_STATE.requiredVariables.length);
      assert.lengthOf(parsed.computedVariables, SAMPLE_TASK_STATE.computedVariables.length);

      const origTypes = SAMPLE_TASK_STATE.items.filter(i => !i.type.startsWith('__')).map(i => i.type);
      const parsedTypes = parsed.items.filter(i => !i.type.startsWith('__')).map(i => i.type);
      assert.deepEqual(origTypes, parsedTypes);
    });

    it('variables resolve with the resolver', () => {
      const map = buildVariableMap(SAMPLE_TASK_STATE, DEFAULT_VARIABLES);
      assert.truthy(map.tplDir);
      assert.truthy(map.srcDir);
      assert.truthy(map.moduleName);
      assert.truthy(map.className);
    });

    it('has all unique item ids', () => {
      const ids = SAMPLE_TASK_STATE.items.map(i => i.id);
      const unique = new Set(ids);
      assert.equal(unique.size, ids.length, 'All item IDs should be unique');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TYPES / SCHEMA CONSISTENCY
  // ═══════════════════════════════════════════════════════════════

  describe('Integration — InstructionType enum', () => {
    it('every InstructionType has a matching schema', () => {
      for (const type of Object.values(InstructionType)) {
        assert.truthy(INSTRUCTION_SCHEMA[type], `Missing schema for InstructionType.${type}`);
      }
    });

    it('every schema entry is in InstructionType', () => {
      for (const type of Object.keys(INSTRUCTION_SCHEMA)) {
        const found = Object.values(InstructionType).includes(type);
        assert.truthy(found, `Schema has type '${type}' not in InstructionType`);
      }
    });

    it('has 8 instruction types', () => {
      assert.equal(Object.keys(InstructionType).length, 8);
    });
  });

  describe('Integration — createInstruction', () => {
    it('creates correct shape for each type', () => {
      for (const type of Object.values(InstructionType)) {
        const instr = createInstruction(type);
        assert.truthy(instr.id, `Missing id for ${type}`);
        assert.equal(instr.type, type);
        assert.equal(instr.collapsed, false);
        assert.truthy(typeof instr.args === 'object');

        const schema = INSTRUCTION_SCHEMA[type];
        for (const field of schema.fields) {
          assert(field.key in instr.args, `Missing arg key '${field.key}' for ${type}`);
          assert.equal(instr.args[field.key], '', `Arg '${field.key}' should default to empty string`);
        }
      }
    });

    it('each created instruction has unique id', () => {
      const a = createInstruction('CreateFile');
      const b = createInstruction('CreateFile');
      assert(a.id !== b.id, 'Should have unique ids');
    });
  });

  describe('Integration — factory functions', () => {
    it('createSection returns correct shape', () => {
      const section = createSection('My Section');
      assert.truthy(section.id);
      assert.equal(section.type, '__SECTION__');
      assert.equal(section.title, 'My Section');
    });

    it('createSection defaults to "New Section"', () => {
      const section = createSection();
      assert.equal(section.title, 'New Section');
    });

    it('createVariable returns correct shape', () => {
      const v = createVariable('myVar', '${base}/path', false);
      assert.truthy(v.id);
      assert.equal(v.name, 'myVar');
      assert.equal(v.expression, '${base}/path');
    });

    it('createId returns unique ids', () => {
      const a = createId();
      const b = createId();
      assert(a !== b, 'IDs should be unique');
    });
  });

  describe('Integration — INSTRUCTION_SCHEMA fields', () => {
    it('every schema has label, icon, category, description, fields', () => {
      for (const [type, schema] of Object.entries(INSTRUCTION_SCHEMA)) {
        assert.truthy(schema.label, `${type} missing label`);
        assert.truthy(schema.icon, `${type} missing icon`);
        assert.truthy(schema.category, `${type} missing category`);
        assert.truthy(schema.description, `${type} missing description`);
        assert.truthy(Array.isArray(schema.fields), `${type} fields should be array`);
        assert.greaterThan(schema.fields.length, 0, `${type} should have fields`);
      }
    });

    it('every field has key, label, type', () => {
      for (const [typeName, schema] of Object.entries(INSTRUCTION_SCHEMA)) {
        for (const field of schema.fields) {
          assert.truthy(field.key, `${typeName} field missing key`);
          assert.truthy(field.label, `${typeName}.${field.key} missing label`);
          assert.truthy(field.type, `${typeName}.${field.key} missing type`);
        }
      }
    });
  });

  describe('Integration — DEFAULT_VARIABLES', () => {
    it('has templatesDir', () => {
      assert.truthy(DEFAULT_VARIABLES.templatesDir);
    });

    it('has tasksDir', () => {
      assert.truthy(DEFAULT_VARIABLES.tasksDir);
    });

    it('has at least 2 default variables', () => {
      assert.greaterThan(Object.keys(DEFAULT_VARIABLES).length, 1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // VALIDATOR + PARSER
  // ═══════════════════════════════════════════════════════════════

  describe('Integration — validator + parser', () => {
    it('parsed valid task passes validation', () => {
      const text = 'task: validTask\n> myVar\ntpl = "${templatesDir}/t"\nCreateFile("${myVar}/file.txt")\n';
      const parsed = parseTaskFile(text);
      const errors = validate(parsed);
      const realErrors = errors.filter(e => e.severity === 'error');
      assert.lengthOf(realErrors, 0, `Should pass: ${realErrors.map(e => e.message).join('; ')}`);
    });

    it('parsed task with empty name produces error', () => {
      const text = 'CreateFile("file.txt")\n';
      const parsed = parseTaskFile(text);
      const errors = validate(parsed);
      const nameErr = errors.find(e => e.severity === 'error' && e.message.includes('Task name'));
      assert.truthy(nameErr);
    });

    it('parsed task with unknown instruction gets raw warning', () => {
      const text = 'task: t\nWeirdInstruction("a")\n';
      const parsed = parseTaskFile(text);
      const errors = validate(parsed);
      const rawWarn = errors.find(e => e.severity === 'warning' && e.message.includes('Unrecognized'));
      assert.truthy(rawWarn);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RESOLVER + VARIABLE MAP
  // ═══════════════════════════════════════════════════════════════

  describe('Integration — resolver with parsed state', () => {
    it('resolves computed variables using required variable placeholders', () => {
      const text = 'task: t\n> mod\ndir = "${mod}/src"\n';
      const parsed = parseTaskFile(text);
      const map = buildVariableMap(parsed);
      assert.equal(map.dir, '<mod>/src');
    });

    it('resolves chained computed variables', () => {
      const text = 'task: t\na = "root"\nb = "${a}/sub"\nc = "${b}/deep"\n';
      const parsed = parseTaskFile(text);
      const map = buildVariableMap(parsed);
      assert.equal(map.c, 'root/sub/deep');
    });

    it('resolves instruction paths with built variable map', () => {
      const text = 'task: t\n> mod\ndir = "${mod}/src"\nCreateFile("${dir}/Main.java")\n';
      const parsed = parseTaskFile(text);
      const map = buildVariableMap(parsed);
      const { resolved } = resolveVariables(parsed.items[0].args.path, map);
      assert.equal(resolved, '<mod>/src/Main.java');
    });
  });
}
