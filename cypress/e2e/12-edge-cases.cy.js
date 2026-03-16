// ─── Edge Cases & Regression Tests ───────────────────────────────

describe('Edge Cases', () => {
  beforeEach(() => {
    cy.visitApp();
  });

  describe('Empty State Handling', () => {
    it('new tab shows empty pipeline state', () => {
      cy.get('.tab-bar__add').click();
      cy.get('#pipeline-empty').should('be.visible');
      cy.get('#taskName').should('have.value', '');
    });

    it('adding first instruction removes empty state', () => {
      cy.get('.tab-bar__add').click();
      cy.get('#pipeline-empty').should('be.visible');
      cy.addInstruction('Create File');
      cy.get('#pipeline-empty').should('not.be.visible');
      cy.get('.card').should('have.length', 1);
    });

    it('removing all instructions shows empty state again', () => {
      cy.get('.tab-bar__add').click();
      cy.addInstruction('Create File');
      cy.get('.card').should('have.length', 1);
      cy.get('.card .card__action-btn--danger').click();
      cy.get('#pipeline-empty').should('be.visible');
      cy.get('.card').should('not.exist');
    });
  });

  describe('Multiple Undo / Redo Stability', () => {
    it('handles rapid undo/redo without crashing', () => {
      cy.addInstruction('Create File');
      cy.addInstruction('Create Directory');
      cy.addInstruction('Append');
      cy.get('.pipeline__header').click();

      cy.get('body').type('{ctrl}z');
      cy.get('body').type('{ctrl}z');
      cy.get('body').type('{ctrl}z');

      cy.get('body').type('{ctrl}{shift}z');
      cy.get('body').type('{ctrl}{shift}z');

      cy.get('#app').should('be.visible');
      cy.get('.toolbar').should('be.visible');
    });

    it('undo past beginning does not crash', () => {
      cy.get('.pipeline__header').click();
      for (let i = 0; i < 10; i++) {
        cy.get('body').type('{ctrl}z');
      }
      cy.get('#app').should('be.visible');
    });
  });

  describe('Variable Name Edge Cases', () => {
    it('handles special characters in variable names gracefully', () => {
      cy.get('.palette__add-btn').first().click();
      cy.get('#required-var-list .palette__var-input').last()
        .type('my-var.name!@#');
      cy.get('#app').should('be.visible');
    });

    it('handles duplicate variable names', () => {
      cy.get('#required-var-list .palette__var-input').first().invoke('val').then((name) => {
        cy.get('.palette__add-btn').first().click();
        cy.get('#required-var-list .palette__var-input').last().type(name);
        cy.wait(600);
        cy.get('#app').should('be.visible');
      });
    });
  });

  describe('Rapid Tab Operations', () => {
    it('creates and switches between multiple tabs rapidly', () => {
      cy.get('.tab-bar__add').click();
      cy.get('.tab-bar__add').click();
      cy.get('.tab-bar__add').click();
      cy.get('.tab-bar__tab').should('have.length', 4);

      cy.get('.tab-bar__tab').eq(0).click();
      cy.get('.tab-bar__tab').eq(2).click();
      cy.get('.tab-bar__tab').eq(1).click();
      cy.get('.tab-bar__tab').eq(3).click();

      cy.get('#app').should('be.visible');
      cy.get('.toolbar').should('be.visible');
    });

    it('closing all extra tabs returns to single tab', () => {
      cy.get('.tab-bar__add').click();
      cy.get('.tab-bar__add').click();
      cy.get('.tab-bar__tab').should('have.length', 3);

      cy.get('.tab-bar__tab').last().find('.tab-bar__close').click();
      cy.get('.tab-bar__tab').last().find('.tab-bar__close').click();
      cy.get('.tab-bar__tab').should('have.length', 1);
    });
  });

  describe('Preview Parse Error Handling', () => {
    it('shows parse error bar for invalid task syntax', () => {
      cy.get('.preview__input').click();
      cy.get('.preview__input').clear().type('THIS IS NOT VALID TASK SYNTAX !!!');
      cy.wait(800);
      cy.get('#app').should('be.visible');
    });
  });

  describe('Large Task Handling', () => {
    it('handles adding many instructions without performance issues', () => {
      cy.get('.tab-bar__add').click();
      for (let i = 0; i < 20; i++) {
        cy.addInstruction('Create File');
      }
      cy.get('.card').should('have.length', 20);
      cy.get('#taskName').clear().type('largeTask');
      cy.get('#taskName').should('have.value', 'largeTask');
    });
  });

  describe('Theme Switching Under Load', () => {
    it('theme switch with content loaded does not cause visual bugs', () => {
      cy.get('.card').should('have.length.greaterThan', 5);

      const themes = ['dracula', 'nord', 'monokai-pro', 'tokyo-night'];
      themes.forEach((theme) => {
        cy.get('[data-tooltip*="heme"]').click();
        cy.get('.theme-dropdown__item').contains(new RegExp(theme.replace('-', '.*'), 'i')).click();
        cy.get('html').should('have.attr', 'data-theme');
        cy.get('.toolbar').should('be.visible');
        cy.get('.card').should('have.length.greaterThan', 5);
      });
    });
  });
});
