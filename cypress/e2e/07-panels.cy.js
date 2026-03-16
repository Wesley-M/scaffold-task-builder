// ─── Panel Resize, Minimize, Maximize ────────────────────────────

describe('Panel Layout Controls', () => {
  beforeEach(() => {
    cy.visitApp();
  });

  describe('Panel Minimize', () => {
    it('minimizes the left panel (Toolbox)', () => {
      cy.get('.palette').should('be.visible');
      // Find the minimize button on the palette
      cy.get('.palette .panel-ctrl-btn').first().click();
      cy.get('.palette').should('have.class', 'panel--minimized');
      // Minimized label should appear
      cy.get('.palette .panel-min-label').should('be.visible');
    });

    it('restores a minimized panel by clicking the label', () => {
      // Minimize first
      cy.get('.palette .panel-ctrl-btn').first().click();
      cy.get('.palette').should('have.class', 'panel--minimized');

      // Click the minimized label to restore
      cy.get('.palette .panel-min-label').click();
      cy.get('.palette').should('not.have.class', 'panel--minimized');
    });

    it('minimizes the right panel (Preview)', () => {
      cy.get('.context-panel .panel-ctrl-btn').first().click();
      cy.get('.context-panel').should('have.class', 'panel--minimized');
    });
  });

  describe('Panel Maximize', () => {
    it('maximizes the pipeline panel', () => {
      // Maximize button is the second panel-ctrl-btn
      cy.get('.pipeline .panel-ctrl-btn').eq(1).click();
      cy.get('.pipeline').should('have.class', 'panel--maximized');
      cy.get('.app__body').should('have.class', 'app__body--maximized');
      // Other panels should be hidden
      cy.get('.palette').should('not.be.visible');
      cy.get('.context-panel').should('not.be.visible');
    });

    it('restores a maximized panel', () => {
      // Maximize pipeline
      cy.get('.pipeline .panel-ctrl-btn').eq(1).click();
      cy.get('.pipeline').should('have.class', 'panel--maximized');

      // Click maximize again to restore
      cy.get('.pipeline .panel-ctrl-btn').last().click();
      cy.get('.pipeline').should('not.have.class', 'panel--maximized');
      cy.get('.palette').should('be.visible');
      cy.get('.context-panel').should('be.visible');
    });
  });

  describe('Resize Handles', () => {
    it('resize handles are visible between panels', () => {
      cy.get('.resize-handle').should('have.length', 2);
      cy.get('.resize-handle').first().should('be.visible');
    });

    it('resize handles are hidden when adjacent panel is minimized', () => {
      // Minimize left panel
      cy.get('.palette .panel-ctrl-btn').first().click();
      // Left resize handle should be hidden
      cy.get('.resize-handle').first().should('not.be.visible');
    });
  });
});
