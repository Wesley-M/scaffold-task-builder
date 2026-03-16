// Clear all app state before each test for a clean slate
beforeEach(() => {
  cy.clearLocalStorage();
});

// ── Unit Test Helper Commands ──

// Visit the test helper page and wait for modules to be ready
Cypress.Commands.add('loadTestModules', () => {
  cy.visit('/cypress-test-helper.html');
  cy.window().its('__testReady__').should('eq', true);
});

// Get the test modules from window.__test__
Cypress.Commands.add('getTestModules', () => {
  return cy.window().its('__test__');
});

// Reset the store to clean state (for unit tests)
Cypress.Commands.add('resetStore', () => {
  cy.window().then((win) => {
    const store = win.__test__.store;
    while (store.tabOrder && store.tabOrder.length > 1) {
      store.closeTab(store.tabOrder[store.tabOrder.length - 1]);
    }
    store.reset();
  });
});

// Mount an element offscreen for DOM testing
Cypress.Commands.add('mountElement', { prevSubject: false }, (element) => {
  return cy.window().then((win) => {
    const container = win.document.getElementById('test-mount');
    container.innerHTML = '';
    container.appendChild(element);
    return container;
  });
});

// ── Custom Commands ──

// Visit the app and dismiss the first-visit Help Center overlay
Cypress.Commands.add('visitApp', () => {
  // Mark guide as seen so Help Center doesn't auto-open
  cy.window().then((win) => {
    win.localStorage.setItem('scaffold-ui-guide-seen', '1');
    win.localStorage.setItem('scaffold-ui-onboarding-done', '1');
  });
  cy.visit('/');
  cy.get('#app').should('be.visible');
  // Wait for the app to fully render (status bar appears once store emits)
  cy.get('#status-bar').should('exist');
});

// Visit the app as a brand-new user (Help Center will auto-open)
Cypress.Commands.add('visitAppFresh', () => {
  cy.visit('/');
  cy.get('#app').should('be.visible');
});

// Get an instruction card by its visible type label text
Cypress.Commands.add('getCardByType', (typeText) => {
  return cy.get('.card').filter(`:contains("${typeText}")`).first();
});

// Add an instruction from the palette by clicking it
Cypress.Commands.add('addInstruction', (name) => {
  cy.get('.palette__instr-item').contains(name).click();
});

// Switch context panel tab by name (Preview, Variables, Validation)
Cypress.Commands.add('switchContextTab', (tabName) => {
  cy.get('.context-panel__tab').contains(tabName).click();
});
