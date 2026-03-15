// ─── Task File Serializer ────────────────────────────────────────
// Converts the UI model back to .task file text.

/**
 * Serialize the store state into a .task file string.
 *
 * @param {object} state - The store state
 * @returns {string} The .task file content
 */
export function serializeTask(state) {
  return buildSerialization(state).text;
}

/**
 * Serialize state and produce a line→itemId map for preview↔pipeline linking.
 *
 * @param {object} state - The store state
 * @returns {{ text: string, lineMap: Map<number, string> }}
 */
export function serializeTaskWithLineMap(state) {
  return buildSerialization(state);
}

function buildSerialization(state) {
  const lines = [];
  const lineMap = new Map(); // 0-based line number → item.id

  // Task name
  lines.push(`task: ${state.taskName || 'unnamed'}`);
  lines.push('');

  // Required variables
  if (state.requiredVariables.length > 0) {
    for (const v of state.requiredVariables) {
      if (v.name) {
        lines.push(`> ${v.name}`);
      }
    }
    lines.push('');
  }

  // Computed variables
  if (state.computedVariables.length > 0) {
    for (const v of state.computedVariables) {
      if (v.name && v.expression) {
        lines.push(`${v.name} = "${escapeString(v.expression)}"`);
      }
    }
    lines.push('');
  }

  // Instructions and sections
  for (let i = 0; i < state.items.length; i++) {
    const item = state.items[i];

    // Add blank line before this item if:
    // - it explicitly had one in the source (blankBefore), or
    // - it's a section header (always visually separate)
    const needsBlank = item.blankBefore || item.type === '__SECTION__';
    if (needsBlank && lines.length > 0 && lines[lines.length - 1] !== '') {
      lines.push('');
    }

    if (item.type === '__SECTION__') {
      lineMap.set(lines.length, item.id);
      lines.push(`// ==================== ${item.title.toUpperCase()} ====================`);
      continue;
    }
    if (item.type === '__RAW__') {
      lineMap.set(lines.length, item.id);
      lines.push(item.text || '');
      continue;
    }

    const line = serializeInstruction(item);
    if (line) {
      lineMap.set(lines.length, item.id);
      lines.push(line);
    }
  }

  // Ensure trailing newline
  return { text: lines.join('\n') + '\n', lineMap };
}

// ─── Instruction serialization ───────────────────────────────────

function serializeInstruction(item) {
  const a = item.args || {};

  switch (item.type) {
    case 'CreateFile':
      return `CreateFile("${esc(a.path)}")`;

    case 'CreateDirectory':
      return `CreateDirectory("${esc(a.path)}")`;

    case 'ReplaceFile':
      return `ReplaceFile("${esc(a.targetPath)}", "${esc(a.templatePath)}")`;

    case 'AppendToFile':
      return `AppendToFile("${esc(a.targetPath)}", "${esc(a.templatePath)}")`;

    case 'InsertAtAnchor':
      return `InsertAtAnchor("${esc(a.targetPath)}", "${esc(a.templatePath)}", "${esc(a.anchor)}")`;

    case 'InsertAtAnchorInline':
      return `InsertAtAnchorInline("${esc(a.targetPath)}", "${esc(a.inlineContent)}", "${esc(a.anchor)}")`;

    case 'InsertIntoJavaClass':
      return `InsertIntoJavaClass("${esc(a.targetPath)}", "${esc(a.templatePath)}")`;

    case 'InsertIntoJavaClassInline':
      return `InsertIntoJavaClassInline("${esc(a.targetPath)}", "${esc(a.inlineContent)}")`;

    default:
      return `// Unknown: ${item.type}`;
  }
}

// ─── String escaping ─────────────────────────────────────────────

function esc(value) {
  return escapeString(value || '');
}

function escapeString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r');
}
