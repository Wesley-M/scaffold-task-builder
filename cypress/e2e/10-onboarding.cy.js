// ─── Onboarding Tour ─────────────────────────────────────────────

describe('Onboarding Tour', () => {
  beforeEach(() => {
    // Set up as returning user who hasn't done onboarding
    cy.window().then((win) => {
      win.localStorage.setItem('scaffold-ui-guide-seen', '1');
    });
    cy.visit('/');
  });

  it('shows the onboarding overlay with spotlight', () => {
    cy.get('.onboarding-overlay', { timeout: 3000 }).should('be.visible');
    cy.get('.onboarding-tooltip').should('be.visible');
    cy.get('.onboarding-spotlight').should('exist');
  });

  it('displays step counter', () => {
    cy.get('.onboarding-tooltip__step').should('be.visible');
    cy.get('.onboarding-tooltip__step').should('contain.text', '1');
  });

  it('navigates forward through all steps', () => {
    let stepCount = 0;
    const maxSteps = 10; // Safety limit

    function clickNext() {
      cy.get('.onboarding-tooltip__btn--primary').then(($btn) => {
        if ($btn.length > 0 && stepCount < maxSteps) {
          stepCount++;
          cy.wrap($btn).click();
          // Check if tour is still visible
          cy.get('body').then(($body) => {
            if ($body.find('.onboarding-tooltip__btn--primary').length > 0) {
              clickNext();
            }
          });
        }
      });
    }

    clickNext();
    // After completing all steps, overlay should close
    cy.get('.onboarding-overlay').should('not.exist');
  });

  it('navigates backward with the Back button', () => {
    // Go to step 2
    cy.get('.onboarding-tooltip__btn--primary').click();
    cy.get('.onboarding-tooltip__step').should('contain.text', '2');

    // Go back to step 1
    cy.get('.onboarding-tooltip__btn--secondary').click();
    cy.get('.onboarding-tooltip__step').should('contain.text', '1');
  });

  it('skips the tour with the Skip button', () => {
    cy.get('.onboarding-tooltip__btn--ghost').click();
    cy.get('.onboarding-overlay').should('not.exist');
  });

  it('closes the tour with the close button', () => {
    cy.get('.onboarding-tooltip__close').click();
    cy.get('.onboarding-overlay').should('not.exist');
  });

  it('remembers that tour was completed', () => {
    // Skip the tour
    cy.get('.onboarding-tooltip__btn--ghost').click();
    cy.get('.onboarding-overlay').should('not.exist');

    // Reload — tour should not reappear
    cy.reload();
    cy.get('.onboarding-overlay').should('not.exist');
  });
});
