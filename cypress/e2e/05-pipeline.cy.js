// ─── Pipeline: Instruction Cards & Interactions ──────────────────

describe('Pipeline - Instruction Cards', () => {
  beforeEach(() => {
    cy.visitApp();
  });

  it('displays instruction cards from the sample task', () => {
    cy.get('#pipeline-list .card').should('have.length.greaterThan', 10);
  });

  it('displays section dividers', () => {
    cy.get('.card--section').should('have.length.gte', 3);
  });

  it('shows instruction count badge in the header', () => {
    cy.get('#pipeline-count').invoke('text').then((text) => {
      expect(parseInt(text)).to.be.greaterThan(0);
    });
  });

  describe('Card Selection', () => {
    it('selects a card when clicking its header', () => {
      cy.get('.card').not('.card--section').first().find('.card__header').click();
      cy.get('.card--selected').should('have.length', 1);
    });

    it('deselects previously selected card when selecting another', () => {
      cy.get('.card').not('.card--section').eq(0).find('.card__header').click();
      cy.get('.card--selected').should('have.length', 1);
      cy.get('.card').not('.card--section').eq(1).find('.card__header').click();
      cy.get('.card--selected').should('have.length', 1);
    });
  });

  describe('Card Collapse / Expand', () => {
    it('collapses and expands a card', () => {
      // Select a card first — this triggers re-render
      cy.get('.card').not('.card--section').first().find('.card__header').click();
      cy.get('.card--selected').should('exist');

      cy.get('.card--selected [data-tooltip="Collapse fields"]').click();

      // Card should be collapsed (re-query since DOM rebuilds)
      cy.get('.card--collapsed').should('exist');

      // Click expand on the collapsed card
      cy.get('.card--collapsed [data-tooltip="Expand fields"]').click();
      cy.get('.card--collapsed').should('not.exist');
    });
  });

  describe('Card Duplicate', () => {
    it('duplicates a card', () => {
      cy.get('.card').its('length').then((count) => {
        cy.get('.card').not('.card--section').first().find('.card__header').click();
        cy.get('.card--selected').should('exist');
        cy.get('.card--selected [data-tooltip*="Duplicate"]').click();
        cy.get('.card').should('have.length', count + 1);
      });
    });

    it('duplicates via keyboard shortcut Ctrl+D', () => {
      cy.get('.card').its('length').then((count) => {
        cy.get('.card').not('.card--section').first().find('.card__header').click();
        cy.get('body').type('{ctrl}d');
        cy.get('.card').should('have.length', count + 1);
      });
    });
  });

  describe('Card Remove', () => {
    it('removes a card via the remove button', () => {
      cy.get('.card').its('length').then((count) => {
        cy.get('.card').not('.card--section').first()
          .find('.card__action-btn--danger').click();
        cy.get('.card').should('have.length', count - 1);
      });
    });

    it('removes selected card via Delete key', () => {
      cy.get('.card').its('length').then((count) => {
        cy.get('.card').not('.card--section').first().find('.card__header').click();
        cy.get('body').type('{del}');
        cy.get('.card').should('have.length', count - 1);
      });
    });
  });

  describe('Card Field Editing', () => {
    it('edits a field value in an instruction card', () => {
      cy.get('.card').not('.card--section').first().find('.card__header').click();
      cy.get('.card--selected .card__field-input .var-input').first()
        .click()
        .focus()
        .type('{selectall}custom/path/file.txt', { delay: 10 });
      cy.get('.card--selected .card__field-input .var-input').first()
        .should('have.value', 'custom/path/file.txt');
    });

    it('shows variable autocomplete when typing ${ in a field', () => {
      cy.get('.card').not('.card--section').first().find('.card__header').click();
      cy.get('.card--selected .card__field-input .var-input').first()
        .click()
        .type('{selectall}${');
      cy.get('.var-dropdown:visible').should('exist');
      cy.get('.var-dropdown-item').should('have.length.gte', 1);
      cy.focused().type('{esc}');
    });

    it('accepts autocomplete suggestion with Enter key', () => {
      cy.get('.card').not('.card--section').first().find('.card__header').click();
      cy.get('.card--selected .card__field-input .var-input').first()
        .click()
        .type('{selectall}${');
      cy.get('.var-dropdown:visible').should('exist');
      // Arrow down to highlight first item, then Enter to accept
      cy.focused().type('{downarrow}{enter}');
      cy.get('.var-dropdown:visible').should('not.exist');
    });

    it('accepts autocomplete suggestion with Tab key', () => {
      cy.get('.card').not('.card--section').first().find('.card__header').click();
      cy.get('.card--selected .card__field-input .var-input').first()
        .click()
        .type('{selectall}${');
      cy.get('.var-dropdown:visible').should('exist');
      cy.get('.var-dropdown-item').should('have.length.gte', 1);
      // Tab should accept the first suggestion (verifies Tab key handling)
      cy.focused().trigger('keydown', { key: 'Tab', keyCode: 9, which: 9 });
      cy.get('.var-dropdown:visible').should('not.exist');
      // Verify a variable was inserted
      cy.get('.card--selected .card__field-input .var-input').first()
        .invoke('val').should('match', /\$\{.+\}/);
    });
  });

  describe('Section Cards', () => {
    it('edits a section title', () => {
      cy.get('.card--section').first().within(() => {
        cy.get('.card__section-input').clear().type('My Custom Section');
        cy.get('.card__section-input').should('have.value', 'My Custom Section');
      });
    });

    it('removes a section card', () => {
      cy.get('.card--section').its('length').then((count) => {
        cy.get('.card--section').first()
          .find('.card__action-btn--danger').click();
        cy.get('.card--section').should('have.length', count - 1);
      });
    });
  });

  describe('Section Card Actions', () => {
    it('removes section card via click', () => {
      // Verify real .click() works on section remove button (focusin fix)
      cy.get('.card--section').should('have.length.gte', 1);
      cy.get('.card').its('length').then((totalCount) => {
        cy.get('.card--section').its('length').then((sectionCount) => {
          cy.get('.card--section').first()
            .find('.card__action-btn--danger').click();
          cy.get('.card--section').should('have.length', sectionCount - 1);
          cy.get('.card').should('have.length', totalCount - 1);
        });
      });
    });

    it('edits section title and it persists in preview', () => {
      cy.get('.card--section').first().within(() => {
        cy.get('.card__section-input').clear().type('My Test Section');
      });
      // Switch to Preview tab and verify section title appears (uppercase)
      cy.switchContextTab('Preview');
      cy.get('.preview__input').invoke('val')
        .should('contain', 'MY TEST SECTION');
    });
  });

  describe('Raw Cards', () => {
    it('creates raw card when typing unrecognized line in preview', () => {
      // Open a new tab for a clean slate
      cy.get('.tab-bar__add').click();
      cy.get('#pipeline-list .card').should('have.length', 0);

      // Switch to Preview tab and type content with an invalid line
      cy.switchContextTab('Preview');
      cy.get('.preview__input').type('task: rawTest\nthis is not a valid instruction', { delay: 10 });

      // Wait for reverse sync debounce (600ms + buffer)
      cy.wait(1000);

      // Verify raw card appears
      cy.get('.card--raw').should('have.length.gte', 1);
      cy.get('.card__type-badge--raw').should('exist');
    });

    it('removes raw card via click', () => {
      // Setup: create a raw card in a new tab
      cy.get('.tab-bar__add').click();
      cy.switchContextTab('Preview');
      cy.get('.preview__input').type('task: rawTest2\nsome unrecognized gibberish', { delay: 10 });
      cy.wait(1000);
      cy.get('.card--raw').should('have.length.gte', 1);

      // Remove the raw card via real .click()
      cy.get('.card--raw').first().find('.card__action-btn--danger').click();
      cy.get('.card--raw').should('not.exist');
    });
  });

  describe('Empty Pipeline State', () => {
    it('shows empty state when all cards are removed', () => {
      cy.get('.tab-bar__add').click();
      cy.get('#pipeline-empty').should('be.visible');
      cy.get('.pipeline__empty-text').should('contain.text', 'empty');
      cy.get('.pipeline__empty-steps .pipeline__step').should('have.length.gte', 2);
    });
  });
});
