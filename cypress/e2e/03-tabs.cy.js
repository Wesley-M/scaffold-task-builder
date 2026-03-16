// ─── Tab Bar Management ───────────────────────────────────────────

describe('Tab Bar', () => {
  beforeEach(() => {
    cy.visitApp();
  });

  it('shows the initial tab', () => {
    cy.get('.tab-bar__tab').should('have.length.gte', 1);
    cy.get('.tab-bar__tab--active').should('exist');
  });

  it('creates a new tab via the + button', () => {
    cy.get('.tab-bar__tab').its('length').then((initialCount) => {
      cy.get('.tab-bar__add').click();
      cy.get('.tab-bar__tab').should('have.length', initialCount + 1);
      // New tab should be active
      cy.get('.tab-bar__tab--active').should('exist');
      // Pipeline should be empty (new tab)
      cy.get('#pipeline-list .card').should('have.length', 0);
    });
  });

  it('switches between tabs', () => {
    // Create a second tab
    cy.get('.tab-bar__add').click();
    // The new tab should be active and pipeline empty
    cy.get('#pipeline-list .card').should('have.length', 0);

    // Switch back to first tab
    cy.get('.tab-bar__tab').first().click();
    // Should have the sample task loaded
    cy.get('#taskName').should('have.value', 'launchStartup');
    cy.get('.card').should('have.length.greaterThan', 5);
  });

  it('shows dirty indicator when tab has unsaved changes', () => {
    // Make a change
    cy.get('#taskName').clear().type('dirtyTask');
    // Dirty indicator should appear on the active tab
    cy.get('.tab-bar__tab--active .tab-bar__dirty').should('be.visible');
  });

  it('closes a tab when multiple tabs exist', () => {
    // Create a second tab
    cy.get('.tab-bar__add').click();
    cy.get('.tab-bar__tab').should('have.length', 2);

    // Close the second tab
    cy.get('.tab-bar__tab').last().find('.tab-bar__close').click();
    cy.get('.tab-bar__tab').should('have.length', 1);
  });

  it('does not show close button when only one tab exists', () => {
    // Only one tab by default
    cy.get('.tab-bar__tab').should('have.length', 1);
    cy.get('.tab-bar__close').should('not.exist');
  });

  it('each tab maintains independent state', () => {
    // First tab should have the sample task
    cy.get('#taskName').should('have.value', 'launchStartup');

    // Create second tab and set a different name
    cy.get('.tab-bar__add').click();
    cy.get('#taskName').clear().type('secondTask');

    // Switch back to first tab
    cy.get('.tab-bar__tab').first().click();
    cy.get('#taskName').should('have.value', 'launchStartup');

    // Switch to second tab
    cy.get('.tab-bar__tab').last().click();
    cy.get('#taskName').should('have.value', 'secondTask');
  });
});
