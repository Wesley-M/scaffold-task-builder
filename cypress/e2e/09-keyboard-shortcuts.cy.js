// ─── Keyboard Shortcuts ──────────────────────────────────────────

describe('Keyboard Shortcuts', () => {
  beforeEach(() => {
    cy.visitApp();
  });

  describe('Undo / Redo (Ctrl+Z / Ctrl+Shift+Z)', () => {
    it('undoes the last action with Ctrl+Z', () => {
      cy.get('.card').its('length').then((initialCount) => {
        // Add a card
        cy.addInstruction('Create File');
        cy.get('.card').should('have.length', initialCount + 1);

        // Click on the body first to ensure we're not in an input
        cy.get('.pipeline__header').click();

        // Undo with Ctrl+Z
        cy.get('body').type('{ctrl}z');
        cy.get('.card').should('have.length', initialCount);
      });
    });

    it('redoes with Ctrl+Shift+Z', () => {
      cy.get('.card').its('length').then((initialCount) => {
        cy.addInstruction('Create File');
        cy.get('.pipeline__header').click();
        cy.get('body').type('{ctrl}z');
        cy.get('.card').should('have.length', initialCount);

        cy.get('body').type('{ctrl}{shift}z');
        cy.get('.card').should('have.length', initialCount + 1);
      });
    });
  });

  describe('Delete / Backspace', () => {
    it('removes selected card with Delete key', () => {
      cy.get('.card').its('length').then((count) => {
        cy.get('.card').not('.card--section').first().find('.card__header').click();
        cy.get('.card--selected').should('exist');
        cy.get('body').type('{del}');
        cy.get('.card').should('have.length', count - 1);
      });
    });

    it('removes selected card with Backspace key', () => {
      cy.get('.card').its('length').then((count) => {
        cy.get('.card').not('.card--section').first().find('.card__header').click();
        cy.get('body').type('{backspace}');
        cy.get('.card').should('have.length', count - 1);
      });
    });

    it('does NOT delete when focus is in an input field', () => {
      cy.get('.card').its('length').then((count) => {
        // Focus on task name input
        cy.get('#taskName').click();
        cy.get('body').type('{del}');
        // No card should be removed
        cy.get('.card').should('have.length', count);
      });
    });
  });

  describe('Duplicate (Ctrl+D)', () => {
    it('duplicates selected card with Ctrl+D', () => {
      cy.get('.card').its('length').then((count) => {
        cy.get('.card').not('.card--section').first().find('.card__header').click();
        cy.get('body').type('{ctrl}d');
        cy.get('.card').should('have.length', count + 1);
      });
    });

    it('does nothing when no card is selected', () => {
      cy.get('.card').its('length').then((count) => {
        // Click on an empty area
        cy.get('.pipeline__header').click();
        cy.get('body').type('{ctrl}d');
        cy.get('.card').should('have.length', count);
      });
    });
  });

  describe('? shortcut', () => {
    it('toggles shortcuts overlay', () => {
      cy.get('.pipeline__header').click(); // Ensure not in input
      cy.get('body').type('?');
      cy.get('#shortcuts-overlay').should('be.visible');
      cy.get('body').type('?');
      cy.get('#shortcuts-overlay').should('not.exist');
    });
  });

  describe('Escape key', () => {
    it('closes shortcuts overlay', () => {
      cy.get('body').type('?');
      cy.get('#shortcuts-overlay').should('be.visible');
      cy.get('body').type('{esc}');
      cy.get('#shortcuts-overlay').should('not.exist');
    });
  });

  describe('Ctrl+S save interception', () => {
    it('prevents browser save dialog (Ctrl+S intercepted)', () => {
      // The app intercepts Ctrl+S — we just verify no crash
      cy.get('body').type('{ctrl}s');
      // App should still be functional
      cy.get('#app').should('be.visible');
      cy.get('.toolbar').should('be.visible');
    });
  });
});
