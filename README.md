# Scaffold Task Builder

A zero-dependency visual editor for building `.task` files used by the scaffold engine. No build step — just HTML, CSS, and vanilla JavaScript with ES modules.

## Quick Start

```bash
npm install          # install dev dependencies (Cypress, serve)
npm run serve        # start local server on http://localhost:8275
```

Or without npm:

```bash
python3 -m http.server 8080
```

Then open the URL in your browser.

On first launch, a **sample task** (`sampleNewModule`) is loaded so you can explore the UI right away. An interactive guided tour highlights each area of the interface.

## Features

### Core
- **Card-based pipeline** — each instruction is a visual card you can drag to reorder
- **Variable autocomplete** — type `${` in any field to get a dropdown of available variables
- **Live preview** — see the generated `.task` file in real-time, with syntax highlighting
- **Bidirectional editing** — edit the raw `.task` text directly; changes sync back to the cards
- **Real-time validation** — errors and warnings shown inline, on collapsed cards, and in the Validation tab
- **Import/Export** — load existing `.task` files or export your work

### Multi-Tab
- **Tabbed interface** — work on multiple tasks simultaneously, each in its own tab
- **New Tab** button in toolbar and `+` in the tab bar open empty tasks
- **Import opens in a new tab** — your current work is never overwritten
- **Per-tab undo/redo** — each tab has its own history stack (up to 80 states)
- **All tabs autosaved** — close the browser, come back, everything is restored

### UX & Accessibility
- **Solarized themes** — light and dark modes following the Solarized color palette
- **Global font scaling** — A−/A+ buttons adjust all font sizes (persisted)
- **Panel minimize/maximize** — collapse any panel to a thin strip, or maximize it full-width
- **Resizable panels** — drag the dividers between panels to resize
- **Interactive onboarding** — guided tour on first visit (re-trigger via the Tour button)
- **Keyboard shortcuts** — press `?` anytime to see the full list
- **Drag affordances** — grab cursors, visible grip handles, drop zone highlights
- **Labeled toolbar buttons** — icon + text for discoverability

### Editing
- **Instruction palette** — 8 instruction types organized by category, with search filter
- **Section dividers** — group related instructions with named sections
- **Computed variable mini-cards** — compact, readable layout for derived variables
- **Duplicate / move / collapse** — card actions for quick editing
- **Error badges** — collapsed cards show error/warning counts
- **Template creation** — create new `.tpl` template files from within the UI

## Layout

| Zone | Location | Purpose |
|------|----------|---------|
| Toolbar | Top | New tab, import/export, undo/redo, theme, font size, tour |
| Tab Bar | Below toolbar | Switch between open tasks |
| Toolbox | Left sidebar | Required & computed variables, instruction types, search |
| Pipeline | Center | Your instruction cards (the main workspace) |
| Context Panel | Right sidebar | Live preview, variable table, validation results |

## Supported Instructions

| Instruction | Description |
|-------------|-------------|
| `CreateDirectory` | Create a directory (and parents) |
| `CreateFile` | Create an empty file |
| `ReplaceFile` | Overwrite a file with rendered template content |
| `AppendToFile` | Append rendered template content to a file |
| `InsertAtAnchor` | Insert template content at an anchor point in a file |
| `InsertAtAnchorInline` | Insert inline content at an anchor point |
| `InsertIntoJavaClass` | Insert template content before the final `}` of a Java class |
| `InsertIntoJavaClassInline` | Insert inline content before the final `}` of a Java class |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + D` | Duplicate selected card |
| `Delete` / `Backspace` | Remove selected card (when not in a text field) |
| `?` | Show keyboard shortcuts overlay |
| `Escape` | Close overlays / dismiss tour |
| `←` / `→` | Navigate onboarding tour steps |

## Testing

The project uses [Cypress](https://www.cypress.io/) for both **end-to-end** and **unit** tests.

### Running Tests

```bash
npm run test:e2e     # run all E2E tests (starts server automatically)
npm run test:unit    # run unit tests only
npm run cy:open      # open Cypress interactive runner (server must be running)
npm run cy:run       # run all tests headlessly (server must be running)
```

### Test Suite

| Suite | Files | Tests | What it covers |
|-------|-------|-------|----------------|
| **E2E** | `cypress/e2e/01-*.cy.js` – `12-*.cy.js` | ~100 | Full user interactions: toolbar, tabs, palette, pipeline cards, context panel, drag & drop, keyboard shortcuts, themes, onboarding, sync |
| **Unit** | `cypress/e2e/unit/*.cy.js` | ~520 | Store, parser, serializer, validator, resolver, DOM helpers, component logic |

### Writing Tests

- Custom commands are in `cypress/support/e2e.js` (`visitApp`, `addInstruction`, `switchContextTab`, etc.)
- Unit tests use `cypress-test-helper.html` as a harness that imports all app modules onto `window.__test__`
- Card action buttons work with standard Cypress `.click()` — no `{force: true}` workarounds needed

## Project Structure

```
scaffold-task-builder/
├── index.html                  # Entry point
├── cypress.config.js           # Cypress configuration
├── cypress-test-helper.html    # Unit test harness
├── cypress/
│   ├── support/e2e.js          # Custom commands & global hooks
│   └── e2e/
│       ├── 01-bootstrap.cy.js  # App startup, first-visit, autosave
│       ├── 02-toolbar.cy.js    # Toolbar buttons, theme, font size, help
│       ├── 03-tabs.cy.js       # Multi-tab management, undo/redo isolation
│       ├── 04-palette.cy.js    # Variables, instruction list, search
│       ├── 05-pipeline.cy.js   # Card actions, collapse, autocomplete
│       ├── 06-context-panel.cy.js  # Preview, variables tab, validation
│       ├── 07-panels.cy.js     # Panel minimize/maximize/resize
│       ├── 08-drag-drop.cy.js  # Drag & drop reordering
│       ├── 09-keyboard-shortcuts.cy.js
│       ├── 10-onboarding.cy.js # Guided tour
│       ├── 11-sync-status.cy.js    # Bidirectional preview sync
│       ├── 12-edge-cases.cy.js     # Empty states, rapid undo/redo
│       └── unit/               # Migrated unit tests (~520 tests)
│           ├── store.cy.js
│           ├── parser.cy.js
│           ├── serializer.cy.js
│           ├── validator.cy.js
│           ├── resolver.cy.js
│           ├── dom.cy.js
│           ├── components.cy.js
│           └── integration.cy.js
├── styles/
│   ├── variables.css           # Solarized design tokens (colors, spacing, fonts)
│   ├── cards.css               # Instruction card styles
│   ├── tooltips.css            # Tooltip system styles
│   └── main.css                # Layout, components, tab bar, onboarding + imports
├── js/
│   ├── app.js                  # Main init, keyboard shortcuts, panel controls
│   ├── store.js                # Reactive multi-tab state store (undo/redo, autosave)
│   ├── types.js                # Instruction schemas, constants, factories
│   ├── icons.js                # 50+ inline SVG icons (Lucide-style)
│   ├── sampleTask.js           # Sample task loaded on first visit
│   ├── utils/
│   │   └── dom.js              # DOM helpers (el, clearChildren, debounce, showToast)
│   ├── lib/
│   │   ├── parser.js           # .task text → state model (import + bidirectional sync)
│   │   ├── serializer.js       # State model → .task text (export + live preview)
│   │   ├── validator.js        # 16+ validation rules, real-time
│   │   ├── highlighter.js      # Syntax highlighting for .task DSL
│   │   ├── tooltip.js          # JS-based tooltip manager
│   │   └── fileSystem.js       # Project file browsing service
│   └── components/
│       ├── Toolbar.js           # Top toolbar (labeled buttons, font controls)
│       ├── TabBar.js            # Multi-task tab strip
│       ├── Palette.js           # Left sidebar (variables + instructions + search)
│       ├── Pipeline.js          # Center pipeline (DnD sortable list)
│       ├── InstructionCard.js   # Instruction card with collapse, badges, actions
│       ├── ContextPanel.js      # Right sidebar (preview editor, vars, validation)
│       ├── OnboardingGuide.js   # Interactive guided tour (6 steps, skippable)
│       └── shared/
│           ├── VariableInput.js # Text input with ${} autocomplete dropdown
│           └── FileBrowser.js   # File/directory browser for path fields
```

## Architecture Notes

- **No dependencies** — native ES modules, HTML5 DnD, CSS custom properties
- **Reactive store** — pub/sub with `setState(updater)`, per-tab state isolation
- **Focus-aware rendering** — re-renders skip when user is actively typing (prevents focus loss)
- **Bidirectional sync** — preview textarea ↔ card pipeline, debounced parse-back with conflict detection
- **Autosave** — all tabs persisted to localStorage (debounced 800ms), with legacy migration
- **Solarized palette** — all colors are canonical Solarized values for optimal readability
