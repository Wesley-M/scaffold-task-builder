// ─── Variable Resolver ───────────────────────────────────────────
// Mirrors the Java VariableResolver: recursive ${var} substitution
// with escape handling and circular reference detection.

const MAX_PASSES = 100;
const ESCAPE_MARKER = '\x00ESC_DOLLAR\x00';

/**
 * Resolve all ${var} placeholders in `input` using the provided variable map.
 * Supports recursive resolution and \${escaped} placeholders.
 *
 * @param {string} input - The string containing ${var} placeholders
 * @param {Record<string, string>} vars - Variable name → value map
 * @returns {{ resolved: string, unresolved: string[] }} The resolved string and any unresolved variable names
 */
export function resolveVariables(input, vars) {
  if (!input || typeof input !== 'string') return { resolved: input ?? '', unresolved: [] };

  // 1. Temporarily replace escaped placeholders
  let result = input.replace(/\\\$\{/g, ESCAPE_MARKER);

  // 2. Iteratively resolve
  let passes = 0;
  let changed = true;
  while (changed && passes < MAX_PASSES) {
    changed = false;
    passes++;
    for (const [key, value] of Object.entries(vars)) {
      const placeholder = '${' + key + '}';
      if (result.includes(placeholder)) {
        result = result.split(placeholder).join(value);
        changed = true;
      }
    }
  }

  // 3. Find unresolved placeholders
  const unresolved = [];
  const unresolvedPattern = /\$\{([^}]+)\}/g;
  let match;
  while ((match = unresolvedPattern.exec(result)) !== null) {
    unresolved.push(match[1]);
  }

  // 4. Restore escaped placeholders
  result = result.split(ESCAPE_MARKER).join('${');

  return { resolved: result, unresolved };
}

/**
 * Extract all variable references from a string.
 * Returns an array of variable names found in ${...} placeholders.
 */
export function extractVariableRefs(input) {
  if (!input) return [];
  const refs = [];
  const pattern = /\$\{([^}]+)\}/g;
  let match;
  while ((match = pattern.exec(input)) !== null) {
    if (!refs.includes(match[1])) refs.push(match[1]);
  }
  return refs;
}

/**
 * Build a flat variable map from store state.
 */
export function buildVariableMap(state, defaults = {}) {
  const vars = { ...defaults };
  // Required variables get placeholder values for preview
  for (const v of state.requiredVariables) {
    if (v.name && !(v.name in vars)) {
      vars[v.name] = `<${v.name}>`;
    }
  }
  // Computed variables are resolved in order
  for (const v of state.computedVariables) {
    if (v.name && v.expression) {
      const { resolved } = resolveVariables(v.expression, vars);
      vars[v.name] = resolved;
    }
  }
  return vars;
}
