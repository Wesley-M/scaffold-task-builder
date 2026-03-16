// ─── Integration Tests (migrated from tests/integration.test.js) ───

describe('Integration — simple roundtrip', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('roundtrips a simple task', () => {
    cy.getTestModules().then(({ parseTaskFile, serializeTask }) => {
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
      expect(parsed.taskName).to.equal('simpleTask');
      expect(parsed.requiredVariables).to.have.length(2);
      expect(parsed.computedVariables).to.have.length(1);

      const serialized = serializeTask(parsed);
      expect(serialized).to.include('task: simpleTask');
      expect(serialized).to.include('> moduleName');
      expect(serialized).to.include('> version');
      expect(serialized).to.include('tplDir = "${templatesDir}/myModule"');
      expect(serialized).to.include('CreateFile("${moduleName}/build.gradle")');
      expect(serialized).to.include('ReplaceFile("${moduleName}/build.gradle", "${tplDir}/build.tpl")');
    });
  });

  it('roundtrips task name only', () => {
    cy.getTestModules().then(({ parseTaskFile, serializeTask }) => {
      const parsed = parseTaskFile('task: lonely\n');
      const serialized = serializeTask(parsed);
      const reparsed = parseTaskFile(serialized);
      expect(reparsed.taskName).to.equal('lonely');
    });
  });

  it('roundtrips variables only', () => {
    cy.getTestModules().then(({ parseTaskFile, serializeTask }) => {
      const original = 'task: t\n> v1\n> v2\ncv = "${v1}/path"\n';
      const parsed = parseTaskFile(original);
      const serialized = serializeTask(parsed);
      const reparsed = parseTaskFile(serialized);
      expect(reparsed.requiredVariables).to.have.length(2);
      expect(reparsed.computedVariables).to.have.length(1);
    });
  });
});

describe('Integration — structural roundtrip', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('re-parses to equivalent state (type + args match)', () => {
    cy.getTestModules().then(({ parseTaskFile, serializeTask }) => {
      const original = 'task: rt\n> var1\nfoo = "bar"\nCreateFile("test.txt")\n';
      const parsed1 = parseTaskFile(original);
      const serialized = serializeTask(parsed1);
      const parsed2 = parseTaskFile(serialized);

      expect(parsed1.taskName).to.equal(parsed2.taskName);
      expect(parsed2.requiredVariables).to.have.length(parsed1.requiredVariables.length);
      expect(parsed2.computedVariables).to.have.length(parsed1.computedVariables.length);
      expect(parsed2.requiredVariables[0].name).to.equal(parsed1.requiredVariables[0].name);
      expect(parsed2.computedVariables[0].name).to.equal(parsed1.computedVariables[0].name);

      const types1 = parsed1.items.filter(i => !i.type.startsWith('__')).map(i => i.type);
      const types2 = parsed2.items.filter(i => !i.type.startsWith('__')).map(i => i.type);
      expect(types1).to.deep.equal(types2);
    });
  });

  it('roundtrips all 8 instruction types', () => {
    cy.getTestModules().then(({ parseTaskFile, serializeTask }) => {
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
      expect(parsed.items).to.have.length(8);

      const serialized = serializeTask(parsed);
      const reparsed = parseTaskFile(serialized);
      expect(reparsed.items).to.have.length(8);

      for (let i = 0; i < 8; i++) {
        expect(reparsed.items[i].type).to.equal(parsed.items[i].type);
      }
    });
  });
});

describe('Integration — complex roundtrip', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('roundtrips a complex real-world task', () => {
    cy.getTestModules().then(({ parseTaskFile, serializeTask }) => {
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
      expect(parsed.taskName).to.equal('newIntegration');
      expect(parsed.requiredVariables).to.have.length(4);
      expect(parsed.computedVariables).to.have.length(2);

      const sections = parsed.items.filter(i => i.type === '__SECTION__');
      expect(sections).to.have.length(3);

      const serialized = serializeTask(parsed);
      expect(serialized).to.include('task: newIntegration');
      expect(serialized).to.include('> adapterType');
      expect(serialized).to.include('CreateDirectory("${srcDir}")');
      expect(serialized).to.include('InsertAtAnchorInline(');

      const reparsed = parseTaskFile(serialized);
      expect(reparsed.taskName).to.equal('newIntegration');
      expect(reparsed.requiredVariables).to.have.length(4);
      expect(reparsed.computedVariables).to.have.length(2);
    });
  });

  it('roundtrips escaped content in args', () => {
    cy.getTestModules().then(({ parseTaskFile, serializeTask }) => {
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
      expect(parsed.items[0].args.inlineContent).to.equal('say "hello"');
    });
  });
});

describe('Integration — spacing roundtrip', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('preserves blank lines between instruction groups', () => {
    cy.getTestModules().then(({ parseTaskFile, serializeTask }) => {
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

      const lines = serialized.split('\n');
      const sectionIdx = lines.findIndex(l => l.includes('CONFIG') || l.includes('Config'));
      expect(sectionIdx).to.be.greaterThan(0, 'Section should exist');
      expect(lines[sectionIdx - 1]).to.equal('', 'Should have blank line before section');
    });
  });

  it('serialized output has no triple-blank-line blobs', () => {
    cy.getTestModules().then(({ parseTaskFile, serializeTask }) => {
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
      expect(serialized).to.not.include('\n\n\n');
    });
  });

  it('roundtripped file with sections has visual separation', () => {
    cy.getTestModules().then(({ parseTaskFile, serializeTask }) => {
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

      const sectionIndices = lines.reduce((acc, l, i) => {
        if (l.includes('====')) acc.push(i);
        return acc;
      }, []);

      expect(sectionIndices).to.have.length(2);
      if (sectionIndices[1] > 0) {
        expect(lines[sectionIndices[1] - 1]).to.equal('', 'Second section should have blank line before');
      }
    });
  });
});

describe('Integration — sample task state', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('has expected shape', () => {
    cy.getTestModules().then(({ SAMPLE_TASK_STATE }) => {
      expect(SAMPLE_TASK_STATE.taskName).to.be.ok;
      expect(SAMPLE_TASK_STATE.requiredVariables.length).to.be.greaterThan(0);
      expect(SAMPLE_TASK_STATE.computedVariables.length).to.be.greaterThan(0);
      expect(SAMPLE_TASK_STATE.items.length).to.be.greaterThan(0);
    });
  });

  it('passes validation with no errors', () => {
    cy.getTestModules().then(({ validate, SAMPLE_TASK_STATE }) => {
      const errors = validate(SAMPLE_TASK_STATE);
      const realErrors = errors.filter(e => e.severity === 'error');
      expect(realErrors).to.have.length(0);
    });
  });

  it('serializes without crashing', () => {
    cy.getTestModules().then(({ serializeTask, SAMPLE_TASK_STATE }) => {
      const output = serializeTask(SAMPLE_TASK_STATE);
      expect(output).to.be.ok;
      expect(output).to.include('task: launchStartup');
    });
  });

  it('instruction types all exist in schema', () => {
    cy.getTestModules().then(({ SAMPLE_TASK_STATE, INSTRUCTION_SCHEMA }) => {
      for (const item of SAMPLE_TASK_STATE.items) {
        if (item.type.startsWith('__')) continue;
        expect(INSTRUCTION_SCHEMA[item.type], `Schema missing for type: ${item.type}`).to.be.ok;
      }
    });
  });

  it('items have correct arg keys for their type', () => {
    cy.getTestModules().then(({ SAMPLE_TASK_STATE, INSTRUCTION_SCHEMA }) => {
      for (const item of SAMPLE_TASK_STATE.items) {
        if (item.type.startsWith('__')) continue;
        const schema = INSTRUCTION_SCHEMA[item.type];
        const expectedKeys = schema.fields.map(f => f.key);
        for (const key of Object.keys(item.args)) {
          expect(expectedKeys).to.include(key, `Unexpected arg key '${key}' in ${item.type}`);
        }
      }
    });
  });

  it('serializes and re-parses to same structure', () => {
    cy.getTestModules().then(({ parseTaskFile, serializeTask, SAMPLE_TASK_STATE }) => {
      const serialized = serializeTask(SAMPLE_TASK_STATE);
      const parsed = parseTaskFile(serialized);
      expect(parsed.taskName).to.equal(SAMPLE_TASK_STATE.taskName);
      expect(parsed.requiredVariables).to.have.length(SAMPLE_TASK_STATE.requiredVariables.length);
      expect(parsed.computedVariables).to.have.length(SAMPLE_TASK_STATE.computedVariables.length);

      const origTypes = SAMPLE_TASK_STATE.items.filter(i => !i.type.startsWith('__')).map(i => i.type);
      const parsedTypes = parsed.items.filter(i => !i.type.startsWith('__')).map(i => i.type);
      expect(origTypes).to.deep.equal(parsedTypes);
    });
  });

  it('variables resolve with the resolver', () => {
    cy.getTestModules().then(({ buildVariableMap, SAMPLE_TASK_STATE, DEFAULT_VARIABLES }) => {
      const map = buildVariableMap(SAMPLE_TASK_STATE, DEFAULT_VARIABLES);
      expect(map.appDir).to.be.ok;
      expect(map.apiDir).to.be.ok;
      expect(map.webDir).to.be.ok;
      expect(map.appName).to.be.ok;
    });
  });

  it('has all unique item ids', () => {
    cy.getTestModules().then(({ SAMPLE_TASK_STATE }) => {
      const ids = SAMPLE_TASK_STATE.items.map(i => i.id);
      const unique = new Set(ids);
      expect(unique.size).to.equal(ids.length, 'All item IDs should be unique');
    });
  });
});

describe('Integration — InstructionType enum', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('every InstructionType has a matching schema', () => {
    cy.getTestModules().then(({ InstructionType, INSTRUCTION_SCHEMA }) => {
      for (const type of Object.values(InstructionType)) {
        expect(INSTRUCTION_SCHEMA[type], `Missing schema for InstructionType.${type}`).to.be.ok;
      }
    });
  });

  it('every schema entry is in InstructionType', () => {
    cy.getTestModules().then(({ InstructionType, INSTRUCTION_SCHEMA }) => {
      for (const type of Object.keys(INSTRUCTION_SCHEMA)) {
        const found = Object.values(InstructionType).includes(type);
        expect(found, `Schema has type '${type}' not in InstructionType`).to.be.true;
      }
    });
  });

  it('has 8 instruction types', () => {
    cy.getTestModules().then(({ InstructionType }) => {
      expect(Object.keys(InstructionType)).to.have.length(8);
    });
  });
});

describe('Integration — createInstruction', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('creates correct shape for each type', () => {
    cy.getTestModules().then(({ InstructionType, INSTRUCTION_SCHEMA, createInstruction }) => {
      for (const type of Object.values(InstructionType)) {
        const instr = createInstruction(type);
        expect(instr.id, `Missing id for ${type}`).to.be.ok;
        expect(instr.type).to.equal(type);
        expect(instr.collapsed).to.equal(false);
        expect(typeof instr.args).to.equal('object');

        const schema = INSTRUCTION_SCHEMA[type];
        for (const field of schema.fields) {
          expect(field.key in instr.args, `Missing arg key '${field.key}' for ${type}`).to.be.true;
          expect(instr.args[field.key], `Arg '${field.key}' should default to empty string`).to.equal('');
        }
      }
    });
  });

  it('each created instruction has unique id', () => {
    cy.getTestModules().then(({ createInstruction }) => {
      const a = createInstruction('CreateFile');
      const b = createInstruction('CreateFile');
      expect(a.id).to.not.equal(b.id);
    });
  });
});

describe('Integration — factory functions', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('createSection returns correct shape', () => {
    cy.getTestModules().then(({ createSection }) => {
      const section = createSection('My Section');
      expect(section.id).to.be.ok;
      expect(section.type).to.equal('__SECTION__');
      expect(section.title).to.equal('My Section');
    });
  });

  it('createSection defaults to "New Section"', () => {
    cy.getTestModules().then(({ createSection }) => {
      const section = createSection();
      expect(section.title).to.equal('New Section');
    });
  });

  it('createVariable returns correct shape', () => {
    cy.getTestModules().then(({ createVariable }) => {
      const v = createVariable('myVar', '${base}/path', false);
      expect(v.id).to.be.ok;
      expect(v.name).to.equal('myVar');
      expect(v.expression).to.equal('${base}/path');
    });
  });

  it('createId returns unique ids', () => {
    cy.getTestModules().then(({ createId }) => {
      const a = createId();
      const b = createId();
      expect(a).to.not.equal(b);
    });
  });
});

describe('Integration — INSTRUCTION_SCHEMA fields', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('every schema has label, icon, category, description, fields', () => {
    cy.getTestModules().then(({ INSTRUCTION_SCHEMA }) => {
      for (const [type, schema] of Object.entries(INSTRUCTION_SCHEMA)) {
        expect(schema.label, `${type} missing label`).to.be.ok;
        expect(schema.icon, `${type} missing icon`).to.be.ok;
        expect(schema.category, `${type} missing category`).to.be.ok;
        expect(schema.description, `${type} missing description`).to.be.ok;
        expect(Array.isArray(schema.fields), `${type} fields should be array`).to.be.true;
        expect(schema.fields.length, `${type} should have fields`).to.be.greaterThan(0);
      }
    });
  });

  it('every field has key, label, type', () => {
    cy.getTestModules().then(({ INSTRUCTION_SCHEMA }) => {
      for (const [typeName, schema] of Object.entries(INSTRUCTION_SCHEMA)) {
        for (const field of schema.fields) {
          expect(field.key, `${typeName} field missing key`).to.be.ok;
          expect(field.label, `${typeName}.${field.key} missing label`).to.be.ok;
          expect(field.type, `${typeName}.${field.key} missing type`).to.be.ok;
        }
      }
    });
  });
});

describe('Integration — DEFAULT_VARIABLES', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('has templatesDir', () => {
    cy.getTestModules().then(({ DEFAULT_VARIABLES }) => {
      expect(DEFAULT_VARIABLES.templatesDir).to.be.ok;
    });
  });

  it('has tasksDir', () => {
    cy.getTestModules().then(({ DEFAULT_VARIABLES }) => {
      expect(DEFAULT_VARIABLES.tasksDir).to.be.ok;
    });
  });

  it('has at least 2 default variables', () => {
    cy.getTestModules().then(({ DEFAULT_VARIABLES }) => {
      expect(Object.keys(DEFAULT_VARIABLES).length).to.be.greaterThan(1);
    });
  });
});

describe('Integration — validator + parser', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('parsed valid task passes validation', () => {
    cy.getTestModules().then(({ parseTaskFile, validate }) => {
      const text = 'task: validTask\n> myVar\ntpl = "${templatesDir}/t"\nCreateFile("${myVar}/file.txt")\n';
      const parsed = parseTaskFile(text);
      const errors = validate(parsed);
      const realErrors = errors.filter(e => e.severity === 'error');
      expect(realErrors).to.have.length(0);
    });
  });

  it('parsed task with empty name produces error', () => {
    cy.getTestModules().then(({ parseTaskFile, validate }) => {
      const text = 'CreateFile("file.txt")\n';
      const parsed = parseTaskFile(text);
      const errors = validate(parsed);
      const nameErr = errors.find(e => e.severity === 'error' && e.message.includes('Task name'));
      expect(nameErr).to.be.ok;
    });
  });

  it('parsed task with unknown instruction gets raw warning', () => {
    cy.getTestModules().then(({ parseTaskFile, validate }) => {
      const text = 'task: t\nWeirdInstruction("a")\n';
      const parsed = parseTaskFile(text);
      const errors = validate(parsed);
      const rawWarn = errors.find(e => e.severity === 'warning' && e.message.includes('Unrecognized'));
      expect(rawWarn).to.be.ok;
    });
  });
});

describe('Integration — resolver with parsed state', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('resolves computed variables using required variable placeholders', () => {
    cy.getTestModules().then(({ parseTaskFile, buildVariableMap }) => {
      const text = 'task: t\n> mod\ndir = "${mod}/src"\n';
      const parsed = parseTaskFile(text);
      const map = buildVariableMap(parsed);
      expect(map.dir).to.equal('<mod>/src');
    });
  });

  it('resolves chained computed variables', () => {
    cy.getTestModules().then(({ parseTaskFile, buildVariableMap }) => {
      const text = 'task: t\na = "root"\nb = "${a}/sub"\nc = "${b}/deep"\n';
      const parsed = parseTaskFile(text);
      const map = buildVariableMap(parsed);
      expect(map.c).to.equal('root/sub/deep');
    });
  });

  it('resolves instruction paths with built variable map', () => {
    cy.getTestModules().then(({ parseTaskFile, buildVariableMap, resolveVariables }) => {
      const text = 'task: t\n> mod\ndir = "${mod}/src"\nCreateFile("${dir}/Main.java")\n';
      const parsed = parseTaskFile(text);
      const map = buildVariableMap(parsed);
      const { resolved } = resolveVariables(parsed.items[0].args.path, map);
      expect(resolved).to.equal('<mod>/src/Main.java');
    });
  });
});
