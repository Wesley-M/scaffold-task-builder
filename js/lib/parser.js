// ─── Task File Parser ────────────────────────────────────────────
// Parses .task file text into the UI model (for Import).

import { InstructionType, createId } from '../types.js';

/**
 * Parse a .task file string into a state object compatible with the store.
 *
 * @param {string} text - The raw .task file content
 * @returns {{ taskName, requiredVariables, computedVariables, items }}
 */
export function parseTaskFile(text) {
  const lines = text.split('\n');
  let parsedTaskName = '';
  const requiredVariables = [];
  const computedVariables = [];
  const items = [];
  let pendingSectionComment = null;
  let seenInstruction = false;  // true once we've entered the instruction area
  let pendingBlank = false;     // true when blank line(s) seen before next item

  // Helper: push item to list, stamping blankBefore from accumulated blank lines
  function pushItem(item) {
    if (pendingBlank) {
      item.blankBefore = true;
      pendingBlank = false;
    }
    items.push(item);
    seenInstruction = true;
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Track blank lines — preserve spacing in the instruction area
    if (!trimmed) {
      if (seenInstruction) pendingBlank = true;
      continue;
    }

    // Full-line comment — might be a section header
    if (trimmed.startsWith('//')) {
      const commentText = trimmed.replace(/^\/\/\s*/, '').replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim();
      if (commentText) {
        // Heuristic: lines like "// ====== SECTION NAME ======" or "// SECTION NAME"
        const isSection = /^={3,}/.test(trimmed.replace(/^\/\/\s*/, '')) || trimmed.includes('====');
        if (isSection) {
          pendingSectionComment = commentText;
        }
        // Otherwise just skip regular comments — we don't preserve them as items
      }
      continue;
    }

    // Task name declaration
    const taskMatch = trimmed.match(/^task:\s*(.+)$/);
    if (taskMatch) {
      parsedTaskName = taskMatch[1].trim();
      continue;
    }

    // Required variable
    const reqMatch = trimmed.match(/^>\s*(\w+)/);
    if (reqMatch) {
      requiredVariables.push({ id: createId(), name: reqMatch[1] });
      continue;
    }

    // Variable assignment: name = "expression" or name = expression
    const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
    if (assignMatch && !trimmed.match(/^(CreateFile|CreateDirectory|ReplaceFile|AppendToFile|InsertAt|InsertInto)/i)) {
      const name = assignMatch[1];
      let expression = assignMatch[2].trim();
      // Strip surrounding quotes if present
      if ((expression.startsWith('"') && expression.endsWith('"')) ||
          (expression.startsWith("'") && expression.endsWith("'"))) {
        expression = expression.slice(1, -1);
      }
      computedVariables.push({ id: createId(), name, expression });
      continue;
    }

    // Instruction — e.g. CreateFile("path") or InsertAtAnchorInline("a", "b", "c")
    const instrMatch = trimmed.match(/^(\w+)\((.+)\)\s*(?:\/\/.*)?$/);
    if (instrMatch) {
      const typeName = instrMatch[1];
      const argsRaw = instrMatch[2];

      // Emit pending section divider
      if (pendingSectionComment) {
        pushItem({ id: createId(), type: '__SECTION__', title: pendingSectionComment });
        pendingSectionComment = null;
      }

      const parsedArgs = parseArguments(argsRaw);
      const item = buildInstruction(typeName, parsedArgs);
      if (item) {
        pushItem(item);
      } else {
        // Unknown instruction type — preserve as raw line
        pushItem({ id: createId(), type: '__RAW__', text: trimmed });
      }
      continue;
    }

    // Multi-line instruction — handle instructions that span lines
    // Check if this line starts an instruction but doesn't end with )
    const multiLineStart = trimmed.match(/^(\w+)\((.*)$/);
    if (multiLineStart && !trimmed.endsWith(')')) {
      let fullLine = trimmed;
      while (i + 1 < lines.length) {
        i++;
        const nextLine = lines[i].trim();
        fullLine += ' ' + nextLine;
        if (nextLine.endsWith(')') || nextLine.match(/\)\s*(\/\/.*)?$/)) break;
      }

      // Strip trailing comment
      const cleaned = fullLine.replace(/\)\s*\/\/.*$/, ')');
      const mInstr = cleaned.match(/^(\w+)\((.+)\)$/);
      if (mInstr) {
        if (pendingSectionComment) {
          pushItem({ id: createId(), type: '__SECTION__', title: pendingSectionComment });
          pendingSectionComment = null;
        }
        const parsedArgs = parseArguments(mInstr[2]);
        const item = buildInstruction(mInstr[1], parsedArgs);
        if (item) {
          pushItem(item);
        } else {
          pushItem({ id: createId(), type: '__RAW__', text: fullLine });
        }
      } else {
        pushItem({ id: createId(), type: '__RAW__', text: fullLine });
      }
      continue;
    }

    // Unrecognized line — preserve verbatim so no data is lost
    if (pendingSectionComment) {
      pushItem({ id: createId(), type: '__SECTION__', title: pendingSectionComment });
      pendingSectionComment = null;
    }
    pushItem({ id: createId(), type: '__RAW__', text: trimmed });
  }

  // Emit any trailing section
  if (pendingSectionComment) {
    pushItem({ id: createId(), type: '__SECTION__', title: pendingSectionComment });
  }

  return {
    taskName: parsedTaskName,
    requiredVariables,
    computedVariables,
    items,
  };
}

// ─── Argument Parsing ────────────────────────────────────────────
// Parses the comma-separated arguments inside an instruction call.
// Handles quoted strings with escaped characters.

function parseArguments(raw) {
  const args = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      current += ch;
      continue;
    }

    if (!inQuote) {
      if (ch === '"' || ch === "'") {
        inQuote = true;
        quoteChar = ch;
        continue; // don't include the quote
      }
      if (ch === ',') {
        args.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    } else {
      if (ch === quoteChar) {
        inQuote = false;
        continue; // don't include the closing quote
      }
      current += ch;
    }
  }

  if (current.trim()) args.push(current.trim());

  // Unescape in a single pass to avoid ordering issues (e.g. \\t vs \t)
  return args.map(a => a.replace(/\\(.)/g, (_, ch) => {
    switch (ch) {
      case 'n': return '\n';
      case 't': return '\t';
      case 'r': return '\r';
      case '\\': return '\\';
      case '"': return '"';
      case "'": return "'";
      default: return '\\' + ch;
    }
  }));
}

// ─── Build instruction from parsed type + args ───────────────────

const INSTRUCTION_ARG_MAP = {
  CreateFile:                ['path'],
  CreateDirectory:           ['path'],
  ReplaceFile:               ['targetPath', 'templatePath'],
  AppendToFile:              ['targetPath', 'templatePath'],
  InsertAtAnchor:            ['targetPath', 'templatePath', 'anchor'],
  InsertAtAnchorInline:      ['targetPath', 'inlineContent', 'anchor'],
  InsertIntoJavaClass:       ['targetPath', 'templatePath'],
  InsertIntoJavaClassInline: ['targetPath', 'inlineContent'],
};

function buildInstruction(typeName, parsedArgs) {
  const argKeys = INSTRUCTION_ARG_MAP[typeName];
  if (!argKeys) {
    console.warn(`Unknown instruction type: ${typeName}`);
    return null;
  }

  const args = {};
  for (let i = 0; i < argKeys.length; i++) {
    args[argKeys[i]] = parsedArgs[i] || '';
  }

  return {
    id: createId(),
    type: typeName,
    args,
    collapsed: false,
  };
}
