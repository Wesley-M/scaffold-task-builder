// ─── Toolbar Buttons & Controls ───────────────────────────────────

describe('Toolbar', () => {
  beforeEach(() => {
    cy.visitApp();
  });

  describe('Task Name', () => {
    it('allows editing the task name', () => {
      cy.get('#taskName').clear().type('newTaskName');
      cy.get('#taskName').should('have.value', 'newTaskName');
    });

    it('reflects task name in preview output', () => {
      cy.get('#taskName').clear().type('renamedTask');
      cy.switchContextTab('Preview');
      cy.get('.preview__input').should('contain.value', 'renamedTask');
    });
  });

  describe('Undo / Redo', () => {
    it('undoes and redoes state changes via toolbar buttons', () => {
      // Get initial card count
      cy.get('.card').its('length').then((initialCount) => {
        // Add an instruction
        cy.addInstruction('Create File');
        cy.get('.card').should('have.length', initialCount + 1);

        // Click Undo button (find by tooltip or icon)
        cy.get('.toolbar__btn--secondary').contains('Undo').click();
        cy.get('.card').should('have.length', initialCount);

        // Click Redo button
        cy.get('.toolbar__btn--secondary').contains('Redo').click();
        cy.get('.card').should('have.length', initialCount + 1);
      });
    });
  });

  describe('Theme Selector', () => {
    it('opens the theme dropdown and switches themes', () => {
      // Click the theme button (tooltip: "Change color theme")
      cy.get('[data-tooltip="Change color theme"]').click();
      cy.get('.theme-dropdown').should('be.visible');

      // Select a dark theme
      cy.get('.theme-dropdown__item').contains('Dracula').click();
      cy.get('html').should('have.attr', 'data-theme', 'dracula');
      // Dropdown closes after selecting an item
      cy.get('.theme-dropdown').should('not.be.visible');

      // Switch back to light
      cy.get('[data-tooltip="Change color theme"]').click();
      cy.get('.theme-dropdown__item').contains('Light').click();
      cy.get('html').should('not.have.attr', 'data-theme');
    });

    it('persists theme selection across reload', () => {
      cy.get('[data-tooltip*="heme"]').click();
      cy.get('.theme-dropdown__item').contains('Nord').click();
      cy.get('html').should('have.attr', 'data-theme', 'nord');

      cy.reload();
      cy.get('html').should('have.attr', 'data-theme', 'nord');
    });
  });

  describe('Font Size Controls', () => {
    it('increases and decreases global font size', () => {
      cy.get('.toolbar__font-label').invoke('text').then((initialSize) => {
        // Increase
        cy.get('.toolbar').contains('A+').click();
        cy.get('.toolbar__font-label').invoke('text').should('not.eq', initialSize);

        // Decrease twice to go below initial
        cy.get('.toolbar').contains('A\u2212').click();
        cy.get('.toolbar').contains('A\u2212').click();
      });
    });
  });

  describe('Keyboard Shortcuts Overlay', () => {
    it('opens and closes via toolbar button', () => {
      cy.get('#shortcuts-overlay').should('not.exist');
      // Click the keyboard/shortcuts button
      cy.get('[data-tooltip*="hortcut"]').click();
      cy.get('#shortcuts-overlay').should('be.visible');
      cy.get('.shortcuts-panel').should('be.visible');

      // Close via the close button
      cy.get('.shortcuts-close').click();
      cy.get('#shortcuts-overlay').should('not.exist');
    });

    it('opens with ? key and closes with Escape', () => {
      // Press ? key (must not be in an input)
      cy.get('body').type('?');
      cy.get('#shortcuts-overlay').should('be.visible');

      // Close with Escape
      cy.get('body').type('{esc}');
      cy.get('#shortcuts-overlay').should('not.exist');
    });
  });

  describe('Help Center (Guide Button)', () => {
    it('opens and closes the Help Center', () => {
      cy.get('.toolbar__btn--guide').click();
      cy.get('.help-overlay').should('be.visible');
      cy.get('.help-modal').should('be.visible');

      // Navigate sidebar articles
      cy.get('.help-sidebar__item').should('have.length.greaterThan', 3);
      cy.get('.help-sidebar__item').eq(1).click();
      cy.get('.help-content__body').should('be.visible');

      // Close
      cy.get('.help-content__close').click();
      cy.get('.help-overlay').should('not.exist');
    });
  });

  describe('Tour Button', () => {
    it('starts the onboarding tour', () => {
      // Use exact tooltip to avoid matching "Change color theme" (colour)
      cy.get('[data-tooltip="Interactive walkthrough of the interface"]').click();
      cy.get('.onboarding-overlay').should('be.visible');
      cy.get('.onboarding-tooltip').should('be.visible');

      // Navigate through a few steps
      cy.get('.onboarding-tooltip__btn--primary').click(); // Next
      cy.get('.onboarding-tooltip').should('be.visible');
      cy.get('.onboarding-tooltip__btn--primary').click(); // Next

      // Skip tour
      cy.get('.onboarding-tooltip__btn--ghost').click();
      cy.get('.onboarding-overlay').should('not.exist');
    });
  });
});
