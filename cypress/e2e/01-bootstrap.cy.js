// ─── App Bootstrap & First-Visit Behavior ─────────────────────────

describe('App Bootstrap', () => {
  it('renders the main layout panels', () => {
    cy.visitApp();
    cy.get('.toolbar').should('be.visible');
    cy.get('.tab-bar').should('be.visible');
    cy.get('.palette').should('be.visible');
    cy.get('.pipeline').should('be.visible');
    cy.get('.context-panel').should('be.visible');
    cy.get('#status-bar').should('be.visible');
  });

  it('loads the sample task on first visit', () => {
    cy.visitApp();
    cy.get('#taskName').should('have.value', 'launchStartup');
    // Sample task has 16 items (instructions + sections)
    cy.get('.card').should('have.length.greaterThan', 5);
    cy.get('#status-bar').should('contain.text', 'instruction');
  });

  it('shows Help Center on very first visit', () => {
    cy.visitAppFresh();
    // Help Center auto-opens for brand new users
    cy.get('.help-overlay', { timeout: 3000 }).should('be.visible');
    // Close it
    cy.get('.help-content__close').click();
    cy.get('.help-overlay').should('not.exist');
  });

  it('shows onboarding tour for returning users who haven\'t completed it', () => {
    // Simulate a returning user: guide seen, but onboarding not done
    cy.window().then((win) => {
      win.localStorage.setItem('scaffold-ui-guide-seen', '1');
    });
    cy.visit('/');
    cy.get('.onboarding-overlay', { timeout: 3000 }).should('be.visible');
    cy.get('.onboarding-tooltip').should('be.visible');
  });

  it('persists state across reloads via autosave', () => {
    cy.visitApp();
    // Change the task name
    cy.get('#taskName').clear().type('myTestTask');
    // Wait for autosave debounce (800ms) + buffer
    cy.wait(1200);
    // Verify autosave happened before reloading
    cy.window().then((win) => {
      const saved = win.localStorage.getItem('scaffold-ui-tabs');
      expect(saved).to.contain('myTestTask');
      // Ensure guide/onboarding flags persist through reload
      win.localStorage.setItem('scaffold-ui-guide-seen', '1');
      win.localStorage.setItem('scaffold-ui-onboarding-done', '1');
    });
    cy.reload();
    cy.get('#taskName').should('have.value', 'myTestTask');
  });
});
