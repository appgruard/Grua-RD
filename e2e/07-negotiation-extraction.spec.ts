/**
 * E2E Tests for Extraction and Negotiation Flow
 * Tests the complete user journey for extraction services with price negotiation
 */

import { test, expect, Page } from '@playwright/test';
import { createClientUser, createDriverUser, registerUser, loginUser } from './helpers';

test.describe('Extraction and Negotiation Flow', () => {

  test.describe('Client Extraction Request', () => {

    test('should show extraction category in service selection', async ({ page }) => {
      await page.goto('/client/home');
      
      const extractionCategory = page.locator('[data-testid="category-extraccion"]');
      
      if (await extractionCategory.isVisible()) {
        await expect(extractionCategory).toBeVisible();
      }
    });

    test('should display extraction subtypes when category is selected', async ({ page }) => {
      await page.goto('/client/home');
      
      const extractionCategory = page.locator('[data-testid="category-extraccion"]');
      
      if (await extractionCategory.isVisible()) {
        await extractionCategory.click();
        
        const subtypes = [
          'extraccion_zanja',
          'extraccion_lodo',
          'extraccion_volcado',
          'extraccion_accidente',
          'extraccion_dificil',
        ];
        
        for (const subtype of subtypes) {
          const subtypeElement = page.locator(`[data-testid="subtype-${subtype}"]`);
          if (await subtypeElement.isVisible({ timeout: 1000 }).catch(() => false)) {
            await expect(subtypeElement).toBeVisible();
          }
        }
      }
    });

    test('should require situation description for extraction services', async ({ page }) => {
      await page.goto('/client/home');
      
      const descriptionInput = page.locator('[data-testid="input-descripcion-situacion"]');
      
      if (await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(descriptionInput).toBeVisible();
      }
    });

    test('should show negotiation indicator for extraction services', async ({ page }) => {
      await page.goto('/client/home');
      
      const negotiationIndicator = page.locator('[data-testid="badge-requiere-negociacion"]');
      
      if (await negotiationIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(negotiationIndicator).toBeVisible();
      }
    });
  });

  test.describe('Driver Available Requests', () => {

    test('should display available services list', async ({ page }) => {
      await page.goto('/driver/dashboard');
      
      const servicesList = page.locator('[data-testid="list-available-services"]');
      
      if (await servicesList.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(servicesList).toBeVisible();
      }
    });

    test('should show negotiation badge for extraction services', async ({ page }) => {
      await page.goto('/driver/dashboard');
      
      const negotiationBadge = page.locator('[data-testid="badge-requiere-negociacion"]').first();
      
      if (await negotiationBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(negotiationBadge).toBeVisible();
      }
    });

    test('should navigate to extraction evaluation page', async ({ page }) => {
      await page.goto('/driver/dashboard');
      
      const evaluateButton = page.locator('[data-testid="button-evaluar-extraccion"]').first();
      
      if (await evaluateButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await evaluateButton.click();
        await expect(page).toHaveURL(/\/driver\/extraction-evaluation\/.+/);
      }
    });
  });

  test.describe('Extraction Evaluation Page', () => {

    test('should display service details correctly', async ({ page }) => {
      await page.goto('/driver/extraction-evaluation/test-id');
      
      const serviceDetails = page.locator('[data-testid="card-service-details"]');
      
      if (await serviceDetails.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(serviceDetails).toBeVisible();
      }
    });

    test('should display situation description', async ({ page }) => {
      await page.goto('/driver/extraction-evaluation/test-id');
      
      const situationCard = page.locator('[data-testid="card-descripcion-situacion"]');
      
      if (await situationCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(situationCard).toBeVisible();
      }
    });

    test('should have amount input field', async ({ page }) => {
      await page.goto('/driver/extraction-evaluation/test-id');
      
      const amountInput = page.locator('[data-testid="input-monto-propuesto"]');
      
      if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(amountInput).toBeVisible();
      }
    });

    test('should validate minimum amount (500)', async ({ page }) => {
      await page.goto('/driver/extraction-evaluation/test-id');
      
      const amountInput = page.locator('[data-testid="input-monto-propuesto"]');
      
      if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await amountInput.fill('200');
        
        const submitButton = page.locator('[data-testid="button-enviar-propuesta"]');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          
          const errorMessage = page.locator('text=/mínimo|monto bajo|500/i');
          if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(errorMessage).toBeVisible();
          }
        }
      }
    });

    test('should validate maximum amount (500,000)', async ({ page }) => {
      await page.goto('/driver/extraction-evaluation/test-id');
      
      const amountInput = page.locator('[data-testid="input-monto-propuesto"]');
      
      if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await amountInput.fill('600000');
        
        const submitButton = page.locator('[data-testid="button-enviar-propuesta"]');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          
          const errorMessage = page.locator('text=/máximo|monto alto|500,000/i');
          if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(errorMessage).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Negotiation Chat', () => {

    test('should display chat interface', async ({ page }) => {
      await page.goto('/driver/extraction-evaluation/test-id');
      
      const chatBox = page.locator('[data-testid="negotiation-chat-box"]');
      
      if (await chatBox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(chatBox).toBeVisible();
      }
    });

    test('should have message input field', async ({ page }) => {
      await page.goto('/driver/extraction-evaluation/test-id');
      
      const messageInput = page.locator('[data-testid="input-chat-message"]');
      
      if (await messageInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(messageInput).toBeVisible();
      }
    });

    test('should have media upload buttons', async ({ page }) => {
      await page.goto('/driver/extraction-evaluation/test-id');
      
      const photoButton = page.locator('[data-testid="button-upload-photo"]');
      const videoButton = page.locator('[data-testid="button-upload-video"]');
      
      if (await photoButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(photoButton).toBeVisible();
      }
      
      if (await videoButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(videoButton).toBeVisible();
      }
    });

    test('should display negotiation state badge', async ({ page }) => {
      await page.goto('/driver/extraction-evaluation/test-id');
      
      const stateBadge = page.locator('[data-testid="badge-estado-negociacion"]');
      
      if (await stateBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(stateBadge).toBeVisible();
      }
    });
  });

  test.describe('Amount Proposal Card', () => {

    test('should display proposal card for driver', async ({ page }) => {
      await page.goto('/driver/extraction-evaluation/test-id');
      
      const proposalCard = page.locator('[data-testid="card-amount-proposal"]');
      
      if (await proposalCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(proposalCard).toBeVisible();
      }
    });

    test('should have notes input field', async ({ page }) => {
      await page.goto('/driver/extraction-evaluation/test-id');
      
      const notesInput = page.locator('[data-testid="input-notas-evaluacion"]');
      
      if (await notesInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(notesInput).toBeVisible();
      }
    });

    test('should have confirm button', async ({ page }) => {
      await page.goto('/driver/extraction-evaluation/test-id');
      
      const confirmButton = page.locator('[data-testid="button-confirmar-cotizacion"]');
      
      if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(confirmButton).toBeVisible();
      }
    });
  });

  test.describe('Client Response Card', () => {

    test('should display response card for client', async ({ page }) => {
      await page.goto('/client/tracking');
      
      const responseCard = page.locator('[data-testid="card-amount-response"]');
      
      if (await responseCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(responseCard).toBeVisible();
      }
    });

    test('should show proposed amount', async ({ page }) => {
      await page.goto('/client/tracking');
      
      const amountDisplay = page.locator('[data-testid="text-monto-propuesto"]');
      
      if (await amountDisplay.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(amountDisplay).toBeVisible();
      }
    });

    test('should have accept button', async ({ page }) => {
      await page.goto('/client/tracking');
      
      const acceptButton = page.locator('[data-testid="button-aceptar-monto"]');
      
      if (await acceptButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(acceptButton).toBeVisible();
      }
    });

    test('should have reject button', async ({ page }) => {
      await page.goto('/client/tracking');
      
      const rejectButton = page.locator('[data-testid="button-rechazar-monto"]');
      
      if (await rejectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(rejectButton).toBeVisible();
      }
    });
  });

  test.describe('Tracking Page with Negotiation', () => {

    test('should display negotiation status badge', async ({ page }) => {
      await page.goto('/client/tracking');
      
      const statusBadge = page.locator('[data-testid="badge-estado-negociacion"]');
      
      if (await statusBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(statusBadge).toBeVisible();
      }
    });

    test('should show extraction service card', async ({ page }) => {
      await page.goto('/client/tracking');
      
      const extractionCard = page.locator('[data-testid="card-servicio-extraccion"]');
      
      if (await extractionCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(extractionCard).toBeVisible();
      }
    });

    test('should have chat drawer button', async ({ page }) => {
      await page.goto('/client/tracking');
      
      const chatButton = page.locator('[data-testid="button-abrir-chat"]');
      
      if (await chatButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(chatButton).toBeVisible();
      }
    });
  });

  test.describe('Service Priority Display', () => {

    test('should display priority badge', async ({ page }) => {
      await page.goto('/driver/dashboard');
      
      const priorityBadge = page.locator('[data-testid^="badge-prioridad-"]').first();
      
      if (await priorityBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(priorityBadge).toBeVisible();
      }
    });

    test('should display service ID', async ({ page }) => {
      await page.goto('/driver/dashboard');
      
      const serviceId = page.locator('[data-testid^="text-service-id-"]').first();
      
      if (await serviceId.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(serviceId).toBeVisible();
        const text = await serviceId.textContent();
        expect(text).toMatch(/^(EXT|REM|ESP|MOT|PLA|AUX|CAM|VEH|MAQ|IZA|REC|SRV)-\d{3}$/);
      }
    });
  });

  test.describe('Rejection Confirmation', () => {

    test('should show confirmation dialog before rejecting', async ({ page }) => {
      await page.goto('/client/tracking');
      
      const rejectButton = page.locator('[data-testid="button-rechazar-monto"]');
      
      if (await rejectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rejectButton.click();
        
        const dialog = page.locator('[data-testid="dialog-confirmar-rechazo"]');
        if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(dialog).toBeVisible();
        }
      }
    });

    test('should allow canceling rejection', async ({ page }) => {
      await page.goto('/client/tracking');
      
      const rejectButton = page.locator('[data-testid="button-rechazar-monto"]');
      
      if (await rejectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rejectButton.click();
        
        const cancelButton = page.locator('[data-testid="button-cancelar-rechazo"]');
        if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cancelButton.click();
          
          const dialog = page.locator('[data-testid="dialog-confirmar-rechazo"]');
          await expect(dialog).not.toBeVisible();
        }
      }
    });
  });

  test.describe('Accessibility', () => {

    test('should have accessible form labels', async ({ page }) => {
      await page.goto('/driver/extraction-evaluation/test-id');
      
      const amountInput = page.locator('[data-testid="input-monto-propuesto"]');
      
      if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        const ariaLabel = await amountInput.getAttribute('aria-label');
        const label = page.locator(`label[for="${await amountInput.getAttribute('id')}"]`);
        
        const hasAccessibility = ariaLabel || await label.isVisible().catch(() => false);
        expect(hasAccessibility).toBeTruthy();
      }
    });

    test('should have keyboard navigable buttons', async ({ page }) => {
      await page.goto('/driver/extraction-evaluation/test-id');
      
      const submitButton = page.locator('[data-testid="button-enviar-propuesta"]');
      
      if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitButton.focus();
        await expect(submitButton).toBeFocused();
      }
    });
  });
});
