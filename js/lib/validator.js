// ─── Validation Engine ───────────────────────────────────────────
// Real-time validation for the task builder.

import { INSTRUCTION_SCHEMA, DEFAULT_VARIABLES } from '../types.js';
import { extractVariableRefs } from './resolver.js';
import { fileSystem } from './fileSystem.js';

/**
 * Validate the entire task state and return an array of validation errors.
 *
 * @param {object} state - The store state
 * @returns {Array<{ itemId?: string, field?: string, message: string, severity: 'error'|'warning' }>}
 */
export function validate(state) {
  const errors = [];

  // 1. Task name
  if (!state.taskName || !state.taskName.trim()) {
    errors.push({ message: 'Task name is required', severity: 'error' });
  } else if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(state.taskName)) {
    errors.push({ message: 'Task name must be alphanumeric (hyphens/underscores ok), starting with a letter', severity: 'error' });
  }

  // 2. Build set of all defined variable names
  const defined = new Set(Object.keys(DEFAULT_VARIABLES));
  for (const v of state.requiredVariables) {
    if (v.name) defined.add(v.name);
  }
  for (const v of state.computedVariables) {
    if (v.name) defined.add(v.name);
  }

  // 3. Track all used variable references
  const allUsedRefs = new Set();

  // Validate required variables
  for (const v of state.requiredVariables) {
    if (!v.name || !v.name.trim()) {
      errors.push({ itemId: v.id, message: 'Required variable name is empty', severity: 'error' });
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v.name)) {
      errors.push({ itemId: v.id, message: `Variable name "${v.name}" must be a valid identifier (letters, digits, underscores)`, severity: 'error' });
    }
  }

  // Collect refs from computed variable expressions
  for (const v of state.computedVariables) {
    if (!v.name || !v.name.trim()) {
      errors.push({ itemId: v.id, message: 'Computed variable name is empty', severity: 'error' });
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v.name)) {
      errors.push({ itemId: v.id, message: `Variable name "${v.name}" must be a valid identifier`, severity: 'error' });
    }
    if (!v.expression || !v.expression.trim()) {
      errors.push({ itemId: v.id, message: `Computed variable "${v.name || '(unnamed)'}" has no expression`, severity: 'warning' });
    }
    if (v.expression) {
      for (const ref of extractVariableRefs(v.expression)) {
        allUsedRefs.add(ref);
        if (!defined.has(ref)) {
          errors.push({
            itemId: v.id,
            field: 'expression',
            message: `Undefined variable "\${${ref}}" in computed variable "${v.name}"`,
            severity: 'error',
          });
        }
      }
      // Check for self-reference
      if (v.name && extractVariableRefs(v.expression).includes(v.name)) {
        errors.push({
          itemId: v.id,
          field: 'expression',
          message: `Computed variable "${v.name}" references itself — this will cause infinite resolution`,
          severity: 'error',
        });
      }
    }
  }

  // Check for duplicate variable names
  const varNames = new Map();
  for (const v of state.requiredVariables) {
    if (v.name) {
      if (varNames.has(v.name)) {
        errors.push({ itemId: v.id, message: `Duplicate variable name "${v.name}"`, severity: 'error' });
      }
      varNames.set(v.name, v.id);
    }
  }
  for (const v of state.computedVariables) {
    if (v.name) {
      if (varNames.has(v.name)) {
        errors.push({ itemId: v.id, message: `Duplicate variable name "${v.name}"`, severity: 'error' });
      }
      varNames.set(v.name, v.id);
    }
  }

  // Check for shadowing default variables
  for (const v of [...state.requiredVariables, ...state.computedVariables]) {
    if (v.name && v.name in DEFAULT_VARIABLES) {
      errors.push({
        itemId: v.id,
        message: `Variable "${v.name}" shadows a built-in default variable`,
        severity: 'warning',
      });
    }
  }

  // 4. Validate instructions
  const instructions = state.items.filter(i => i.type !== '__SECTION__' && i.type !== '__RAW__');
  const rawLines = state.items.filter(i => i.type === '__RAW__');

  if (instructions.length === 0 && rawLines.length === 0) {
    errors.push({ message: 'Task has no instructions — add at least one instruction to the pipeline', severity: 'warning' });
  }

  // Flag unrecognized / raw lines
  for (const item of rawLines) {
    errors.push({
      itemId: item.id,
      message: `Unrecognized line: "${(item.text || '').substring(0, 60)}${(item.text || '').length > 60 ? '…' : ''}"`,
      severity: 'warning',
    });
  }

  for (const item of instructions) {
    const schema = INSTRUCTION_SCHEMA[item.type];
    if (!schema) {
      errors.push({ itemId: item.id, message: `Unknown instruction type: ${item.type}`, severity: 'error' });
      continue;
    }

    // Check required fields
    for (const field of schema.fields) {
      const value = item.args?.[field.key];
      if (!value || !value.trim()) {
        errors.push({
          itemId: item.id,
          field: field.key,
          message: `"${field.label}" is required`,
          severity: 'error',
        });
      } else {
        // Check for undefined variable references
        for (const ref of extractVariableRefs(value)) {
          allUsedRefs.add(ref);
          if (!defined.has(ref)) {
            errors.push({
              itemId: item.id,
              field: field.key,
              message: `Undefined variable "\${${ref}}"`,
              severity: 'warning',
            });
          }
        }

        // Template path validation
        if (field.type === 'template' && value.trim()) {
          // Check for common template path patterns
          const resolved = value.replace(/\$\{[^}]+\}/g, 'x');
          if (!resolved.includes('.tpl') && !resolved.includes('.template') && !resolved.includes('.ftl')) {
            errors.push({
              itemId: item.id,
              field: field.key,
              message: 'Template path usually ends in .tpl — verify this is correct',
              severity: 'warning',
            });
          }

          // File existence check when project root is set
          if (fileSystem.hasRoot) {
            const hasVars = /\$\{[^}]+\}/.test(value);
            if (!hasVars && !fileSystem.fileExists(value)) {
              errors.push({
                itemId: item.id,
                field: field.key,
                message: `Template file not found in project: ${value}`,
                severity: 'warning',
              });
            }
          }
        }

        // Anchor format validation
        if (field.key === 'anchor' && value.trim()) {
          if (!value.includes('scaffold-anchor') && !value.includes('<') && !value.includes('/*')) {
            errors.push({
              itemId: item.id,
              field: field.key,
              message: 'Anchor typically follows the format: /* <scaffold-anchor-NAME> */',
              severity: 'warning',
            });
          }
        }
      }
    }
  }

  // 5. Warn about unused required variables
  for (const v of state.requiredVariables) {
    if (v.name && !allUsedRefs.has(v.name)) {
      errors.push({
        itemId: v.id,
        message: `Required variable "${v.name}" is declared but never used`,
        severity: 'warning',
      });
    }
  }

  // 6. Warn about CreateFile without subsequent ReplaceFile
  for (let i = 0; i < instructions.length; i++) {
    const inst = instructions[i];
    if (inst.type === 'CreateFile' && inst.args?.path) {
      const hasReplace = instructions.slice(i + 1).some(
        j => j.type === 'ReplaceFile' && j.args?.targetPath === inst.args.path
      );
      if (!hasReplace) {
        errors.push({
          itemId: inst.id,
          message: 'CreateFile without a subsequent ReplaceFile — file will be empty',
          severity: 'warning',
        });
      }
    }
  }

  // 7. Detect duplicate instructions (same type + same args)
  const seen = new Map();
  for (const inst of instructions) {
    const key = inst.type + ':' + JSON.stringify(inst.args);
    if (seen.has(key)) {
      errors.push({
        itemId: inst.id,
        message: `Duplicate instruction — identical to an earlier ${INSTRUCTION_SCHEMA[inst.type]?.label || inst.type}`,
        severity: 'warning',
      });
    }
    seen.set(key, inst.id);
  }

  // 8. Suggest sections for long pipelines
  const sections = state.items.filter(i => i.type === '__SECTION__');
  if (instructions.length > 8 && sections.length === 0) {
    errors.push({
      message: 'Consider adding Section Dividers to organize your pipeline — it has many instructions',
      severity: 'warning',
    });
  }

  return errors;
}
