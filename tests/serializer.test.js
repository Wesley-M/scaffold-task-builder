// ─── Serializer Tests ────────────────────────────────────────────

import { describe, it, assert } from './framework.js';
import { serializeTask, serializeTaskWithLineMap } from '../js/lib/serializer.js';

function state(overrides = {}) {
  return { taskName: 't', requiredVariables: [], computedVariables: [], items: [], ...overrides };
}

export default function serializerTests() {

  // ═══════════════════════════════════════════════════════════════
  // TASK NAME
  // ═══════════════════════════════════════════════════════════════

  describe('Serializer — task name', () => {
    it('outputs task: name as first line', () => {
      const output = serializeTask(state({ taskName: 'myTask' }));
      assert.includes(output, 'task: myTask');
    });

    it('uses "unnamed" fallback when task name is empty', () => {
      const output = serializeTask(state({ taskName: '' }));
      assert.includes(output, 'task: unnamed');
    });

    it('task line is the very first line', () => {
      const output = serializeTask(state({ taskName: 'hello' }));
      assert(output.startsWith('task: hello'), 'Should start with task line');
    });

    it('handles task name with special chars', () => {
      const output = serializeTask(state({ taskName: 'my-task_v2' }));
      assert.includes(output, 'task: my-task_v2');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // REQUIRED VARIABLES
  // ═══════════════════════════════════════════════════════════════

  describe('Serializer — required variables', () => {
    it('outputs > varName format', () => {
      const output = serializeTask(state({
        requiredVariables: [{ id: '1', name: 'moduleName' }, { id: '2', name: 'version' }],
      }));
      assert.includes(output, '> moduleName');
      assert.includes(output, '> version');
    });

    it('skips variables with empty names', () => {
      const output = serializeTask(state({
        requiredVariables: [{ id: '1', name: '' }],
      }));
      assert(!output.includes('> \n'), 'Should not output empty variable');
    });

    it('preserves order of variables', () => {
      const output = serializeTask(state({
        requiredVariables: [{ id: '1', name: 'first' }, { id: '2', name: 'second' }],
      }));
      assert.greaterThan(output.indexOf('second'), output.indexOf('first'));
    });

    it('adds blank line after variable block', () => {
      const output = serializeTask(state({
        requiredVariables: [{ id: '1', name: 'v1' }],
      }));
      const lines = output.split('\n');
      const vIdx = lines.findIndex(l => l.startsWith('> v1'));
      assert.equal(lines[vIdx + 1], '', 'Blank line after variables');
    });

    it('skips block entirely when no variables', () => {
      const output = serializeTask(state());
      const lines = output.split('\n');
      assert(!lines.some(l => l.startsWith('>')), 'No > lines');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // COMPUTED VARIABLES
  // ═══════════════════════════════════════════════════════════════

  describe('Serializer — computed variables', () => {
    it('outputs name = "expression" format', () => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: 'tplDir', expression: '${templatesDir}/stuff' }],
      }));
      assert.includes(output, 'tplDir = "${templatesDir}/stuff"');
    });

    it('skips computed variables with empty names', () => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: '', expression: 'foo' }],
      }));
      assert(!output.includes(' = "foo"'), 'Should not output nameless variable');
    });

    it('skips computed variables with empty expressions', () => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: 'myVar', expression: '' }],
      }));
      assert(!output.includes('myVar ='), 'Should not output expressionless variable');
    });

    it('adds blank line after computed variable block', () => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: 'a', expression: 'b' }],
      }));
      const lines = output.split('\n');
      const vIdx = lines.findIndex(l => l.startsWith('a = '));
      assert.equal(lines[vIdx + 1], '', 'Blank line after computed vars');
    });
  });

  describe('Serializer — expression escaping', () => {
    it('escapes double quotes in expressions', () => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: 'msg', expression: 'say "hello"' }],
      }));
      assert.includes(output, 'msg = "say \\"hello\\""');
    });

    it('escapes backslashes in expressions', () => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: 'p', expression: 'a\\b' }],
      }));
      assert.includes(output, 'p = "a\\\\b"');
    });

    it('escapes newlines in expressions', () => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: 'ml', expression: 'line1\nline2' }],
      }));
      assert.includes(output, 'ml = "line1\\nline2"');
    });

    it('escapes tabs in expressions', () => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: 'tab', expression: 'a\tb' }],
      }));
      assert.includes(output, 'tab = "a\\tb"');
    });

    it('escapes carriage returns', () => {
      const output = serializeTask(state({
        computedVariables: [{ id: '1', name: 'cr', expression: 'a\rb' }],
      }));
      assert.includes(output, 'cr = "a\\rb"');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ALL INSTRUCTION TYPES
  // ═══════════════════════════════════════════════════════════════

  describe('Serializer — CreateFile', () => {
    it('serializes with one quoted arg', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'CreateFile', args: { path: 'src/Main.java' } }],
      }));
      assert.includes(output, 'CreateFile("src/Main.java")');
    });

    it('handles empty path', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'CreateFile', args: { path: '' } }],
      }));
      assert.includes(output, 'CreateFile("")');
    });

    it('handles undefined path (null safety)', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'CreateFile', args: {} }],
      }));
      assert.includes(output, 'CreateFile("")');
    });
  });

  describe('Serializer — CreateDirectory', () => {
    it('serializes with path', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'CreateDirectory', args: { path: 'my/dir' } }],
      }));
      assert.includes(output, 'CreateDirectory("my/dir")');
    });
  });

  describe('Serializer — ReplaceFile', () => {
    it('serializes with two args', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'ReplaceFile', args: { targetPath: 'a.txt', templatePath: 'b.tpl' } }],
      }));
      assert.includes(output, 'ReplaceFile("a.txt", "b.tpl")');
    });
  });

  describe('Serializer — AppendToFile', () => {
    it('serializes with two args', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'AppendToFile', args: { targetPath: 'a.txt', templatePath: 'b.tpl' } }],
      }));
      assert.includes(output, 'AppendToFile("a.txt", "b.tpl")');
    });
  });

  describe('Serializer — InsertAtAnchor', () => {
    it('serializes with three args', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'InsertAtAnchor', args: { targetPath: 'f.java', templatePath: 't.tpl', anchor: '/* a */' } }],
      }));
      assert.includes(output, 'InsertAtAnchor("f.java", "t.tpl", "/* a */")');
    });
  });

  describe('Serializer — InsertAtAnchorInline', () => {
    it('serializes with three args', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'InsertAtAnchorInline', args: { targetPath: 'f.java', inlineContent: 'code', anchor: '/* a */' } }],
      }));
      assert.includes(output, 'InsertAtAnchorInline("f.java", "code", "/* a */")');
    });

    it('escapes quotes in inline content', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'InsertAtAnchorInline', args: { targetPath: 'f', inlineContent: 'say "hi"', anchor: 'a' } }],
      }));
      assert.includes(output, 'say \\"hi\\"');
    });
  });

  describe('Serializer — InsertIntoJavaClass', () => {
    it('serializes with two args', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'InsertIntoJavaClass', args: { targetPath: 'Foo.java', templatePath: 't.tpl' } }],
      }));
      assert.includes(output, 'InsertIntoJavaClass("Foo.java", "t.tpl")');
    });
  });

  describe('Serializer — InsertIntoJavaClassInline', () => {
    it('serializes with two args', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'InsertIntoJavaClassInline', args: { targetPath: 'Foo.java', inlineContent: 'code' } }],
      }));
      assert.includes(output, 'InsertIntoJavaClassInline("Foo.java", "code")');
    });
  });

  describe('Serializer — unknown instruction type', () => {
    it('outputs comment for unknown type', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'WeirdThing', args: { a: 'b' } }],
      }));
      assert.includes(output, '// Unknown: WeirdThing');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTIONS
  // ═══════════════════════════════════════════════════════════════

  describe('Serializer — sections', () => {
    it('serializes __SECTION__ as uppercased decorated comment', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: '__SECTION__', title: 'My Section' }],
      }));
      assert.includes(output, 'MY SECTION');
      assert.includes(output, '// ====================');
    });

    it('preserves multiple sections in order', () => {
      const output = serializeTask(state({
        items: [
          { id: '1', type: '__SECTION__', title: 'First' },
          { id: '2', type: 'CreateFile', args: { path: 'a' } },
          { id: '3', type: '__SECTION__', title: 'Second' },
        ],
      }));
      assert.greaterThan(output.indexOf('SECOND'), output.indexOf('FIRST'));
    });

    it('adds blank line before sections after instructions', () => {
      const output = serializeTask(state({
        items: [
          { id: '1', type: 'CreateFile', args: { path: 'a' } },
          { id: '2', type: '__SECTION__', title: 'Next' },
          { id: '3', type: 'CreateFile', args: { path: 'b' } },
        ],
      }));
      const lines = output.split('\n');
      const sectionIdx = lines.findIndex(l => l.includes('NEXT'));
      assert.greaterThan(sectionIdx, 0);
      assert.equal(lines[sectionIdx - 1], '', 'Should have blank line before section');
    });

    it('does not double-blank when section is first item', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: '__SECTION__', title: 'First' }],
      }));
      // Should not start with double blank lines
      assert.truthy(!output.includes('\n\n\n'), 'Should not have triple newlines');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // BLANK LINE PRESERVATION
  // ═══════════════════════════════════════════════════════════════

  describe('Serializer — blank line preservation', () => {
    it('emits blank line before items with blankBefore', () => {
      const output = serializeTask(state({
        items: [
          { id: '1', type: 'CreateFile', args: { path: 'a' } },
          { id: '2', type: 'CreateFile', args: { path: 'b' }, blankBefore: true },
        ],
      }));
      const lines = output.split('\n');
      const bIdx = lines.findIndex(l => l.includes('CreateFile("b")'));
      assert.greaterThan(bIdx, 0);
      assert.equal(lines[bIdx - 1], '', 'Should have blank line before item with blankBefore');
    });

    it('does not emit blank line when blankBefore is absent', () => {
      const output = serializeTask(state({
        items: [
          { id: '1', type: 'CreateFile', args: { path: 'a' } },
          { id: '2', type: 'CreateFile', args: { path: 'b' } },
        ],
      }));
      const lines = output.split('\n');
      const aIdx = lines.findIndex(l => l.includes('CreateFile("a")'));
      const bIdx = lines.findIndex(l => l.includes('CreateFile("b")'));
      assert.equal(bIdx, aIdx + 1, 'Items should be consecutive without blank line');
    });

    it('does not produce double blanks when both blankBefore and section', () => {
      const output = serializeTask(state({
        items: [
          { id: '1', type: 'CreateFile', args: { path: 'a' } },
          { id: '2', type: '__SECTION__', title: 'S', blankBefore: true },
        ],
      }));
      assert.truthy(!output.includes('\n\n\n'), 'Should not have double blank lines');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RAW LINES
  // ═══════════════════════════════════════════════════════════════

  describe('Serializer — raw lines', () => {
    it('outputs __RAW__ items verbatim', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: '__RAW__', text: 'some garbage line' }],
      }));
      assert.includes(output, 'some garbage line');
    });

    it('outputs empty string for raw with no text', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: '__RAW__', text: '' }],
      }));
      // Should not crash
      assert.truthy(output);
    });

    it('outputs empty string for raw with undefined text', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: '__RAW__' }],
      }));
      assert.truthy(output);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // INSTRUCTION ARG ESCAPING
  // ═══════════════════════════════════════════════════════════════

  describe('Serializer — instruction arg escaping', () => {
    it('preserves ${variable} references in args', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'CreateFile', args: { path: '${srcDir}/File.java' } }],
      }));
      assert.includes(output, '${srcDir}/File.java');
    });

    it('escapes backslashes in instruction args', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'CreateFile', args: { path: 'a\\b' } }],
      }));
      assert.includes(output, 'a\\\\b');
    });

    it('escapes quotes in instruction args', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'CreateFile', args: { path: 'say "hi"' } }],
      }));
      assert.includes(output, 'say \\"hi\\"');
    });

    it('escapes newlines in instruction args', () => {
      const output = serializeTask(state({
        items: [{ id: '1', type: 'InsertAtAnchorInline', args: { targetPath: 'f', inlineContent: 'a\nb', anchor: 'x' } }],
      }));
      assert.includes(output, 'a\\nb');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // OUTPUT FORMAT
  // ═══════════════════════════════════════════════════════════════

  describe('Serializer — output format', () => {
    it('ends with newline', () => {
      const output = serializeTask(state());
      assert.equal(output[output.length - 1], '\n');
    });

    it('blank line after task name', () => {
      const output = serializeTask(state());
      const lines = output.split('\n');
      assert.equal(lines[1], '');
    });

    it('serializes multiple instructions in order', () => {
      const output = serializeTask(state({
        items: [
          { id: '1', type: 'CreateFile', args: { path: 'first' } },
          { id: '2', type: 'CreateFile', args: { path: 'second' } },
          { id: '3', type: 'CreateFile', args: { path: 'third' } },
        ],
      }));
      assert.greaterThan(output.indexOf('second'), output.indexOf('first'));
      assert.greaterThan(output.indexOf('third'), output.indexOf('second'));
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FULL DOCUMENT
  // ═══════════════════════════════════════════════════════════════

  describe('Serializer — full document', () => {
    it('serializes a complete state into well-formed .task file', () => {
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
      assert.includes(output, 'task: fullTest');
      assert.includes(output, '> mod');
      assert.includes(output, 'dir = "${mod}/src"');
      assert.includes(output, '// ==================== SETUP ====================');
      assert.includes(output, 'CreateDirectory("${dir}")');
      assert.includes(output, 'CreateFile("${dir}/build.gradle")');
      assert.includes(output, 'ReplaceFile("${dir}/build.gradle", "tpl/build.tpl")');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // serializeTaskWithLineMap
  // ═══════════════════════════════════════════════════════════════

  describe('Serializer — line map', () => {
    it('returns text identical to serializeTask', () => {
      const s = state({
        taskName: 'test',
        items: [
          { id: 'a', type: 'CreateFile', args: { path: 'f.txt' } },
        ],
      });
      const plain = serializeTask(s);
      const { text } = serializeTaskWithLineMap(s);
      assert.equal(text, plain);
    });

    it('maps instruction lines to item IDs', () => {
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
      assert.equal(lineMap.get(aLine), 'a');
      assert.equal(lineMap.get(bLine), 'b');
    });

    it('maps section headers to item IDs', () => {
      const s = state({
        items: [
          { id: 's1', type: '__SECTION__', title: 'Setup' },
          { id: 'a', type: 'CreateFile', args: { path: 'f.txt' } },
        ],
      });
      const { text, lineMap } = serializeTaskWithLineMap(s);
      const lines = text.split('\n');
      const sLine = lines.findIndex(l => l.includes('SETUP'));
      assert.equal(lineMap.get(sLine), 's1');
    });

    it('maps __RAW__ items to their IDs', () => {
      const s = state({
        items: [
          { id: 'r1', type: '__RAW__', text: '# comment line' },
        ],
      });
      const { lineMap } = serializeTaskWithLineMap(s);
      const ids = Array.from(lineMap.values());
      assert.truthy(ids.includes('r1'), 'lineMap should include raw item ID');
    });

    it('does not map blank or header lines', () => {
      const s = state({
        taskName: 'test',
        requiredVariables: [{ id: 'v1', name: 'mod' }],
        items: [
          { id: 'a', type: 'CreateFile', args: { path: 'f.txt' } },
        ],
      });
      const { lineMap } = serializeTaskWithLineMap(s);
      // Line 0 is task name, line 1 is blank — neither should be in lineMap
      assert.equal(lineMap.get(0), undefined);
      assert.equal(lineMap.get(1), undefined);
    });
  });
}
