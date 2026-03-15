// ─── Help Center — In-app guides & documentation ─────────────────
// A modal knowledge base so users always know what the app does,
// how task files work, and how to get the most out of the builder.

import { el, clearChildren } from '../utils/dom.js';
import { icon } from '../icons.js';

// ─── Article content ─────────────────────────────────────────────
// Each article is { id, title, icon, content() → HTMLElement }.

const ARTICLES = [
  {
    id: 'welcome',
    title: 'Welcome',
    iconName: 'sparkle',
    content: () => article(
      'Welcome to Scaffold Task Builder',
      `This tool helps you create <strong>.task files</strong> — the recipes that power the
       Scaffold engine in the connector project.`,
      `Instead of hand-writing dozens of lines of boilerplate, you build tasks visually:
       drag instructions, define variables, and export a ready-to-run file in seconds.`,
      heading('Why does this exist?'),
      `Every time the connector project needs a new integration, PMS version, or model sync,
       the same pattern repeats: create directories, copy templates, wire up configuration,
       insert code at anchors. That's tedious and error-prone.`,
      `<strong>Task files automate that.</strong> They describe exactly which files to create,
       replace, or modify — and the Scaffold engine executes them. This builder makes writing
       those task files <em>visual, validated, and fast</em>.`,
      heading('Quick orientation'),
      featureList([
        ['Left panel — Toolbox', 'Define your variables and browse all available instructions.'],
        ['Center — Pipeline', 'Your instruction sequence. Drag to reorder, click to edit.'],
        ['Right panel — Preview', 'Live .task file output with syntax highlighting. You can edit it directly too.'],
        ['Tabs', 'Work on multiple tasks at once — each tab is independent.'],
      ]),
      tip('First time here? Close this and click <strong>Tour</strong> in the toolbar for an interactive walkthrough.'),
    ),
  },
  {
    id: 'task-files',
    title: 'Task Files',
    iconName: 'fileTemplate',
    content: () => article(
      'Understanding .task Files',
      `A <code>.task</code> file is a plain-text recipe that tells the Scaffold engine
       what to do. It has three parts:`,
      heading('1. Task name'),
      `The first line declares the task's identity:`,
      codeBlock('task: addNewIntegration'),
      `Names should be <code>camelCase</code>, <code>kebab-case</code>, or <code>snake_case</code>.`,
      heading('2. Variables'),
      `<strong>Required variables</strong> are values the user must supply when running the task.
       They are declared with <code>&gt;</code>:`,
      codeBlock('> moduleName\n> packagePath'),
      `<strong>Computed variables</strong> are derived from other variables using expressions:`,
      codeBlock('moduleDir = "${moduleName}/src/main/java/${packagePath}"\nconfigPath = "${moduleDir}/config"'),
      `The engine also provides <strong>built-in variables</strong> like <code>\${templatesDir}</code>,
       <code>\${tasksDir}</code>, and <code>\${connectorConfigDir}</code>.`,
      heading('3. Instructions'),
      `The rest of the file is a sequence of operations:`,
      codeBlock(
        '// ==================== SETUP ====================\n' +
        'CreateDirectory("${moduleDir}")\n' +
        'CreateFile("${moduleDir}/build.gradle")\n\n' +
        '// ==================== WIRING ====================\n' +
        'InsertAtAnchor("settings.gradle", "tpl/settings-include.tpl", "// NEW_MODULES")\n' +
        'ReplaceFile("${moduleDir}/build.gradle", "tpl/build.gradle.tpl")'
      ),
      tip('Section comments (<code>// === TITLE ===</code>) help organize long tasks. They become collapsible groups in the builder.'),
    ),
  },
  {
    id: 'first-task',
    title: 'First Task',
    iconName: 'lightbulb',
    content: () => article(
      'Creating Your First Task',
      `Let's walk through building a simple task that sets up a new module.`,
      step(1, 'Name your task',
        'Type a name in the toolbar\'s task name field — e.g. <code>addModule</code>.'),
      step(2, 'Add required variables',
        'In the left panel under <strong>Required Variables</strong>, click the <strong>+</strong> button and type <code>moduleName</code>. This is what the user will provide when running the task.'),
      step(3, 'Add a computed variable',
        'Under <strong>Computed Variables</strong>, click the <strong>+</strong> button. Set the name to <code>moduleDir</code> and the expression to <code>${moduleName}/src</code>. This auto-derives a path.'),
      step(4, 'Add instructions',
        'In the left panel under <strong>Instructions</strong>, click <strong>Create Directory</strong>. A card appears in the pipeline. Fill in the path: <code>${moduleDir}</code>.'),
      step(5, 'Add more instructions',
        'Click <strong>Create File</strong> and set the path to <code>${moduleDir}/build.gradle</code>. You now have two operations.'),
      step(6, 'Organize with sections',
        'Click <strong>Section Divider</strong> in the instruction palette and type a title like <code>Setup</code>. Drag it above your instructions to group them.'),
      step(7, 'Review and save',
        'Check the <strong>Preview</strong> panel on the right — your .task file is shown with syntax highlighting. Press <kbd>Ctrl+S</kbd> or click <strong>Save</strong> in the toolbar. If you have a project root set, the file saves in place; otherwise it downloads as a file.'),
      tip('You can also edit the preview directly — changes sync back to the pipeline in real time.'),
    ),
  },
  {
    id: 'instructions',
    title: 'Instructions',
    iconName: 'code',
    content: () => article(
      'Instruction Reference',
      `Every instruction performs one file-system operation. Here's the complete set:`,
      instrRef('CreateFile', 'file', 'Creates an empty file at the given path.',
        'CreateFile("${moduleDir}/README.md")', ['path']),
      instrRef('CreateDirectory', 'folder', 'Creates a directory (and parent dirs) at the given path.',
        'CreateDirectory("${moduleDir}/src")', ['path']),
      instrRef('ReplaceFile', 'fileEdit', 'Copies a template file to the target, replacing it entirely.',
        'ReplaceFile("${moduleDir}/build.gradle", "tpl/build.gradle.tpl")', ['targetPath', 'templatePath']),
      instrRef('AppendToFile', 'filePlus', 'Appends template content to the end of an existing file.',
        'AppendToFile("settings.gradle", "tpl/include-line.tpl")', ['targetPath', 'templatePath']),
      instrRef('InsertAtAnchor', 'anchor', 'Inserts template content at a specific anchor comment in a file.',
        'InsertAtAnchor("settings.gradle", "tpl/module-entry.tpl", "// NEW_MODULES")', ['targetPath', 'templatePath', 'anchor']),
      instrRef('InsertAtAnchorInline', 'anchor', 'Like InsertAtAnchor but with inline content instead of a template file.',
        'InsertAtAnchorInline("config.xml", "<module name=\\"${moduleName}\\"/>", "<!-- MODULES -->")', ['targetPath', 'inlineContent', 'anchor']),
      instrRef('InsertIntoJavaClass', 'code', 'Inserts template content into a Java class body.',
        'InsertIntoJavaClass("${moduleDir}/Config.java", "tpl/field.java.tpl")', ['targetPath', 'templatePath']),
      instrRef('InsertIntoJavaClassInline', 'code', 'Like InsertIntoJavaClass but with inline content.',
        'InsertIntoJavaClassInline("${moduleDir}/Config.java", "private String name;")', ['targetPath', 'inlineContent']),
    ),
  },
  {
    id: 'variables',
    title: 'Variables',
    iconName: 'tag',
    content: () => article(
      'Variables & Expressions',
      `Variables let you parameterize your tasks so the same recipe works for any module, package, or feature.`,
      heading('Required variables'),
      `Declared with <code>&gt; variableName</code>. The user running the task will be prompted for each value.
       Think of these as the "inputs" to your recipe.`,
      codeBlock('> moduleName\n> authorName'),
      heading('Computed variables'),
      `Derived from other variables. Defined as <code>name = "expression"</code>.
       They compute automatically — the user never fills them in.`,
      codeBlock('moduleDir = "${moduleName}/src/main/java"\npackagePath = "com/example/${moduleName}"'),
      `Computed variables can reference other computed variables — they resolve in order.`,
      heading('Built-in variables'),
      `The engine provides these automatically:`,
      featureList([
        ['${templatesDir}', 'Path to the scaffold templates directory.'],
        ['${tasksDir}', 'Path to the scaffold tasks directory.'],
        ['${connectorConfigDir}', 'Path to the connector configuration package.'],
      ]),
      heading('Using variables in instructions'),
      `Reference any variable with <code>\${name}</code> in instruction fields:`,
      codeBlock('CreateFile("${moduleDir}/${moduleName}Config.java")'),
      tip('The builder auto-completes variable names as you type in instruction fields. Just type <code>${</code> to see suggestions.'),
    ),
  },
  {
    id: 'tips',
    title: 'Tips & Shortcuts',
    iconName: 'zap',
    content: () => article(
      'Tips, Tricks & Keyboard Shortcuts',
      heading('Keyboard shortcuts'),
      shortcutTable([
        ['Ctrl/⌘ + Z', 'Undo'],
        ['Ctrl/⌘ + Shift + Z', 'Redo'],
        ['Ctrl/⌘ + D', 'Duplicate selected card'],
        ['Delete / Backspace', 'Remove selected card'],
        ['?', 'Toggle keyboard shortcuts overlay'],
        ['Type ${', 'Trigger variable autocomplete'],
        ['Tab', 'Accept autocomplete suggestion'],
        ['Escape', 'Close dropdown / overlay'],
      ]),
      heading('Preview editing'),
      `The preview panel isn't read-only — you can type directly into it.
       Changes are parsed and synced back to the pipeline after a short delay.`,
      `<strong>Clicking a line in the preview highlights the matching instruction card</strong>
       in the pipeline and scrolls to it.`,
      heading('Drag & drop'),
      `Reorder instructions by dragging cards in the pipeline.
       The order matters — the engine executes instructions top to bottom.`,
      heading('Sections'),
      `Use section dividers to organize long tasks into logical groups.
       In the preview, they appear as <code>// === TITLE ===</code> comments.`,
      heading('Multi-tab workflow'),
      `Open multiple tasks in tabs to compare or copy between them.
       Each tab has its own undo/redo history.`,
      heading('Validation'),
      `Switch to the <strong>Validation</strong> tab in the right panel to see all
       warnings and errors. Clicking an issue highlights the affected card.`,
      tip('The builder auto-saves to your browser\'s local storage. Your work persists across refreshes.'),
    ),
  },
];

// ─── Content helpers ─────────────────────────────────────────────

function article(title, ...parts) {
  const body = el('div', { className: 'help-article' });
  body.appendChild(el('h2', { className: 'help-article__title' }, title));
  for (const part of parts) {
    if (typeof part === 'string') {
      const p = el('p', { className: 'help-article__text' });
      p.innerHTML = part;
      body.appendChild(p);
    } else if (part instanceof Node) {
      body.appendChild(part);
    }
  }
  return body;
}

function heading(text) {
  const h = el('h3', { className: 'help-article__heading' });
  h.innerHTML = text;
  return h;
}

function codeBlock(code) {
  return el('pre', { className: 'help-article__code' },
    el('code', {}, code),
  );
}

function tip(html) {
  const box = el('div', { className: 'help-article__tip' });
  const tipIcon = icon('lightbulb', 16);
  const span = el('span');
  span.innerHTML = html;
  box.append(tipIcon, span);
  return box;
}

function step(num, title, descriptionHtml) {
  const wrap = el('div', { className: 'help-article__step' });
  const badge = el('span', { className: 'help-article__step-num' }, String(num));
  const content = el('div', { className: 'help-article__step-body' });
  content.appendChild(el('strong', {}, title));
  const desc = el('p');
  desc.innerHTML = descriptionHtml;
  content.appendChild(desc);
  wrap.append(badge, content);
  return wrap;
}

function featureList(items) {
  const dl = el('dl', { className: 'help-article__dl' });
  for (const [term, desc] of items) {
    const dt = el('dt');
    dt.innerHTML = term;
    const dd = el('dd');
    dd.innerHTML = desc;
    dl.append(dt, dd);
  }
  return dl;
}

function instrRef(name, iconName, desc, example, fields) {
  const wrap = el('div', { className: 'help-article__instr' });
  const header = el('div', { className: 'help-article__instr-header' },
    icon(iconName, 16),
    el('strong', {}, name),
  );
  const descP = el('p', { className: 'help-article__instr-desc' });
  descP.innerHTML = desc;
  const fieldsP = el('p', { className: 'help-article__instr-fields' },
    'Fields: ',
    el('code', {}, fields.join(', ')),
  );
  wrap.append(header, descP, codeBlock(example), fieldsP);
  return wrap;
}

function shortcutTable(rows) {
  const table = el('table', { className: 'help-article__shortcuts' });
  for (const [key, desc] of rows) {
    table.appendChild(
      el('tr', {},
        el('td', {}, el('kbd', {}, key)),
        el('td', {}, desc),
      ),
    );
  }
  return table;
}

// ─── Modal ───────────────────────────────────────────────────────

export function openHelpCenter(startArticleId = 'welcome') {
  // Don't open twice
  if (document.getElementById('help-center-overlay')) return;

  const overlay = el('div', {
    id: 'help-center-overlay',
    className: 'help-overlay',
  });

  const modal = el('div', { className: 'help-modal' });

  // ── Sidebar ──
  const sidebar = el('nav', { className: 'help-sidebar' });
  const sidebarTitle = el('div', { className: 'help-sidebar__title' },
    icon('helpCircle', 18), ' Help Center',
  );
  sidebar.appendChild(sidebarTitle);

  const navList = el('ul', { className: 'help-sidebar__nav' });
  for (const art of ARTICLES) {
    const li = el('li', {
      className: 'help-sidebar__item',
      dataset: { article: art.id },
      onClick: () => showArticle(art.id),
    }, icon(art.iconName, 14), el('span', {}, art.title));
    navList.appendChild(li);
  }
  sidebar.appendChild(navList);

  // ── Content area ──
  const contentArea = el('div', { className: 'help-content' });

  const contentHeader = el('div', { className: 'help-content__header' });
  const closeBtn = el('button', {
    className: 'help-content__close',
    onClick: close,
    title: 'Close (Esc)',
  }, icon('xCircle', 18));
  contentHeader.appendChild(closeBtn);

  const contentBody = el('div', { className: 'help-content__body' });

  contentArea.append(contentHeader, contentBody);
  modal.append(sidebar, contentArea);
  overlay.appendChild(modal);

  // ── Show article ──
  function showArticle(id) {
    const art = ARTICLES.find(a => a.id === id);
    if (!art) return;
    clearChildren(contentBody);
    contentBody.appendChild(art.content());
    contentBody.scrollTop = 0;

    navList.querySelectorAll('.help-sidebar__item').forEach(li => {
      li.classList.toggle('help-sidebar__item--active', li.dataset.article === id);
    });
  }

  // ── Close ──
  function close() {
    overlay.classList.add('help-overlay--closing');
    localStorage.setItem('scaffold-ui-guide-seen', '1');
    setTimeout(() => overlay.remove(), 200);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  function onKey(e) {
    if (e.key === 'Escape') { close(); e.preventDefault(); }
  }
  document.addEventListener('keydown', onKey);
  // Cleanup listener when overlay is removed
  const observer = new MutationObserver(() => {
    if (!document.getElementById('help-center-overlay')) {
      document.removeEventListener('keydown', onKey);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true });

  document.body.appendChild(overlay);
  showArticle(startArticleId);
}
