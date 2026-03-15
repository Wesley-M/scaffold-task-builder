// ─── Sample Task ─────────────────────────────────────────────────
// A small but realistic example task loaded on first visit.

export const SAMPLE_TASK_STATE = {
  taskName: 'sampleNewModule',
  requiredVariables: [
    { id: 'rv-sample-1', name: 'moduleName' },
    { id: 'rv-sample-2', name: 'className' },
  ],
  computedVariables: [
    { id: 'cv-sample-1', name: 'tplDir', expression: '${templatesDir}/new-module' },
    { id: 'cv-sample-2', name: 'srcDir', expression: '${moduleName}/src/main/java/com/example/${moduleName}' },
  ],
  items: [
    { id: 'item-sample-s1', type: '__SECTION__', title: 'Directory Structure' },
    { id: 'item-sample-1', type: 'CreateDirectory', args: { path: '${srcDir}' }, collapsed: false },
    { id: 'item-sample-2', type: 'CreateDirectory', args: { path: '${moduleName}/src/test/java/com/example/${moduleName}' }, collapsed: false },
    { id: 'item-sample-s2', type: '__SECTION__', title: 'Config Files' },
    { id: 'item-sample-3', type: 'CreateFile', args: { path: '${moduleName}/build.gradle' }, collapsed: false },
    { id: 'item-sample-4', type: 'ReplaceFile', args: { targetPath: '${moduleName}/build.gradle', templatePath: '${tplDir}/build-gradle.tpl' }, collapsed: false },
    { id: 'item-sample-s3', type: '__SECTION__', title: 'Register Module' },
    { id: 'item-sample-5', type: 'InsertAtAnchorInline', args: { targetPath: 'settings.gradle', inlineContent: "include '${moduleName}'", anchor: '/* <scaffold-anchor-module> */' }, collapsed: false },
    { id: 'item-sample-s4', type: '__SECTION__', title: 'Main Class' },
    { id: 'item-sample-6', type: 'CreateFile', args: { path: '${srcDir}/${className}.java' }, collapsed: false },
    { id: 'item-sample-7', type: 'ReplaceFile', args: { targetPath: '${srcDir}/${className}.java', templatePath: '${tplDir}/main-class.tpl' }, collapsed: false },
  ],
};
