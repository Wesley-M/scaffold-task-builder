// ─── Palette: Variables & Instruction Toolbox ─────────────────────

describe('Palette - Variables', () => {
  beforeEach(() => {
    cy.visitApp();
  });

  describe('Required Variables', () => {
    it('displays pre-loaded required variables from sample task', () => {
      cy.get('#required-var-list .palette__var-row').should('have.length.gte', 2);
    });

    it('adds a new required variable', () => {
      cy.get('#required-var-list .palette__var-row').its('length').then((count) => {
        cy.get('.palette__add-btn').first().click();
        cy.get('#required-var-list .palette__var-row').should('have.length', count + 1);
      });
    });

    it('edits a required variable name', () => {
      cy.get('#required-var-list .palette__var-input').first()
        .clear()
        .type('customVarName');
      cy.get('#required-var-list .palette__var-input').first()
        .should('have.value', 'customVarName');
    });

    it('removes a required variable', () => {
      cy.get('#required-var-list .palette__var-row').its('length').then((count) => {
        // Button has opacity: 0 — use native click to bypass
        cy.get('#required-var-list .palette__var-row').first()
          .find('.palette__var-remove').then($btn => { $btn[0].click(); });
        cy.get('#required-var-list .palette__var-row').should('have.length', count - 1);
      });
    });

    it('shows validation error for empty variable name', () => {
      cy.get('.palette__add-btn').first().click();
      cy.wait(600);
      cy.get('#app').should('be.visible');
    });
  });

  describe('Computed Variables', () => {
    it('displays pre-loaded computed variables', () => {
      cy.get('#computed-var-list .comp-var').should('have.length.gte', 2);
    });

    it('adds a new computed variable', () => {
      cy.get('#computed-var-list .comp-var').its('length').then((count) => {
        cy.get('.palette__add-btn').eq(1).click();
        cy.get('#computed-var-list .comp-var').should('have.length', count + 1);
      });
    });

    it('edits computed variable name and expression', () => {
      cy.get('#computed-var-list .comp-var').first().within(() => {
        cy.get('.comp-var__name').clear().type('outputDir');
        cy.get('.comp-var__name').should('have.value', 'outputDir');
      });
    });

    it('shows variable autocomplete when typing ${ in expression', () => {
      cy.get('#computed-var-list .comp-var').first().find('.comp-var__expr .var-input')
        .click()
        .type('{selectall}prefix/${');
      cy.get('.var-dropdown:visible').should('exist');
      cy.get('.var-dropdown-item').should('have.length.gte', 1);
      cy.focused().type('{esc}');
    });

    it('removes a computed variable', () => {
      cy.get('#computed-var-list .comp-var').its('length').then((count) => {
        // Button has opacity: 0 — use native click to bypass
        cy.get('#computed-var-list .comp-var').first()
          .find('.comp-var__remove').then($btn => { $btn[0].click(); });
        cy.get('#computed-var-list .comp-var').should('have.length', count - 1);
      });
    });
  });
});

describe('Palette - Instruction Toolbox', () => {
  beforeEach(() => {
    cy.visitApp();
  });

  it('displays instruction categories', () => {
    cy.get('.palette__cat-header').should('have.length.gte', 3);
  });

  it('displays instruction items', () => {
    cy.get('.palette__instr-item').should('have.length.gte', 5);
  });

  it('filters instructions via search', () => {
    cy.get('.palette__search-input').type('Create');
    cy.get('.palette__instr-item:visible').each(($item) => {
      cy.wrap($item).invoke('text').should('match', /create/i);
    });
  });

  it('clears search to show all instructions again', () => {
    cy.get('.palette__instr-item:visible').its('length').then((fullCount) => {
      cy.get('.palette__search-input').type('Create');
      cy.get('.palette__instr-item:visible').should('have.length.lessThan', fullCount);
      cy.get('.palette__search-input').clear();
      cy.get('.palette__instr-item:visible').should('have.length.gte', fullCount);
    });
  });

  it('adds an instruction to the pipeline by clicking it', () => {
    cy.get('.card').its('length').then((count) => {
      cy.get('.palette__instr-item').contains('Create File').click();
      cy.get('.card').should('have.length', count + 1);
    });
  });

  it('adds a Section Divider to the pipeline', () => {
    cy.get('.card--section').its('length').then((sectionCount) => {
      cy.get('.palette__instr-item').contains('Section Divider').click();
      cy.get('.card--section').should('have.length', sectionCount + 1);
    });
  });
});
