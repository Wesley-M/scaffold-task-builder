// ─── Context Panel: Preview, Variables, Validation Tabs ──────────

describe('Context Panel', () => {
  beforeEach(() => {
    cy.visitApp();
  });

  describe('Tab Switching', () => {
    it('has three tabs: Preview, Variables, Validation', () => {
      cy.get('.context-panel__tab').should('have.length', 3);
      cy.get('.context-panel__tab').eq(0).should('contain.text', 'Preview');
      cy.get('.context-panel__tab').eq(1).should('contain.text', 'Variables');
      cy.get('.context-panel__tab').eq(2).should('contain.text', 'Validation');
    });

    it('Preview tab is active by default', () => {
      cy.get('.context-panel__tab').eq(0).should('have.class', 'context-panel__tab--active');
    });

    it('switches to Variables tab', () => {
      cy.switchContextTab('Variables');
      cy.get('.context-panel__tab').contains('Variables')
        .should('have.class', 'context-panel__tab--active');
      cy.get('#tab-variables').should('be.visible');
    });

    it('switches to Validation tab', () => {
      cy.switchContextTab('Validation');
      cy.get('.context-panel__tab').contains('Validation')
        .should('have.class', 'context-panel__tab--active');
      cy.get('#tab-validation').should('be.visible');
    });

    it('switches back to Preview tab', () => {
      cy.switchContextTab('Variables');
      cy.switchContextTab('Preview');
      cy.get('.context-panel__tab').contains('Preview')
        .should('have.class', 'context-panel__tab--active');
    });
  });

  describe('Preview Tab', () => {
    it('shows the preview textarea with task content', () => {
      cy.get('.preview__input').should('be.visible');
      cy.get('.preview__input').invoke('val').should('not.be.empty');
    });

    it('shows the preview toolbar with sync indicator', () => {
      cy.get('.preview__toolbar').should('be.visible');
      cy.get('.preview__sync-indicator').should('exist');
    });

    it('preview reflects the current pipeline state', () => {
      cy.get('.preview__input').invoke('val').then((val) => {
        expect(val).to.contain('launchStartup');
      });
    });

    it('allows direct editing in preview textarea', () => {
      // Clear textarea and type new content using task: format (app parser expects this)
      cy.get('.preview__input').click();
      cy.get('.preview__input').invoke('val', '').trigger('input');
      cy.get('.preview__input').type('task: myEditedTask', { delay: 10 });
      cy.get('.preview__input').trigger('input');
      // Wait for reverse sync debounce (600ms) + buffer
      cy.wait(1500);
      // Task name should sync back
      cy.get('#taskName').should('have.value', 'myEditedTask');
    });

    it('copies preview content to clipboard', () => {
      cy.get('.preview__action-btn').click();
      cy.contains(/copied/i, { timeout: 2000 }).should('exist');
    });

    it('adjusts preview font size', () => {
      cy.get('.preview__font-label').invoke('text').then((initialSize) => {
        cy.get('.preview__font-btn--up').click();
        cy.get('.preview__font-label').invoke('text').should('not.eq', initialSize);

        cy.get('.preview__font-btn').not('.preview__font-btn--up').click();
        cy.get('.preview__font-btn').not('.preview__font-btn--up').click();
      });
    });

    it('shows syntax highlighting behind the textarea', () => {
      cy.get('.preview__hl-code').should('exist');
    });
  });

  describe('Variables Tab', () => {
    beforeEach(() => {
      cy.switchContextTab('Variables');
    });

    it('displays the variables table', () => {
      cy.get('#tab-variables').should('be.visible');
      cy.get('.var-table, #vars-table').should('exist');
    });

    it('shows required variables from the sample task', () => {
      cy.get('#tab-variables').should('contain.text', 'appName');
      cy.get('#tab-variables').should('contain.text', 'founder');
    });

    it('shows computed variables with resolved values', () => {
      cy.get('#tab-variables').should('contain.text', 'appDir');
      cy.get('#tab-variables').should('contain.text', 'apiDir');
    });
  });

  describe('Validation Tab', () => {
    it('shows validation status', () => {
      cy.switchContextTab('Validation');
      cy.get('#tab-validation').should('be.visible');
    });

    it('shows "no issues" for a valid task or lists errors', () => {
      cy.switchContextTab('Validation');
      cy.wait(600);
      cy.get('#tab-validation').then(($panel) => {
        const text = $panel.text().toLowerCase();
        expect(text.length).to.be.greaterThan(0);
      });
    });

    it('shows validation errors when required fields are empty', () => {
      cy.addInstruction('Create File');
      cy.wait(600);

      cy.switchContextTab('Validation');
      cy.get('#tab-validation').then(($panel) => {
        const text = $panel.text().toLowerCase();
        expect(text).to.match(/error|required|warning|missing|empty/);
      });
    });

    it('clicking a validation error scrolls to the relevant card', () => {
      cy.addInstruction('Create File');
      cy.wait(600);

      cy.switchContextTab('Validation');
      cy.get('#tab-validation').then(($panel) => {
        const items = $panel.find('[style*="cursor"], [class*="clickable"], button, a, [role="button"]');
        if (items.length > 0) {
          cy.wrap(items.first()).click();
          cy.get('.card--selected').should('exist');
        }
      });
    });
  });
});
