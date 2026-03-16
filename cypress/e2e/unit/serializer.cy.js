// ─── Serializer Tests (Cypress) ────────────────────────────────────────────

function state(overrides = {}) {
  return { taskName: 't', requiredVariables: [], computedVariables: [], items: [], ...overrides };
}

describe('Serializer — task name', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('outputs task: name as first line', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({ taskName: 'myTask' }));
      expect(output).to.include('task: myTask');
    });
  });

  it('uses "unnamed" fallback when task name is empty', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({ taskName: '' }));
      expect(output).to.include('task: unnamed');
    });
  });

  it('task line is the very first line', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({ taskName: 'hello' }));
      expect(output.startsWith('task: hello'), 'Should start with task line').to.be.true;
    });
  });

  it('handles task name with special chars', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({ taskName: 'my-task_v2' }));
      expect(output).to.include('task: my-task_v2');
    });
  });
});

describe('Serializer — required variables', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('outputs > varName format', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        requiredVariables: [{ id: '1', name: 'moduleName' }, { id: '2', name: 'version' }],
      }));
      expect(output).to.include('> moduleName');
      expect(output).to.include('> version');
    });
  });

  it('skips variables with empty names', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        requiredVariables: [{ id: '1', name: '' }],
      }));
      expect(output.includes('> \n'), 'Should not output empty variable').to.be.false;
    });
  });

  it('preserves order of variables', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        requiredVariables: [{ id: '1', name: 'first' }, { id: '2', name: 'second' }],
      }));
      expect(output.indexOf('second')).to.be.greaterThan(output.indexOf('first'));
    });
  });

  it('adds blank line after variable block', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        requiredVariables: [{ id: '1', name: 'v1' }],
      }));
      const lines = output.split('\n');
      const vIdx = lines.findIndex(l => l.startsWith('> v1'));
      expect(lines[vIdx + 1], 'Blank line after variables').to.equal('');
    });
  });

  it('skips block entirely when no variables', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state());
      const lines = output.split('\n');
      expect(lines.some(l => l.startsWith('>')), 'No > lines').to.be.false;
    });
  });
});

describe('Serializer — computed variables', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('outputs name = "expression" format', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: 'tplDir', expression: '${templatesDir}/stuff' }],
      }));
      expect(output).to.include('tplDir = "${templatesDir}/stuff"');
    });
  });

  it('skips computed variables with empty names', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: '', expression: 'foo' }],
      }));
      expect(output.includes(' = "foo"'), 'Should not output nameless variable').to.be.false;
    });
  });

  it('skips computed variables with empty expressions', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: 'myVar', expression: '' }],
      }));
      expect(output.includes('myVar ='), 'Should not output expressionless variable').to.be.false;
    });
  });

  it('adds blank line after computed variable block', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: 'a', expression: 'b' }],
      }));
      const lines = output.split('\n');
      const vIdx = lines.findIndex(l => l.startsWith('a = '));
      expect(lines[vIdx + 1], 'Blank line after computed vars').to.equal('');
    });
  });
});

describe('Serializer — expression escaping', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('escapes double quotes in expressions', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: 'msg', expression: 'say "hello"' }],
      }));
      expect(output).to.include('msg = "say \\"hello\\""');
    });
  });

  it('escapes backslashes in expressions', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: 'p', expression: 'a\\b' }],
      }));
      expect(output).to.include('p = "a\\\\b"');
    });
  });

  it('escapes newlines in expressions', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: 'ml', expression: 'line1\nline2' }],
      }));
      expect(output).to.include('ml = "line1\\nline2"');
    });
  });

  it('escapes tabs in expressions', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: 'tab', expression: 'a\tb' }],
      }));
      expect(output).to.include('tab = "a\\tb"');
    });
  });

  it('escapes carriage returns', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: 'cr', expression: 'a\rb' }],
      }));
      expect(output).to.include('cr = "a\\rb"');
    });
  });
});

describe('Serializer — CreateFile', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('serializes with one quoted arg', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'CreateFile', args: { path: 'src/Main.java' } }],
      }));
      expect(output).to.include('CreateFile("src/Main.java")');
    });
  });

  it('handles empty path', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'CreateFile', args: { path: '' } }],
      }));
      expect(output).to.include('CreateFile("")');
    });
  });

  it('handles undefined path (null safety)', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'CreateFile', args: {} }],
      }));
      expect(output).to.include('CreateFile("")');
    });
  });
});

describe('Serializer — CreateDirectory', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('serializes with path', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'CreateDirectory', args: { path: 'my/dir' } }],
      }));
      expect(output).to.include('CreateDirectory("my/dir")');
    });
  });
});

describe('Serializer — ReplaceFile', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('serializes with two args', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'ReplaceFile', args: { targetPath: 'a.txt', templatePath: 'b.tpl' } }],
      }));
      expect(output).to.include('ReplaceFile("a.txt", "b.tpl")');
    });
  });
});

describe('Serializer — AppendToFile', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('serializes with two args', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'AppendToFile', args: { targetPath: 'a.txt', templatePath: 'b.tpl' } }],
      }));
      expect(output).to.include('AppendToFile("a.txt", "b.tpl")');
    });
  });
});

describe('Serializer — InsertAtAnchor', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('serializes with three args', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'InsertAtAnchor', args: { targetPath: 'f.java', templatePath: 't.tpl', anchor: '/* a */' } }],
      }));
      expect(output).to.include('InsertAtAnchor("f.java", "t.tpl", "/* a */")');
    });
  });
});

describe('Serializer — InsertAtAnchorInline', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('serializes with three args', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'InsertAtAnchorInline', args: { targetPath: 'f.java', inlineContent: 'code', anchor: '/* a */' } }],
      }));
      expect(output).to.include('InsertAtAnchorInline("f.java", "code", "/* a */")');
    });
  });

  it('escapes quotes in inline content', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'InsertAtAnchorInline', args: { targetPath: 'f', inlineContent: 'say "hi"', anchor: 'a' } }],
      }));
      expect(output).to.include('say \\"hi\\"');
    });
  });
});

describe('Serializer — InsertIntoJavaClass', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('serializes with two args', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'InsertIntoJavaClass', args: { targetPath: 'Foo.java', templatePath: 't.tpl' } }],
      }));
      expect(output).to.include('InsertIntoJavaClass("Foo.java", "t.tpl")');
    });
  });
});

describe('Serializer — InsertIntoJavaClassInline', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('serializes with two args', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'InsertIntoJavaClassInline', args: { targetPath: 'Foo.java', inlineContent: 'code' } }],
      }));
      expect(output).to.include('InsertIntoJavaClassInline("Foo.java", "code")');
    });
  });
});

describe('Serializer — unknown instruction type', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('outputs comment for unknown type', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'WeirdThing', args: { a: 'b' } }],
      }));
      expect(output).to.include('// Unknown: WeirdThing');
    });
  });
});

describe('Serializer — sections', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('serializes __SECTION__ as uppercased decorated comment', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: '__SECTION__', title: 'My Section' }],
      }));
      expect(output).to.include('MY SECTION');
      expect(output).to.include('// ====================');
    });
  });

  it('preserves multiple sections in order', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [
          { id: '1', type: '__SECTION__', title: 'First' },
          { id: '2', type: 'CreateFile', args: { path: 'a' } },
          { id: '3', type: '__SECTION__', title: 'Second' },
        ],
      }));
      expect(output.indexOf('SECOND')).to.be.greaterThan(output.indexOf('FIRST'));
    });
  });

  it('adds blank line before sections after instructions', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [
          { id: '1', type: 'CreateFile', args: { path: 'a' } },
          { id: '2', type: '__SECTION__', title: 'Next' },
          { id: '3', type: 'CreateFile', args: { path: 'b' } },
        ],
      }));
      const lines = output.split('\n');
      const sectionIdx = lines.findIndex(l => l.includes('NEXT'));
      expect(sectionIdx).to.be.greaterThan(0);
      expect(lines[sectionIdx - 1], 'Should have blank line before section').to.equal('');
    });
  });

  it('does not double-blank when section is first item', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: '__SECTION__', title: 'First' }],
      }));
      expect(output.includes('\n\n\n'), 'Should not have triple newlines').to.be.false;
    });
  });
});

describe('Serializer — blank line preservation', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('emits blank line before items with blankBefore', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [
          { id: '1', type: 'CreateFile', args: { path: 'a' } },
          { id: '2', type: 'CreateFile', args: { path: 'b' }, blankBefore: true },
        ],
      }));
      const lines = output.split('\n');
      const bIdx = lines.findIndex(l => l.includes('CreateFile("b")'));
      expect(bIdx).to.be.greaterThan(0);
      expect(lines[bIdx - 1], 'Should have blank line before item with blankBefore').to.equal('');
    });
  });

  it('does not emit blank line when blankBefore is absent', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [
          { id: '1', type: 'CreateFile', args: { path: 'a' } },
          { id: '2', type: 'CreateFile', args: { path: 'b' } },
        ],
      }));
      const lines = output.split('\n');
      const aIdx = lines.findIndex(l => l.includes('CreateFile("a")'));
      const bIdx = lines.findIndex(l => l.includes('CreateFile("b")'));
      expect(bIdx, 'Items should be consecutive without blank line').to.equal(aIdx + 1);
    });
  });

  it('does not produce double blanks when both blankBefore and section', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [
          { id: '1', type: 'CreateFile', args: { path: 'a' } },
          { id: '2', type: '__SECTION__', title: 'S', blankBefore: true },
        ],
      }));
      expect(output.includes('\n\n\n'), 'Should not have double blank lines').to.be.false;
    });
  });
});

describe('Serializer — raw lines', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('outputs __RAW__ items verbatim', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: '__RAW__', text: 'some garbage line' }],
      }));
      expect(output).to.include('some garbage line');
    });
  });

  it('outputs empty string for raw with no text', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: '__RAW__', text: '' }],
      }));
      expect(output).to.be.ok;
    });
  });

  it('outputs empty string for raw with undefined text', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: '__RAW__' }],
      }));
      expect(output).to.be.ok;
    });
  });
});

describe('Serializer — instruction arg escaping', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('preserves ${variable} references in args', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'CreateFile', args: { path: '${srcDir}/File.java' } }],
      }));
      expect(output).to.include('${srcDir}/File.java');
    });
  });

  it('escapes backslashes in instruction args', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'CreateFile', args: { path: 'a\\b' } }],
      }));
      expect(output).to.include('a\\\\b');
    });
  });

  it('escapes quotes in instruction args', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'CreateFile', args: { path: 'say "hi"' } }],
      }));
      expect(output).to.include('say \\"hi\\"');
    });
  });

  it('escapes newlines in instruction args', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'InsertAtAnchorInline', args: { targetPath: 'f', inlineContent: 'a\nb', anchor: 'x' } }],
      }));
      expect(output).to.include('a\\nb');
    });
  });
});

describe('Serializer — output format', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('ends with newline', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state());
      expect(output[output.length - 1]).to.equal('\n');
    });
  });

  it('blank line after task name', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state());
      const lines = output.split('\n');
      expect(lines[1]).to.equal('');
    });
  });

  it('serializes multiple instructions in order', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask(state({
        items: [
          { id: '1', type: 'CreateFile', args: { path: 'first' } },
          { id: '2', type: 'CreateFile', args: { path: 'second' } },
          { id: '3', type: 'CreateFile', args: { path: 'third' } },
        ],
      }));
      expect(output.indexOf('second')).to.be.greaterThan(output.indexOf('first'));
      expect(output.indexOf('third')).to.be.greaterThan(output.indexOf('second'));
    });
  });
});

describe('Serializer — full document', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('serializes a complete state into well-formed .task file', () => {
    cy.getTestModules().then(({ serializeTask }) => {
      const output = serializeTask({
        taskName: 'fullTest',
        requiredVariables: [{ id: '1', name: 'mod' }],
        computedVariables: [{ id: '1', name: 'dir', expression: '${mod}/src' }],
        items: [
          { id: '1', type: '__SECTION__', title: 'Setup' },
          { id: '2', type: 'CreateDirectory', args: { path: '${dir}' } },
          { id: '3', type: 'CreateFile', args: { path: '${dir}/build.gradle' } },
          { id: '4', type: 'ReplaceFile', args: { targetPath: '${dir}/build.gradle', templatePath: 'tpl/build.tpl' } },
        ],
      });
      expect(output).to.include('task: fullTest');
      expect(output).to.include('> mod');
      expect(output).to.include('dir = "${mod}/src"');
      expect(output).to.include('// ==================== SETUP ====================');
      expect(output).to.include('CreateDirectory("${dir}")');
      expect(output).to.include('CreateFile("${dir}/build.gradle")');
      expect(output).to.include('ReplaceFile("${dir}/build.gradle", "tpl/build.tpl")');
    });
  });
});

describe('Serializer — line map', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('returns text identical to serializeTask', () => {
    cy.getTestModules().then(({ serializeTask, serializeTaskWithLineMap }) => {
      const s = state({
        taskName: 'test',
        items: [
          { id: 'a', type: 'CreateFile', args: { path: 'f.txt' } },
        ],
      });
      const plain = serializeTask(s);
      const { text } = serializeTaskWithLineMap(s);
      expect(text).to.equal(plain);
    });
  });

  it('maps instruction lines to item IDs', () => {
    cy.getTestModules().then(({ serializeTaskWithLineMap }) => {
      const s = state({
        items: [
          { id: 'a', type: 'CreateFile', args: { path: 'a.txt' } },
          { id: 'b', type: 'CreateDirectory', args: { path: 'dir' } },
        ],
      });
      const { text, lineMap } = serializeTaskWithLineMap(s);
      const lines = text.split('\n');
      const aLine = lines.findIndex(l => l.includes('CreateFile'));
      const bLine = lines.findIndex(l => l.includes('CreateDirectory'));
      expect(lineMap.get(aLine)).to.equal('a');
      expect(lineMap.get(bLine)).to.equal('b');
    });
  });

  it('maps section headers to item IDs', () => {
    cy.getTestModules().then(({ serializeTaskWithLineMap }) => {
      const s = state({
        items: [
          { id: 's1', type: '__SECTION__', title: 'Setup' },
          { id: 'a', type: 'CreateFile', args: { path: 'f.txt' } },
        ],
      });
      const { text, lineMap } = serializeTaskWithLineMap(s);
      const lines = text.split('\n');
      const sLine = lines.findIndex(l => l.includes('SETUP'));
      expect(lineMap.get(sLine)).to.equal('s1');
    });
  });

  it('maps __RAW__ items to their IDs', () => {
    cy.getTestModules().then(({ serializeTaskWithLineMap }) => {
      const s = state({
        items: [
          { id: 'r1', type: '__RAW__', text: '# comment line' },
        ],
      });
      const { lineMap } = serializeTaskWithLineMap(s);
      const ids = Array.from(lineMap.values());
      expect(ids.includes('r1'), 'lineMap should include raw item ID').to.be.true;
    });
  });

  it('does not map blank or header lines', () => {
    cy.getTestModules().then(({ serializeTaskWithLineMap }) => {
      const s = state({
        taskName: 'test',
        requiredVariables: [{ id: 'v1', name: 'mod' }],
        items: [
          { id: 'a', type: 'CreateFile', args: { path: 'f.txt' } },
        ],
      });
      const { lineMap } = serializeTaskWithLineMap(s);
      expect(lineMap.get(0)).to.equal(undefined);
      expect(lineMap.get(1)).to.equal(undefined);
    });
  });
});
