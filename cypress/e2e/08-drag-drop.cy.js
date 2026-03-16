// ─── Drag & Drop ─────────────────────────────────────────────────

describe('Drag & Drop', () => {
  beforeEach(() => {
    cy.visitApp();
  });

  it('reorders cards via drag and drop', () => {
    // Get the first two non-section cards
    cy.get('.card').not('.card--section').eq(0).find('.card__type').invoke('text').then((firstType) => {
      cy.get('.card').not('.card--section').eq(1).find('.card__type').invoke('text').then((secondType) => {
        // Drag first card's handle down to second position
        cy.get('.card').not('.card--section').eq(0).find('.card__drag-handle').as('handle');

        cy.get('@handle').then(($handle) => {
          const rect = $handle[0].getBoundingClientRect();
          // Use Cypress trigger for drag simulation
          cy.get('@handle')
            .trigger('mousedown', { clientX: rect.x + 5, clientY: rect.y + 5, force: true })
            .trigger('mousemove', { clientX: rect.x + 5, clientY: rect.y + 80, force: true });

          // Brief wait for drop indicator
          cy.wait(100);

          cy.get('@handle')
            .trigger('mouseup', { force: true });
        });
      });
    });
  });

  it('drag from palette to pipeline adds instruction', () => {
    cy.get('.card').its('length').then((initialCount) => {
      // Drag an instruction item from the palette
      cy.get('.palette__instr-item').contains('Append').then(($item) => {
        const rect = $item[0].getBoundingClientRect();
        const pipelineRect = Cypress.$('#pipeline-list')[0].getBoundingClientRect();

        cy.wrap($item)
          .trigger('dragstart', { dataTransfer: new DataTransfer(), force: true });

        cy.get('#pipeline-list')
          .trigger('dragover', { dataTransfer: new DataTransfer(), force: true })
          .trigger('drop', { dataTransfer: new DataTransfer(), force: true });

        cy.wrap($item)
          .trigger('dragend', { force: true });
      });
    });
  });
});
