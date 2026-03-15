// ─── Parser Tests ────────────────────────────────────────────────

import { describe, it, assert } from './framework.js';
import { parseTaskFile } from '../js/lib/parser.js';

export default function parserTests() {

  // ═══════════════════════════════════════════════════════════════
  // TASK NAME
  // ═══════════════════════════════════════════════════════════════

  describe('Parser — task name basics', () => {
    it('parses task name from "task:" line', () => {
      const result = parseTaskFile('task: myTask\n');
      assert.equal(result.taskName, 'myTask');
    });

    it('returns empty task name when missing', () => {
      const result = parseTaskFile('CreateFile("foo.txt")\n');
      assert.equal(result.taskName, '');
    });

    it('trims whitespace from task name', () => {
      const result = parseTaskFile('task:   spacedName  \n');
      assert.equal(result.taskName, 'spacedName');
    });

    it('handles task name with hyphens and underscores', () => {
      const result = parseTaskFile('task: my-task_v2\n');
      assert.equal(result.taskName, 'my-task_v2');
    });

    it('handles task name with no space after colon', () => {
      const result = parseTaskFile('task:compact\n');
      assert.equal(result.taskName, 'compact');
    });

    it('uses last task declaration if duplicated', () => {
      const result = parseTaskFile('task: first\ntask: second\n');
      assert.equal(result.taskName, 'second');
    });

    it('does not confuse variable assignment with task line', () => {
      const result = parseTaskFile('task: myTask\ntaskDir = "some/path"\n');
      assert.equal(result.taskName, 'myTask');
      assert.lengthOf(result.computedVariables, 1);
      assert.equal(result.computedVariables[0].name, 'taskDir');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // REQUIRED VARIABLES
  // ═══════════════════════════════════════════════════════════════

  describe('Parser — required variables', () => {
    it('parses > variable declarations', () => {
      const result = parseTaskFile('task: t\n> moduleName\n> version\n');
      assert.lengthOf(result.requiredVariables, 2);
      assert.equal(result.requiredVariables[0].name, 'moduleName');
      assert.equal(result.requiredVariables[1].name, 'version');
    });

    it('strips inline comments from variable names via regex', () => {
      const result = parseTaskFile('task: t\n> myVar  // some comment\n');
      assert.lengthOf(result.requiredVariables, 1);
      assert.equal(result.requiredVariables[0].name, 'myVar');
    });

    it('assigns unique ids to each variable', () => {
      const result = parseTaskFile('task: t\n> a\n> b\n');
      assert.truthy(result.requiredVariables[0].id);
      assert.truthy(result.requiredVariables[1].id);
      assert(result.requiredVariables[0].id !== result.requiredVariables[1].id, 'IDs should be unique');
    });

    it('handles leading spaces before >', () => {
      const result = parseTaskFile('task: t\n  > indented\n');
      assert.lengthOf(result.requiredVariables, 1);
      assert.equal(result.requiredVariables[0].name, 'indented');
    });

    it('handles single-char variable names', () => {
      const result = parseTaskFile('task: t\n> x\n');
      assert.equal(result.requiredVariables[0].name, 'x');
    });

    it('handles underscored variable names', () => {
      const result = parseTaskFile('task: t\n> my_var_name\n');
      assert.equal(result.requiredVariables[0].name, 'my_var_name');
    });

    it('parses many variables in sequence', () => {
      const vars = Array.from({ length: 10 }, (_, i) => `> var${i}`).join('\n');
      const result = parseTaskFile('task: t\n' + vars + '\n');
      assert.lengthOf(result.requiredVariables, 10);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // COMPUTED VARIABLES
  // ═══════════════════════════════════════════════════════════════

  describe('Parser — computed variables basics', () => {
    it('parses name = "expression" format', () => {
      const result = parseTaskFile('task: t\ntplDir = "${templatesDir}/stuff"\n');
      assert.lengthOf(result.computedVariables, 1);
      assert.equal(result.computedVariables[0].name, 'tplDir');
      assert.equal(result.computedVariables[0].expression, '${templatesDir}/stuff');
    });

    it('handles unquoted expressions', () => {
      const result = parseTaskFile('task: t\nfoo = bar/baz\n');
      assert.lengthOf(result.computedVariables, 1);
      assert.equal(result.computedVariables[0].name, 'foo');
      assert.equal(result.computedVariables[0].expression, 'bar/baz');
    });

    it('parses multiple computed variables', () => {
      const result = parseTaskFile('task: t\na = "x"\nb = "y"\nc = "z"\n');
      assert.lengthOf(result.computedVariables, 3);
    });

    it('assigns unique ids', () => {
      const result = parseTaskFile('task: t\na = "1"\nb = "2"\n');
      assert(result.computedVariables[0].id !== result.computedVariables[1].id, 'Unique ids');
    });
  });

  describe('Parser — computed variable edge cases', () => {
    it('strips single quotes from expression', () => {
      const result = parseTaskFile("task: t\nfoo = 'hello'\n");
      assert.equal(result.computedVariables[0].expression, 'hello');
    });

    it('preserves unmatched quotes (partial)', () => {
      const result = parseTaskFile('task: t\nfoo = "no closing quote\n');
      // The regex .+ captures everything, quote stripping checks both ends
      assert.lengthOf(result.computedVariables, 1);
    });

    it('handles expression with multiple ${refs}', () => {
      const result = parseTaskFile('task: t\npath = "${a}/${b}/${c}"\n');
      assert.equal(result.computedVariables[0].expression, '${a}/${b}/${c}');
    });

    it('handles expression with spaces', () => {
      const result = parseTaskFile('task: t\nmsg = "hello world"\n');
      assert.equal(result.computedVariables[0].expression, 'hello world');
    });

    it('does not parse lines starting with instruction names as variables', () => {
      const result = parseTaskFile('task: t\nCreateFile("test")\n');
      assert.lengthOf(result.computedVariables, 0);
      assert.lengthOf(result.items, 1);
    });

    it('does not parse InsertAtAnchor-like names as variables', () => {
      const result = parseTaskFile('task: t\nInsertAtAnchor("a", "b", "c")\n');
      assert.lengthOf(result.computedVariables, 0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // INSTRUCTIONS — ALL TYPES
  // ═══════════════════════════════════════════════════════════════

  describe('Parser — CreateFile', () => {
    it('parses CreateFile with one arg', () => {
      const result = parseTaskFile('task: t\nCreateFile("path/to/file.java")\n');
      assert.lengthOf(result.items, 1);
      assert.equal(result.items[0].type, 'CreateFile');
      assert.equal(result.items[0].args.path, 'path/to/file.java');
    });

    it('preserves ${variable} references', () => {
      const result = parseTaskFile('task: t\nCreateFile("${srcDir}/Main.java")\n');
      assert.equal(result.items[0].args.path, '${srcDir}/Main.java');
    });

    it('sets collapsed to false', () => {
      const result = parseTaskFile('task: t\nCreateFile("a")\n');
      assert.equal(result.items[0].collapsed, false);
    });

    it('assigns a unique id', () => {
      const result = parseTaskFile('task: t\nCreateFile("a")\n');
      assert.truthy(result.items[0].id);
    });
  });

  describe('Parser — CreateDirectory', () => {
    it('parses CreateDirectory with one arg', () => {
      const result = parseTaskFile('task: t\nCreateDirectory("my/dir")\n');
      assert.equal(result.items[0].type, 'CreateDirectory');
      assert.equal(result.items[0].args.path, 'my/dir');
    });
  });

  describe('Parser — ReplaceFile', () => {
    it('parses ReplaceFile with two args', () => {
      const result = parseTaskFile('task: t\nReplaceFile("target.txt", "template.tpl")\n');
      assert.equal(result.items[0].type, 'ReplaceFile');
      assert.equal(result.items[0].args.targetPath, 'target.txt');
      assert.equal(result.items[0].args.templatePath, 'template.tpl');
    });

    it('handles missing second arg gracefully', () => {
      const result = parseTaskFile('task: t\nReplaceFile("target.txt")\n');
      assert.equal(result.items[0].type, 'ReplaceFile');
      assert.equal(result.items[0].args.targetPath, 'target.txt');
      assert.equal(result.items[0].args.templatePath, '');
    });
  });

  describe('Parser — AppendToFile', () => {
    it('parses AppendToFile with two args', () => {
      const result = parseTaskFile('task: t\nAppendToFile("target.txt", "template.tpl")\n');
      assert.equal(result.items[0].type, 'AppendToFile');
      assert.equal(result.items[0].args.targetPath, 'target.txt');
      assert.equal(result.items[0].args.templatePath, 'template.tpl');
    });
  });

  describe('Parser — InsertAtAnchor', () => {
    it('parses InsertAtAnchor with three args', () => {
      const result = parseTaskFile('task: t\nInsertAtAnchor("file.java", "template.tpl", "/* anchor */")\n');
      assert.equal(result.items[0].type, 'InsertAtAnchor');
      assert.equal(result.items[0].args.targetPath, 'file.java');
      assert.equal(result.items[0].args.templatePath, 'template.tpl');
      assert.equal(result.items[0].args.anchor, '/* anchor */');
    });
  });

  describe('Parser — InsertAtAnchorInline', () => {
    it('parses InsertAtAnchorInline with three args', () => {
      const result = parseTaskFile('task: t\nInsertAtAnchorInline("file.java", "content here", "/* anchor */")\n');
      assert.equal(result.items[0].type, 'InsertAtAnchorInline');
      assert.equal(result.items[0].args.targetPath, 'file.java');
      assert.equal(result.items[0].args.inlineContent, 'content here');
      assert.equal(result.items[0].args.anchor, '/* anchor */');
    });
  });

  describe('Parser — InsertIntoJavaClass', () => {
    it('parses InsertIntoJavaClass with two args', () => {
      const result = parseTaskFile('task: t\nInsertIntoJavaClass("Foo.java", "template.tpl")\n');
      assert.equal(result.items[0].type, 'InsertIntoJavaClass');
      assert.equal(result.items[0].args.targetPath, 'Foo.java');
      assert.equal(result.items[0].args.templatePath, 'template.tpl');
    });
  });

  describe('Parser — InsertIntoJavaClassInline', () => {
    it('parses InsertIntoJavaClassInline with two args', () => {
      const result = parseTaskFile('task: t\nInsertIntoJavaClassInline("Foo.java", "code here")\n');
      assert.equal(result.items[0].type, 'InsertIntoJavaClassInline');
      assert.equal(result.items[0].args.targetPath, 'Foo.java');
      assert.equal(result.items[0].args.inlineContent, 'code here');
    });
  });

  describe('Parser — instruction ordering', () => {
    it('parses multiple instructions in order', () => {
      const text = 'task: t\nCreateFile("a")\nCreateFile("b")\nCreateFile("c")\n';
      const result = parseTaskFile(text);
      assert.lengthOf(result.items, 3);
      assert.equal(result.items[0].args.path, 'a');
      assert.equal(result.items[1].args.path, 'b');
      assert.equal(result.items[2].args.path, 'c');
    });

    it('preserves mixed instruction types in order', () => {
      const text = 'task: t\nCreateDirectory("d")\nCreateFile("f")\nReplaceFile("f", "t.tpl")\n';
      const result = parseTaskFile(text);
      assert.equal(result.items[0].type, 'CreateDirectory');
      assert.equal(result.items[1].type, 'CreateFile');
      assert.equal(result.items[2].type, 'ReplaceFile');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ARGUMENT PARSING
  // ═══════════════════════════════════════════════════════════════

  describe('Parser — argument parsing', () => {
    it('handles escaped quotes in arguments', () => {
      const result = parseTaskFile('task: t\nInsertAtAnchorInline("file", "He said \\"hi\\"", "/* a */")\n');
      assert.equal(result.items[0].args.inlineContent, 'He said "hi"');
    });

    it('handles escaped backslashes', () => {
      const result = parseTaskFile('task: t\nCreateFile("path\\\\to\\\\file")\n');
      assert.equal(result.items[0].args.path, 'path\\to\\file');
    });

    it('handles escaped newlines in content', () => {
      const result = parseTaskFile('task: t\nInsertAtAnchorInline("f", "line1\\nline2", "/* a */")\n');
      assert.equal(result.items[0].args.inlineContent, 'line1\nline2');
    });

    it('handles escaped tabs', () => {
      const result = parseTaskFile('task: t\nInsertAtAnchorInline("f", "col1\\tcol2", "/* a */")\n');
      assert.equal(result.items[0].args.inlineContent, 'col1\tcol2');
    });

    it('handles empty quoted args', () => {
      const result = parseTaskFile('task: t\nReplaceFile("", "")\n');
      assert.equal(result.items[0].args.targetPath, '');
      assert.equal(result.items[0].args.templatePath, '');
    });

    it('handles single-quoted args', () => {
      const result = parseTaskFile("task: t\nCreateFile('my/file.txt')\n");
      assert.equal(result.items[0].args.path, 'my/file.txt');
    });

    it('handles args with commas inside quotes', () => {
      const result = parseTaskFile('task: t\nInsertAtAnchorInline("f", "a, b, c", "/* x */")\n');
      assert.equal(result.items[0].args.inlineContent, 'a, b, c');
    });

    it('trims whitespace around args', () => {
      const result = parseTaskFile('task: t\nReplaceFile( "a.txt" , "b.tpl" )\n');
      assert.equal(result.items[0].args.targetPath, 'a.txt');
      assert.equal(result.items[0].args.templatePath, 'b.tpl');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // MULTILINE INSTRUCTIONS
  // ═══════════════════════════════════════════════════════════════

  describe('Parser — multiline instructions', () => {
    it('joins instruction split across two lines', () => {
      const result = parseTaskFile('task: t\nInsertAtAnchorInline("file.java",\n  "content", "/* anchor */")\n');
      assert.lengthOf(result.items, 1);
      assert.equal(result.items[0].type, 'InsertAtAnchorInline');
      assert.equal(result.items[0].args.targetPath, 'file.java');
    });

    it('joins instruction split across three lines', () => {
      const text = 'task: t\nInsertAtAnchor(\n  "file.java",\n  "tpl.tpl",\n  "/* anchor */")\n';
      const result = parseTaskFile(text);
      assert.lengthOf(result.items, 1);
      assert.equal(result.items[0].type, 'InsertAtAnchor');
    });

    it('strips trailing comment on multiline instruction', () => {
      const text = 'task: t\nReplaceFile("a",\n  "b") // comment here\n';
      const result = parseTaskFile(text);
      assert.lengthOf(result.items, 1);
      assert.equal(result.items[0].type, 'ReplaceFile');
    });

    it('falls back to __RAW__ for unparseable multiline', () => {
      const text = 'task: t\nWeirdThing(\n  broken stuff)\n';
      const result = parseTaskFile(text);
      const raw = result.items.find(i => i.type === '__RAW__');
      assert.truthy(raw, 'Should produce a raw item');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTIONS
  // ═══════════════════════════════════════════════════════════════

  describe('Parser — section detection', () => {
    it('parses // ====== TITLE ====== as section', () => {
      const result = parseTaskFile('task: t\n// ==================== My Section ====================\nCreateFile("a")\n');
      assert.lengthOf(result.items, 2);
      assert.equal(result.items[0].type, '__SECTION__');
      assert.equal(result.items[0].title, 'My Section');
    });

    it('parses shorter ====== sections', () => {
      const result = parseTaskFile('task: t\n// ====== Build Files ======\nCreateFile("a")\n');
      assert.lengthOf(result.items, 2);
      assert.equal(result.items[0].type, '__SECTION__');
      assert.equal(result.items[0].title, 'Build Files');
    });

    it('strips equals signs from section title', () => {
      const result = parseTaskFile('task: t\n// ===== Config =====\nCreateFile("a")\n');
      const section = result.items.find(i => i.type === '__SECTION__');
      assert.truthy(section);
      assert.equal(section.title, 'Config');
    });

    it('section is emitted before next instruction', () => {
      const text = 'task: t\n// ====== Section ======\nCreateFile("a")\nCreateFile("b")\n';
      const result = parseTaskFile(text);
      assert.equal(result.items[0].type, '__SECTION__');
      assert.equal(result.items[1].type, 'CreateFile');
    });

    it('emits trailing section at end of file', () => {
      const result = parseTaskFile('task: t\n// ====== Trailing ======\n');
      assert.lengthOf(result.items, 1);
      assert.equal(result.items[0].type, '__SECTION__');
      assert.equal(result.items[0].title, 'Trailing');
    });

    it('assigns unique id to sections', () => {
      const result = parseTaskFile('task: t\n// ====== A ======\nCreateFile("x")\n// ====== B ======\nCreateFile("y")\n');
      const sections = result.items.filter(i => i.type === '__SECTION__');
      assert.lengthOf(sections, 2);
      assert(sections[0].id !== sections[1].id, 'Section IDs should differ');
    });

    it('multiple sections interleave with instructions', () => {
      const text = [
        'task: t',
        '// ====== S1 ======',
        'CreateFile("a")',
        '// ====== S2 ======',
        'CreateFile("b")',
        '',
      ].join('\n');
      const result = parseTaskFile(text);
      assert.equal(result.items[0].type, '__SECTION__');
      assert.equal(result.items[0].title, 'S1');
      assert.equal(result.items[1].type, 'CreateFile');
      assert.equal(result.items[2].type, '__SECTION__');
      assert.equal(result.items[2].title, 'S2');
      assert.equal(result.items[3].type, 'CreateFile');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // COMMENTS
  // ═══════════════════════════════════════════════════════════════

  describe('Parser — comment handling', () => {
    it('discards plain comments (no ====)', () => {
      const result = parseTaskFile('task: t\n// just a comment\nCreateFile("a")\n');
      assert.lengthOf(result.items, 1);
      assert.equal(result.items[0].type, 'CreateFile');
    });

    it('discards multiple comment lines', () => {
      const result = parseTaskFile('task: t\n// comment 1\n// comment 2\nCreateFile("a")\n');
      assert.lengthOf(result.items, 1);
    });

    it('discards empty comment lines', () => {
      const result = parseTaskFile('task: t\n//\nCreateFile("a")\n');
      assert.lengthOf(result.items, 1);
    });

    it('strips trailing // comment from single-line instructions', () => {
      const result = parseTaskFile('task: t\nCreateFile("a.txt") // create the file\n');
      assert.equal(result.items[0].type, 'CreateFile');
      assert.equal(result.items[0].args.path, 'a.txt');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RAW LINES
  // ═══════════════════════════════════════════════════════════════

  describe('Parser — raw / unrecognized lines', () => {
    it('preserves unrecognized lines as __RAW__', () => {
      const result = parseTaskFile('task: t\nthis is not valid\n');
      assert.lengthOf(result.items, 1);
      assert.equal(result.items[0].type, '__RAW__');
      assert.equal(result.items[0].text, 'this is not valid');
    });

    it('preserves unknown instruction types as __RAW__', () => {
      const result = parseTaskFile('task: t\nFooBarBaz("something")\n');
      assert.lengthOf(result.items, 1);
      assert.equal(result.items[0].type, '__RAW__');
    });

    it('assigns id to raw items', () => {
      const result = parseTaskFile('task: t\ngarbage\n');
      assert.truthy(result.items[0].id);
    });

    it('raw item has text property', () => {
      const result = parseTaskFile('task: t\nmy raw text\n');
      assert.equal(result.items[0].text, 'my raw text');
    });

    it('section before raw is still emitted', () => {
      const result = parseTaskFile('task: t\n// ====== S ======\ngarbage\n');
      assert.equal(result.items[0].type, '__SECTION__');
      assert.equal(result.items[1].type, '__RAW__');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASES / EMPTY / WHITESPACE
  // ═══════════════════════════════════════════════════════════════

  describe('Parser — empty and whitespace edge cases', () => {
    it('handles empty string', () => {
      const result = parseTaskFile('');
      assert.equal(result.taskName, '');
      assert.lengthOf(result.requiredVariables, 0);
      assert.lengthOf(result.computedVariables, 0);
      assert.lengthOf(result.items, 0);
    });

    it('handles only whitespace', () => {
      const result = parseTaskFile('   \n\n   \n');
      assert.equal(result.taskName, '');
      assert.lengthOf(result.items, 0);
    });

    it('handles task name only', () => {
      const result = parseTaskFile('task: onlyName\n');
      assert.equal(result.taskName, 'onlyName');
      assert.lengthOf(result.items, 0);
    });

    it('skips blank lines between items', () => {
      const result = parseTaskFile('task: t\n\n> v\n\nCreateFile("a")\n\n');
      assert.lengthOf(result.requiredVariables, 1);
      assert.lengthOf(result.items, 1);
    });

    it('handles indented lines', () => {
      const result = parseTaskFile('  task: t\n  > v\n  CreateFile("a")\n');
      assert.equal(result.taskName, 't');
      assert.lengthOf(result.requiredVariables, 1);
      assert.lengthOf(result.items, 1);
    });

    it('returns all four keys in result object', () => {
      const result = parseTaskFile('');
      assert.truthy('taskName' in result);
      assert.truthy('requiredVariables' in result);
      assert.truthy('computedVariables' in result);
      assert.truthy('items' in result);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FULL DOCUMENT PARSING
  // ═══════════════════════════════════════════════════════════════

  describe('Parser — full document', () => {
    it('parses a complete realistic task file', () => {
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
      assert.equal(result.taskName, 'newIntegration');
      assert.lengthOf(result.requiredVariables, 2);
      assert.lengthOf(result.computedVariables, 2);

      const sections = result.items.filter(i => i.type === '__SECTION__');
      assert.lengthOf(sections, 3);

      const instructions = result.items.filter(i => !i.type.startsWith('__'));
      assert.lengthOf(instructions, 4);
    });

    it('preserves element ordering across types', () => {
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
      assert.lengthOf(result.requiredVariables, 2);
      assert.lengthOf(result.computedVariables, 1);
      assert.equal(result.items[0].type, '__SECTION__');
      assert.equal(result.items[1].type, 'CreateFile');
      assert.equal(result.items[2].type, 'ReplaceFile');
      assert.equal(result.items[3].type, '__RAW__');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // BLANK LINE / SPACING PRESERVATION
  // ═══════════════════════════════════════════════════════════════

  describe('Parser — blank line preservation', () => {
    it('sets blankBefore on items after blank lines in instruction area', () => {
      const text = 'task: t\nCreateFile("a")\n\nCreateFile("b")\n';
      const result = parseTaskFile(text);
      assert.lengthOf(result.items, 2);
      assert.truthy(!result.items[0].blankBefore, 'First item should not have blankBefore');
      assert.truthy(result.items[1].blankBefore, 'Second item should have blankBefore');
    });

    it('does not set blankBefore for blank lines in header area', () => {
      const text = 'task: t\n\n> v1\n\nCreateFile("a")\n';
      const result = parseTaskFile(text);
      assert.truthy(!result.items[0].blankBefore, 'First instruction should not have blankBefore from header blanks');
    });

    it('sets blankBefore on sections after blank lines', () => {
      const text = 'task: t\nCreateFile("a")\n\n// ====== Section ======\nCreateFile("b")\n';
      const result = parseTaskFile(text);
      const section = result.items.find(i => i.type === '__SECTION__');
      assert.truthy(section.blankBefore, 'Section after blank line should have blankBefore');
    });

    it('collapses multiple blank lines into one blankBefore', () => {
      const text = 'task: t\nCreateFile("a")\n\n\n\nCreateFile("b")\n';
      const result = parseTaskFile(text);
      assert.lengthOf(result.items, 2);
      assert.truthy(result.items[1].blankBefore, 'Should have blankBefore');
    });

    it('preserves blankBefore on raw items', () => {
      const text = 'task: t\nCreateFile("a")\n\nsome unknown line\n';
      const result = parseTaskFile(text);
      assert.lengthOf(result.items, 2);
      assert.truthy(result.items[1].blankBefore, 'Raw item should have blankBefore');
    });

    it('no blankBefore when instructions are consecutive', () => {
      const text = 'task: t\nCreateFile("a")\nCreateFile("b")\nCreateFile("c")\n';
      const result = parseTaskFile(text);
      assert.lengthOf(result.items, 3);
      for (const item of result.items) {
        assert.truthy(!item.blankBefore, `${item.type} should not have blankBefore`);
      }
    });
  });
}
