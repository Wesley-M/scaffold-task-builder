// ─── Parser Tests (Cypress) ────────────────────────────────────────────

describe('Parser — task name basics', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('parses task name from "task:" line', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: myTask\n');
      expect(result.taskName).to.equal('myTask');
    });
  });

  it('returns empty task name when missing', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('CreateFile("foo.txt")\n');
      expect(result.taskName).to.equal('');
    });
  });

  it('trims whitespace from task name', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task:   spacedName  \n');
      expect(result.taskName).to.equal('spacedName');
    });
  });

  it('handles task name with hyphens and underscores', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: my-task_v2\n');
      expect(result.taskName).to.equal('my-task_v2');
    });
  });

  it('handles task name with no space after colon', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task:compact\n');
      expect(result.taskName).to.equal('compact');
    });
  });

  it('uses last task declaration if duplicated', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: first\ntask: second\n');
      expect(result.taskName).to.equal('second');
    });
  });

  it('does not confuse variable assignment with task line', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: myTask\ntaskDir = "some/path"\n');
      expect(result.taskName).to.equal('myTask');
      expect(result.computedVariables).to.have.length(1);
      expect(result.computedVariables[0].name).to.equal('taskDir');
    });
  });
});

describe('Parser — required variables', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('parses > variable declarations', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\n> moduleName\n> version\n');
      expect(result.requiredVariables).to.have.length(2);
      expect(result.requiredVariables[0].name).to.equal('moduleName');
      expect(result.requiredVariables[1].name).to.equal('version');
    });
  });

  it('strips inline comments from variable names via regex', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\n> myVar  // some comment\n');
      expect(result.requiredVariables).to.have.length(1);
      expect(result.requiredVariables[0].name).to.equal('myVar');
    });
  });

  it('assigns unique ids to each variable', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\n> a\n> b\n');
      expect(result.requiredVariables[0].id).to.be.ok;
      expect(result.requiredVariables[1].id).to.be.ok;
      expect(result.requiredVariables[0].id).to.not.equal(result.requiredVariables[1].id);
    });
  });

  it('handles leading spaces before >', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\n  > indented\n');
      expect(result.requiredVariables).to.have.length(1);
      expect(result.requiredVariables[0].name).to.equal('indented');
    });
  });

  it('handles single-char variable names', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\n> x\n');
      expect(result.requiredVariables[0].name).to.equal('x');
    });
  });

  it('handles underscored variable names', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\n> my_var_name\n');
      expect(result.requiredVariables[0].name).to.equal('my_var_name');
    });
  });

  it('parses many variables in sequence', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const vars = Array.from({ length: 10 }, (_, i) => `> var${i}`).join('\n');
      const result = parseTaskFile('task: t\n' + vars + '\n');
      expect(result.requiredVariables).to.have.length(10);
    });
  });
});

describe('Parser — computed variables basics', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('parses name = "expression" format', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\ntplDir = "${templatesDir}/stuff"\n');
      expect(result.computedVariables).to.have.length(1);
      expect(result.computedVariables[0].name).to.equal('tplDir');
      expect(result.computedVariables[0].expression).to.equal('${templatesDir}/stuff');
    });
  });

  it('handles unquoted expressions', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nfoo = bar/baz\n');
      expect(result.computedVariables).to.have.length(1);
      expect(result.computedVariables[0].name).to.equal('foo');
      expect(result.computedVariables[0].expression).to.equal('bar/baz');
    });
  });

  it('parses multiple computed variables', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\na = "x"\nb = "y"\nc = "z"\n');
      expect(result.computedVariables).to.have.length(3);
    });
  });

  it('assigns unique ids', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\na = "1"\nb = "2"\n');
      expect(result.computedVariables[0].id).to.not.equal(result.computedVariables[1].id);
    });
  });
});

describe('Parser — computed variable edge cases', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('strips single quotes from expression', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile("task: t\nfoo = 'hello'\n");
      expect(result.computedVariables[0].expression).to.equal('hello');
    });
  });

  it('preserves unmatched quotes (partial)', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nfoo = "no closing quote\n');
      expect(result.computedVariables).to.have.length(1);
    });
  });

  it('handles expression with multiple ${refs}', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\npath = "${a}/${b}/${c}"\n');
      expect(result.computedVariables[0].expression).to.equal('${a}/${b}/${c}');
    });
  });

  it('handles expression with spaces', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nmsg = "hello world"\n');
      expect(result.computedVariables[0].expression).to.equal('hello world');
    });
  });

  it('does not parse lines starting with instruction names as variables', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nCreateFile("test")\n');
      expect(result.computedVariables).to.have.length(0);
      expect(result.items).to.have.length(1);
    });
  });

  it('does not parse InsertAtAnchor-like names as variables', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nInsertAtAnchor("a", "b", "c")\n');
      expect(result.computedVariables).to.have.length(0);
    });
  });
});

describe('Parser — CreateFile', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('parses CreateFile with one arg', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nCreateFile("path/to/file.java")\n');
      expect(result.items).to.have.length(1);
      expect(result.items[0].type).to.equal('CreateFile');
      expect(result.items[0].args.path).to.equal('path/to/file.java');
    });
  });

  it('preserves ${variable} references', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nCreateFile("${srcDir}/Main.java")\n');
      expect(result.items[0].args.path).to.equal('${srcDir}/Main.java');
    });
  });

  it('sets collapsed to false', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nCreateFile("a")\n');
      expect(result.items[0].collapsed).to.equal(false);
    });
  });

  it('assigns a unique id', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nCreateFile("a")\n');
      expect(result.items[0].id).to.be.ok;
    });
  });
});

describe('Parser — CreateDirectory', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('parses CreateDirectory with one arg', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nCreateDirectory("my/dir")\n');
      expect(result.items[0].type).to.equal('CreateDirectory');
      expect(result.items[0].args.path).to.equal('my/dir');
    });
  });
});

describe('Parser — ReplaceFile', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('parses ReplaceFile with two args', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nReplaceFile("target.txt", "template.tpl")\n');
      expect(result.items[0].type).to.equal('ReplaceFile');
      expect(result.items[0].args.targetPath).to.equal('target.txt');
      expect(result.items[0].args.templatePath).to.equal('template.tpl');
    });
  });

  it('handles missing second arg gracefully', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nReplaceFile("target.txt")\n');
      expect(result.items[0].type).to.equal('ReplaceFile');
      expect(result.items[0].args.targetPath).to.equal('target.txt');
      expect(result.items[0].args.templatePath).to.equal('');
    });
  });
});

describe('Parser — AppendToFile', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('parses AppendToFile with two args', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nAppendToFile("target.txt", "template.tpl")\n');
      expect(result.items[0].type).to.equal('AppendToFile');
      expect(result.items[0].args.targetPath).to.equal('target.txt');
      expect(result.items[0].args.templatePath).to.equal('template.tpl');
    });
  });
});

describe('Parser — InsertAtAnchor', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('parses InsertAtAnchor with three args', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nInsertAtAnchor("file.java", "template.tpl", "/* anchor */")\n');
      expect(result.items[0].type).to.equal('InsertAtAnchor');
      expect(result.items[0].args.targetPath).to.equal('file.java');
      expect(result.items[0].args.templatePath).to.equal('template.tpl');
      expect(result.items[0].args.anchor).to.equal('/* anchor */');
    });
  });
});

describe('Parser — InsertAtAnchorInline', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('parses InsertAtAnchorInline with three args', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nInsertAtAnchorInline("file.java", "content here", "/* anchor */")\n');
      expect(result.items[0].type).to.equal('InsertAtAnchorInline');
      expect(result.items[0].args.targetPath).to.equal('file.java');
      expect(result.items[0].args.inlineContent).to.equal('content here');
      expect(result.items[0].args.anchor).to.equal('/* anchor */');
    });
  });
});

describe('Parser — InsertIntoJavaClass', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('parses InsertIntoJavaClass with two args', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nInsertIntoJavaClass("Foo.java", "template.tpl")\n');
      expect(result.items[0].type).to.equal('InsertIntoJavaClass');
      expect(result.items[0].args.targetPath).to.equal('Foo.java');
      expect(result.items[0].args.templatePath).to.equal('template.tpl');
    });
  });
});

describe('Parser — InsertIntoJavaClassInline', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('parses InsertIntoJavaClassInline with two args', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nInsertIntoJavaClassInline("Foo.java", "code here")\n');
      expect(result.items[0].type).to.equal('InsertIntoJavaClassInline');
      expect(result.items[0].args.targetPath).to.equal('Foo.java');
      expect(result.items[0].args.inlineContent).to.equal('code here');
    });
  });
});

describe('Parser — instruction ordering', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('parses multiple instructions in order', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const text = 'task: t\nCreateFile("a")\nCreateFile("b")\nCreateFile("c")\n';
      const result = parseTaskFile(text);
      expect(result.items).to.have.length(3);
      expect(result.items[0].args.path).to.equal('a');
      expect(result.items[1].args.path).to.equal('b');
      expect(result.items[2].args.path).to.equal('c');
    });
  });

  it('preserves mixed instruction types in order', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const text = 'task: t\nCreateDirectory("d")\nCreateFile("f")\nReplaceFile("f", "t.tpl")\n';
      const result = parseTaskFile(text);
      expect(result.items[0].type).to.equal('CreateDirectory');
      expect(result.items[1].type).to.equal('CreateFile');
      expect(result.items[2].type).to.equal('ReplaceFile');
    });
  });
});

describe('Parser — argument parsing', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('handles escaped quotes in arguments', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nInsertAtAnchorInline("file", "He said \\"hi\\"", "/* a */")\n');
      expect(result.items[0].args.inlineContent).to.equal('He said "hi"');
    });
  });

  it('handles escaped backslashes', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nCreateFile("path\\\\to\\\\file")\n');
      expect(result.items[0].args.path).to.equal('path\\to\\file');
    });
  });

  it('handles escaped newlines in content', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nInsertAtAnchorInline("f", "line1\\nline2", "/* a */")\n');
      expect(result.items[0].args.inlineContent).to.equal('line1\nline2');
    });
  });

  it('handles escaped tabs', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nInsertAtAnchorInline("f", "col1\\tcol2", "/* a */")\n');
      expect(result.items[0].args.inlineContent).to.equal('col1\tcol2');
    });
  });

  it('handles empty quoted args', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nReplaceFile("", "")\n');
      expect(result.items[0].args.targetPath).to.equal('');
      expect(result.items[0].args.templatePath).to.equal('');
    });
  });

  it('handles single-quoted args', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile("task: t\nCreateFile('my/file.txt')\n");
      expect(result.items[0].args.path).to.equal('my/file.txt');
    });
  });

  it('handles args with commas inside quotes', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nInsertAtAnchorInline("f", "a, b, c", "/* x */")\n');
      expect(result.items[0].args.inlineContent).to.equal('a, b, c');
    });
  });

  it('trims whitespace around args', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nReplaceFile( "a.txt" , "b.tpl" )\n');
      expect(result.items[0].args.targetPath).to.equal('a.txt');
      expect(result.items[0].args.templatePath).to.equal('b.tpl');
    });
  });
});

describe('Parser — multiline instructions', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('joins instruction split across two lines', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nInsertAtAnchorInline("file.java",\n  "content", "/* anchor */")\n');
      expect(result.items).to.have.length(1);
      expect(result.items[0].type).to.equal('InsertAtAnchorInline');
      expect(result.items[0].args.targetPath).to.equal('file.java');
    });
  });

  it('joins instruction split across three lines', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const text = 'task: t\nInsertAtAnchor(\n  "file.java",\n  "tpl.tpl",\n  "/* anchor */")\n';
      const result = parseTaskFile(text);
      expect(result.items).to.have.length(1);
      expect(result.items[0].type).to.equal('InsertAtAnchor');
    });
  });

  it('strips trailing comment on multiline instruction', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const text = 'task: t\nReplaceFile("a",\n  "b") // comment here\n';
      const result = parseTaskFile(text);
      expect(result.items).to.have.length(1);
      expect(result.items[0].type).to.equal('ReplaceFile');
    });
  });

  it('falls back to __RAW__ for unparseable multiline', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const text = 'task: t\nWeirdThing(\n  broken stuff)\n';
      const result = parseTaskFile(text);
      const raw = result.items.find(i => i.type === '__RAW__');
      expect(!!raw, 'Should produce a raw item').to.be.true;
    });
  });
});

describe('Parser — section detection', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('parses // ====== TITLE ====== as section', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\n// ==================== My Section ====================\nCreateFile("a")\n');
      expect(result.items).to.have.length(2);
      expect(result.items[0].type).to.equal('__SECTION__');
      expect(result.items[0].title).to.equal('My Section');
    });
  });

  it('parses shorter ====== sections', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\n// ====== Build Files ======\nCreateFile("a")\n');
      expect(result.items).to.have.length(2);
      expect(result.items[0].type).to.equal('__SECTION__');
      expect(result.items[0].title).to.equal('Build Files');
    });
  });

  it('strips equals signs from section title', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\n// ===== Config =====\nCreateFile("a")\n');
      const section = result.items.find(i => i.type === '__SECTION__');
      expect(!!section).to.be.true;
      expect(section.title).to.equal('Config');
    });
  });

  it('section is emitted before next instruction', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const text = 'task: t\n// ====== Section ======\nCreateFile("a")\nCreateFile("b")\n';
      const result = parseTaskFile(text);
      expect(result.items[0].type).to.equal('__SECTION__');
      expect(result.items[1].type).to.equal('CreateFile');
    });
  });

  it('emits trailing section at end of file', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\n// ====== Trailing ======\n');
      expect(result.items).to.have.length(1);
      expect(result.items[0].type).to.equal('__SECTION__');
      expect(result.items[0].title).to.equal('Trailing');
    });
  });

  it('assigns unique id to sections', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\n// ====== A ======\nCreateFile("x")\n// ====== B ======\nCreateFile("y")\n');
      const sections = result.items.filter(i => i.type === '__SECTION__');
      expect(sections).to.have.length(2);
      expect(sections[0].id).to.not.equal(sections[1].id);
    });
  });

  it('multiple sections interleave with instructions', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const text = [
        'task: t',
        '// ====== S1 ======',
        'CreateFile("a")',
        '// ====== S2 ======',
        'CreateFile("b")',
        '',
      ].join('\n');
      const result = parseTaskFile(text);
      expect(result.items[0].type).to.equal('__SECTION__');
      expect(result.items[0].title).to.equal('S1');
      expect(result.items[1].type).to.equal('CreateFile');
      expect(result.items[2].type).to.equal('__SECTION__');
      expect(result.items[2].title).to.equal('S2');
      expect(result.items[3].type).to.equal('CreateFile');
    });
  });
});

describe('Parser — comment handling', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('discards plain comments (no ====)', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\n// just a comment\nCreateFile("a")\n');
      expect(result.items).to.have.length(1);
      expect(result.items[0].type).to.equal('CreateFile');
    });
  });

  it('discards multiple comment lines', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\n// comment 1\n// comment 2\nCreateFile("a")\n');
      expect(result.items).to.have.length(1);
    });
  });

  it('discards empty comment lines', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\n//\nCreateFile("a")\n');
      expect(result.items).to.have.length(1);
    });
  });

  it('strips trailing // comment from single-line instructions', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nCreateFile("a.txt") // create the file\n');
      expect(result.items[0].type).to.equal('CreateFile');
      expect(result.items[0].args.path).to.equal('a.txt');
    });
  });
});

describe('Parser — raw / unrecognized lines', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('preserves unrecognized lines as __RAW__', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nthis is not valid\n');
      expect(result.items).to.have.length(1);
      expect(result.items[0].type).to.equal('__RAW__');
      expect(result.items[0].text).to.equal('this is not valid');
    });
  });

  it('preserves unknown instruction types as __RAW__', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nFooBarBaz("something")\n');
      expect(result.items).to.have.length(1);
      expect(result.items[0].type).to.equal('__RAW__');
    });
  });

  it('assigns id to raw items', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\ngarbage\n');
      expect(result.items[0].id).to.be.ok;
    });
  });

  it('raw item has text property', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\nmy raw text\n');
      expect(result.items[0].text).to.equal('my raw text');
    });
  });

  it('section before raw is still emitted', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\n// ====== S ======\ngarbage\n');
      expect(result.items[0].type).to.equal('__SECTION__');
      expect(result.items[1].type).to.equal('__RAW__');
    });
  });
});

describe('Parser — empty and whitespace edge cases', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('handles empty string', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('');
      expect(result.taskName).to.equal('');
      expect(result.requiredVariables).to.have.length(0);
      expect(result.computedVariables).to.have.length(0);
      expect(result.items).to.have.length(0);
    });
  });

  it('handles only whitespace', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('   \n\n   \n');
      expect(result.taskName).to.equal('');
      expect(result.items).to.have.length(0);
    });
  });

  it('handles task name only', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: onlyName\n');
      expect(result.taskName).to.equal('onlyName');
      expect(result.items).to.have.length(0);
    });
  });

  it('skips blank lines between items', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('task: t\n\n> v\n\nCreateFile("a")\n\n');
      expect(result.requiredVariables).to.have.length(1);
      expect(result.items).to.have.length(1);
    });
  });

  it('handles indented lines', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('  task: t\n  > v\n  CreateFile("a")\n');
      expect(result.taskName).to.equal('t');
      expect(result.requiredVariables).to.have.length(1);
      expect(result.items).to.have.length(1);
    });
  });

  it('returns all four keys in result object', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const result = parseTaskFile('');
      expect('taskName' in result).to.be.true;
      expect('requiredVariables' in result).to.be.true;
      expect('computedVariables' in result).to.be.true;
      expect('items' in result).to.be.true;
    });
  });
});

describe('Parser — full document', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('parses a complete realistic task file', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const text = [
        'task: newIntegration',
        '',
        '> adapterType',
        '> moduleName',
        '',
        'tplDir = "${templatesDir}/new-integration"',
        'srcDir = "${moduleName}/src/main/java"',
        '',
        '// ==================== Directories ====================',
        'CreateDirectory("${srcDir}")',
        '',
        '// ==================== Config ====================',
        'CreateFile("${moduleName}/build.gradle")',
        'ReplaceFile("${moduleName}/build.gradle", "${tplDir}/build.tpl")',
        '',
        '// ==================== Registration ====================',
        'InsertAtAnchorInline("settings.gradle", "include \'${moduleName}\'", "/* <scaffold-anchor> */")',
        '',
      ].join('\n');

      const result = parseTaskFile(text);
      expect(result.taskName).to.equal('newIntegration');
      expect(result.requiredVariables).to.have.length(2);
      expect(result.computedVariables).to.have.length(2);

      const sections = result.items.filter(i => i.type === '__SECTION__');
      expect(sections).to.have.length(3);

      const instructions = result.items.filter(i => !i.type.startsWith('__'));
      expect(instructions).to.have.length(4);
    });
  });

  it('preserves element ordering across types', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const text = [
        'task: t',
        '> v1',
        '> v2',
        'c1 = "x"',
        '// ====== S ======',
        'CreateFile("a")',
        'ReplaceFile("a", "b")',
        'random garbage',
        '',
      ].join('\n');

      const result = parseTaskFile(text);
      expect(result.requiredVariables).to.have.length(2);
      expect(result.computedVariables).to.have.length(1);
      expect(result.items[0].type).to.equal('__SECTION__');
      expect(result.items[1].type).to.equal('CreateFile');
      expect(result.items[2].type).to.equal('ReplaceFile');
      expect(result.items[3].type).to.equal('__RAW__');
    });
  });
});

describe('Parser — blank line preservation', () => {
  beforeEach(() => {
    cy.loadTestModules();
  });

  it('sets blankBefore on items after blank lines in instruction area', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const text = 'task: t\nCreateFile("a")\n\nCreateFile("b")\n';
      const result = parseTaskFile(text);
      expect(result.items).to.have.length(2);
      expect(!!result.items[0].blankBefore, 'First item should not have blankBefore').to.be.false;
      expect(!!result.items[1].blankBefore, 'Second item should have blankBefore').to.be.true;
    });
  });

  it('does not set blankBefore for blank lines in header area', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const text = 'task: t\n\n> v1\n\nCreateFile("a")\n';
      const result = parseTaskFile(text);
      expect(!!result.items[0].blankBefore, 'First instruction should not have blankBefore from header blanks').to.be.false;
    });
  });

  it('sets blankBefore on sections after blank lines', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const text = 'task: t\nCreateFile("a")\n\n// ====== Section ======\nCreateFile("b")\n';
      const result = parseTaskFile(text);
      const section = result.items.find(i => i.type === '__SECTION__');
      expect(!!section.blankBefore, 'Section after blank line should have blankBefore').to.be.true;
    });
  });

  it('collapses multiple blank lines into one blankBefore', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const text = 'task: t\nCreateFile("a")\n\n\n\nCreateFile("b")\n';
      const result = parseTaskFile(text);
      expect(result.items).to.have.length(2);
      expect(!!result.items[1].blankBefore, 'Should have blankBefore').to.be.true;
    });
  });

  it('preserves blankBefore on raw items', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const text = 'task: t\nCreateFile("a")\n\nsome unknown line\n';
      const result = parseTaskFile(text);
      expect(result.items).to.have.length(2);
      expect(!!result.items[1].blankBefore, 'Raw item should have blankBefore').to.be.true;
    });
  });

  it('no blankBefore when instructions are consecutive', () => {
    cy.getTestModules().then(({ parseTaskFile }) => {
      const text = 'task: t\nCreateFile("a")\nCreateFile("b")\nCreateFile("c")\n';
      const result = parseTaskFile(text);
      expect(result.items).to.have.length(3);
      for (const item of result.items) {
        expect(!!item.blankBefore, `${item.type} should not have blankBefore`).to.be.false;
      }
    });
  });
});
