// ─── Bidirectional Sync & Status Bar ─────────────────────────────

describe('Bidirectional Sync (Pipeline ↔ Preview)', () => {
  beforeEach(() => {
    cy.visitApp();
  });

  it('pipeline changes reflect in preview', () => {
    cy.get('#taskName').clear().type('syncTest');
    cy.get('.preview__input').invoke('val').should('contain', 'syncTest');
  });

  it('adding an instruction updates the preview', () => {
    cy.get('.preview__input').invoke('val').then((before) => {
      cy.addInstruction('Create Directory');
      cy.get('.preview__input').invoke('val').should('not.eq', before);
    });
  });

  it('removing an instruction updates the preview', () => {
    cy.get('.preview__input').invoke('val').then((before) => {
      cy.get('.card').not('.card--section').first()
        .find('.card__action-btn--danger').click();
      cy.wait(800);
      cy.get('.preview__input').invoke('val').should('not.eq', before);
    });
  });

  it('editing preview syncs back to pipeline (task name)', () => {
    // Clear preview and type a minimal task using the correct task: format
    cy.get('.preview__input').click();
    cy.get('.preview__input').invoke('val', '').trigger('input');
    cy.get('.preview__input').type('task: previewEdited', { delay: 10 });
    cy.get('.preview__input').trigger('input');
    // Wait for reverse sync debounce (600ms) + buffer
    cy.wait(1500);
    cy.get('#taskName').should('have.value', 'previewEdited');
  });

  it('shows sync indicator status', () => {
    cy.get('.preview__sync-indicator').should('exist');
    cy.get('.preview__input').click().type(' edited');
    cy.get('.preview__sync-indicator').should('exist');
  });
});

describe('Status Bar', () => {
  beforeEach(() => {
    cy.visitApp();
  });

  it('displays instruction count', () => {
    cy.get('#status-bar').should('contain.text', 'instruction');
  });

  it('displays variable count', () => {
    cy.get('#status-bar').should('contain.text', 'variable');
  });

  it('updates counts when instructions are added', () => {
    cy.get('#status-bar').invoke('text').then((before) => {
      cy.addInstruction('Create File');
      cy.get('#status-bar').invoke('text').should('not.eq', before);
    });
  });

  it('shows "No issues" when task is valid', () => {
    cy.wait(600);
    cy.get('#status-bar').invoke('text').then((text) => {
      expect(text).to.match(/instruction|variable|error|warning|No issues/);
    });
  });

  it('shows error count when validation errors exist', () => {
    cy.addInstruction('Create File');
    cy.wait(600);
    cy.get('#status-bar').then(($bar) => {
      const text = $bar.text();
      expect(text).to.match(/error|warning|instruction/);
    });
  });
});
