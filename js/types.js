// ─── Instruction Type Constants ───────────────────────────────────
export const InstructionType = Object.freeze({
  CREATE_FILE: 'CreateFile',
  CREATE_DIRECTORY: 'CreateDirectory',
  REPLACE_FILE: 'ReplaceFile',
  APPEND_TO_FILE: 'AppendToFile',
  INSERT_AT_ANCHOR: 'InsertAtAnchor',
  INSERT_AT_ANCHOR_INLINE: 'InsertAtAnchorInline',
  INSERT_INTO_JAVA_CLASS: 'InsertIntoJavaClass',
  INSERT_INTO_JAVA_CLASS_INLINE: 'InsertIntoJavaClassInline',
});

// ─── Field Definitions per Instruction Type ──────────────────────
// icon: key into icons.js PATHS registry
// type: 'path' | 'template' | 'text' | 'code'
export const INSTRUCTION_SCHEMA = Object.freeze({
  [InstructionType.CREATE_FILE]: {
    label: 'Create File',
    icon: 'file',
    category: 'File Structure',
    description: 'Creates an empty file at the specified path. Usually followed by ReplaceFile to populate its content from a template.',
    tip: 'Pair with ReplaceFile to populate content from a template.',
    fields: [
      { key: 'path', label: 'Path', type: 'path', placeholder: '${packageName}/src/main/File.java',
        help: 'Relative path where the new file will be created. Use ${variables} for dynamic segments.' },
    ],
  },
  [InstructionType.CREATE_DIRECTORY]: {
    label: 'Create Directory',
    icon: 'folder',
    category: 'File Structure',
    description: 'Creates a directory (and any missing parents) at the given path. Useful for setting up package structures.',
    tip: 'Parent directories are created automatically.',
    fields: [
      { key: 'path', label: 'Path', type: 'path', placeholder: '${packageName}/src/main/java/com/...',
        help: 'Directory path to create. Intermediate directories are created automatically.' },
    ],
  },
  [InstructionType.REPLACE_FILE]: {
    label: 'Replace File',
    icon: 'fileEdit',
    category: 'Content',
    description: 'Overwrites the entire content of an existing file with the rendered template. Commonly used after CreateFile.',
    tip: 'Typically follows a CreateFile instruction for the same path.',
    fields: [
      { key: 'targetPath', label: 'Target File', type: 'path', placeholder: '${packageName}/build.gradle',
        help: 'Path to the file whose content will be completely replaced.' },
      { key: 'templatePath', label: 'Template', type: 'template', placeholder: '${tplDir}/build-gradle.tpl',
        help: 'Path to the .tpl template file. Variables in the template will be resolved before writing.' },
    ],
  },
  [InstructionType.APPEND_TO_FILE]: {
    label: 'Append to File',
    icon: 'filePlus',
    category: 'Content',
    description: 'Appends the rendered template content to the end of an existing file. The file must already exist.',
    tip: 'Great for adding entries to configuration lists or changelogs.',
    fields: [
      { key: 'targetPath', label: 'Target File', type: 'path', placeholder: 'changelog.md',
        help: 'Path to the existing file to append content to.' },
      { key: 'templatePath', label: 'Template', type: 'template', placeholder: '${tplDir}/entry.tpl',
        help: 'Template file whose rendered content will be appended.' },
    ],
  },
  [InstructionType.INSERT_AT_ANCHOR]: {
    label: 'Insert at Anchor',
    icon: 'anchor',
    category: 'Anchors',
    description: 'Finds a comment anchor in the target file and inserts the rendered template content at that location.',
    tip: 'Anchor format: /* <scaffold-anchor-NAME> */ — the anchor comment stays in place for future inserts.',
    fields: [
      { key: 'targetPath', label: 'Target File', type: 'path', placeholder: 'Config.java',
        help: 'File containing the anchor comment where content will be inserted.' },
      { key: 'templatePath', label: 'Template', type: 'template', placeholder: '${tplDir}/config.tpl',
        help: 'Template to render and insert at the anchor position.' },
      { key: 'anchor', label: 'Anchor', type: 'text', placeholder: '/* <scaffold-anchor-config> */',
        help: 'The exact anchor comment text to search for in the target file. Convention: /* <scaffold-anchor-NAME> */' },
    ],
  },
  [InstructionType.INSERT_AT_ANCHOR_INLINE]: {
    label: 'Insert at Anchor (Inline)',
    icon: 'anchor',
    category: 'Anchors',
    description: 'Like InsertAtAnchor, but uses inline content instead of a template file. Best for short, single-line insertions.',
    tip: 'Use for single-line inserts like enum values or constant declarations.',
    fields: [
      { key: 'targetPath', label: 'Target File', type: 'path', placeholder: 'Constants.java',
        help: 'File containing the anchor comment.' },
      { key: 'inlineContent', label: 'Content', type: 'code', placeholder: 'public static final String ${VAR} = "value";',
        help: 'The literal content to insert. Supports ${variable} substitution. Use \\n for newlines.' },
      { key: 'anchor', label: 'Anchor', type: 'text', placeholder: '/* <scaffold-anchor-constants> */',
        help: 'The anchor comment text to locate in the file.' },
    ],
  },
  [InstructionType.INSERT_INTO_JAVA_CLASS]: {
    label: 'Insert into Java Class',
    icon: 'code',
    category: 'Java',
    description: 'Inserts template content inside the body of a Java class (before the closing brace). Useful for adding methods or fields.',
    tip: 'Content is inserted just before the last closing brace of the class.',
    fields: [
      { key: 'targetPath', label: 'Target File', type: 'path', placeholder: 'src/main/java/Config.java',
        help: 'Path to the Java source file. Must contain a class definition.' },
      { key: 'templatePath', label: 'Template', type: 'template', placeholder: '${tplDir}/methods.tpl',
        help: 'Template file with the Java code to insert (methods, fields, inner classes, etc.).' },
    ],
  },
  [InstructionType.INSERT_INTO_JAVA_CLASS_INLINE]: {
    label: 'Insert into Java Class (Inline)',
    icon: 'code',
    category: 'Java',
    description: 'Like InsertIntoJavaClass, but with inline content instead of a template. Best for adding a single field or annotation.',
    tip: 'Use for quick additions like a single field declaration.',
    fields: [
      { key: 'targetPath', label: 'Target File', type: 'path', placeholder: 'MyService.java',
        help: 'Path to the Java source file.' },
      { key: 'inlineContent', label: 'Content', type: 'code', placeholder: 'private String ${fieldName};',
        help: 'Java code to insert inside the class body. Supports ${variable} substitution.' },
    ],
  },
});

// ─── Category descriptions ───────────────────────────────────────
export const CATEGORY_DESCRIPTIONS = Object.freeze({
  'File Structure': 'Create new files and directories in the project',
  'Content': 'Write or append content to files using templates',
  'Anchors': 'Insert content at specific anchor points in existing files',
  'Java': 'Insert code directly into Java class bodies',
  'Organization': 'Visual dividers to organize your pipeline',
});

// ─── Category grouping for the palette ───────────────────────────
export const INSTRUCTION_CATEGORIES = [
  {
    name: 'File Structure',
    types: [InstructionType.CREATE_DIRECTORY, InstructionType.CREATE_FILE],
  },
  {
    name: 'Content',
    types: [InstructionType.REPLACE_FILE, InstructionType.APPEND_TO_FILE],
  },
  {
    name: 'Anchors',
    types: [InstructionType.INSERT_AT_ANCHOR, InstructionType.INSERT_AT_ANCHOR_INLINE],
  },
  {
    name: 'Java',
    types: [InstructionType.INSERT_INTO_JAVA_CLASS, InstructionType.INSERT_INTO_JAVA_CLASS_INLINE],
  },
];

// ─── Default variables (injected by the scaffold engine) ─────────
export const DEFAULT_VARIABLES = Object.freeze({
  templatesDir: 'scaffold/scaffold-templates/templates',
  tasksDir: 'scaffold/scaffold-templates/tasks',
  connectorConfigDir: 'connector/src/main/java/com/carecru/connector/configuration',
});

// ─── Factory helpers ─────────────────────────────────────────────

let _nextId = 1;

export function createId() {
  return `item-${Date.now()}-${_nextId++}`;
}

export function createVariable(name = '', expression = '', required = false) {
  return { id: createId(), name, expression, required };
}

export function createInstruction(type) {
  const schema = INSTRUCTION_SCHEMA[type];
  if (!schema) throw new Error(`Unknown instruction type: ${type}`);
  const args = {};
  for (const field of schema.fields) {
    args[field.key] = '';
  }
  return { id: createId(), type, args, collapsed: false };
}

export function createSection(title = 'New Section') {
  return { id: createId(), type: '__SECTION__', title };
}
