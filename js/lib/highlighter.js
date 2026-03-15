// ─── Task File Syntax Highlighter ────────────────────────────────
// Returns HTML with <span> wrappers for syntax coloring.
// Used in the overlay <pre> behind the editable textarea.

const INSTRUCTIONS = [
  'InsertAtAnchorInline', 'InsertAtAnchor',
  'InsertIntoJavaClassInline', 'InsertIntoJavaClass',
  'CreateFile', 'CreateDirectory', 'ReplaceFile', 'AppendToFile',
];

function esc(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Highlight ${varName} references inside raw (unescaped) text */
function hlVars(raw) {
  const parts = [];
  let last = 0;
  const re = /\$\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) parts.push(esc(raw.slice(last, m.index)));
    parts.push(`<span class="hl-varref">\${${esc(m[1])}}</span>`);
    last = re.lastIndex;
  }
  if (last < raw.length) parts.push(esc(raw.slice(last)));
  return parts.join('');
}

/** Highlight quoted "string" arguments (with var refs inside) from raw text */
function hlArgs(raw) {
  const parts = [];
  let last = 0;
  const re = /"([^"]*)"/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) parts.push(esc(raw.slice(last, m.index)));
    parts.push(`<span class="hl-string">"${hlVars(m[1])}"</span>`);
    last = re.lastIndex;
  }
  if (last < raw.length) parts.push(hlVars(raw.slice(last)));
  return parts.join('');
}

function highlightLine(line) {
  const trimmed = line.trim();

  // Empty
  if (!trimmed) return esc(line);

  // Comment
  if (trimmed.startsWith('#')) {
    return `<span class="hl-comment">${esc(line)}</span>`;
  }

  // Section divider: --- Name ---
  if (/^---\s.*---$/.test(trimmed)) {
    return `<span class="hl-section">${esc(line)}</span>`;
  }

  // Task name
  if (trimmed.startsWith('Task:')) {
    const idx = line.indexOf('Task:');
    return esc(line.slice(0, idx))
      + `<span class="hl-keyword">Task:</span>`
      + `<span class="hl-taskname">${hlVars(line.slice(idx + 5))}</span>`;
  }

  // Required variable: > varName
  if (trimmed.startsWith('>')) {
    const idx = line.indexOf('>');
    return esc(line.slice(0, idx))
      + `<span class="hl-prompt">&gt;</span>`
      + `<span class="hl-varname">${esc(line.slice(idx + 1))}</span>`;
  }

  // Computed variable: name = "expression"
  const compMatch = line.match(/^(\s*)(\w+)(\s*=\s*)"(.*)"/);
  if (compMatch) {
    return esc(compMatch[1])
      + `<span class="hl-varname">${esc(compMatch[2])}</span>`
      + `<span class="hl-operator">${esc(compMatch[3])}</span>`
      + `<span class="hl-string">"${hlVars(compMatch[4])}"</span>`;
  }

  // Instruction lines
  for (const instr of INSTRUCTIONS) {
    if (trimmed.startsWith(instr)) {
      const idx = line.indexOf(instr);
      return esc(line.slice(0, idx))
        + `<span class="hl-instruction">${instr}</span>`
        + hlArgs(line.slice(idx + instr.length));
    }
  }

  // Fallback — still highlight var refs
  return hlVars(line);
}

/**
 * Highlight an entire .task file string, returning HTML.
 * @param {string} text
 * @returns {string}
 */
export function highlightTask(text) {
  // Trailing newline ensures the pre matches textarea height
  return text.split('\n').map(highlightLine).join('\n') + '\n';
}
