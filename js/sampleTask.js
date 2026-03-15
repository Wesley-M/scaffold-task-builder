// ─── Sample Task ─────────────────────────────────────────────────
// A showpiece example — looks great, shows off every feature.

export const SAMPLE_TASK_STATE = {
  taskName: 'launchStartup',
  requiredVariables: [
    { id: 'rv-1', name: 'appName' },
    { id: 'rv-2', name: 'founder' },
  ],
  computedVariables: [
    { id: 'cv-1', name: 'appDir', expression: 'apps/${appName}' },
    { id: 'cv-2', name: 'apiDir', expression: '${appDir}/api' },
    { id: 'cv-3', name: 'webDir', expression: '${appDir}/web' },
  ],
  items: [
    { id: 's1', type: '__SECTION__', title: '🚀 Launch Sequence', blankBefore: false },
    { id: 'i1', type: 'CreateDirectory', args: { path: '${appDir}' }, collapsed: false },
    { id: 'i2', type: 'CreateDirectory', args: { path: '${apiDir}/routes' }, collapsed: false },
    { id: 'i3', type: 'CreateDirectory', args: { path: '${webDir}/components' }, collapsed: false },

    { id: 's2', type: '__SECTION__', title: '⚡ Core', blankBefore: true },
    { id: 'i4', type: 'CreateFile', args: { path: '${apiDir}/server.js' }, collapsed: false },
    { id: 'i5', type: 'ReplaceFile', args: { targetPath: '${apiDir}/server.js', templatePath: 'templates/express-server.tpl' }, collapsed: false },
    { id: 'i6', type: 'CreateFile', args: { path: '${webDir}/App.jsx' }, collapsed: false },
    { id: 'i7', type: 'AppendToFile', args: { targetPath: '${webDir}/App.jsx', templatePath: 'templates/react-app.tpl' }, collapsed: false },

    { id: 's3', type: '__SECTION__', title: '🔌 Wire It Up', blankBefore: true },
    { id: 'i8', type: 'InsertAtAnchorInline', args: { targetPath: 'workspace.json', inlineContent: '"${appName}": { "root": "${appDir}" }', anchor: '// <apps>' }, collapsed: false },
    { id: 'i9', type: 'InsertAtAnchor', args: { targetPath: 'docker-compose.yml', templatePath: 'templates/docker-service.tpl', anchor: '# <services>' }, collapsed: false },

    { id: 's4', type: '__SECTION__', title: '✨ Ship It', blankBefore: true },
    { id: 'i10', type: 'CreateFile', args: { path: '${appDir}/README.md' }, collapsed: false },
    { id: 'i11', type: 'ReplaceFile', args: { targetPath: '${appDir}/README.md', templatePath: 'templates/readme.tpl' }, collapsed: false },
    { id: 'i12', type: 'InsertAtAnchorInline', args: { targetPath: 'CHANGELOG.md', inlineContent: '- 🎉 ${appName} launched by ${founder}', anchor: '<!-- releases -->' }, collapsed: false },
  ],
};
