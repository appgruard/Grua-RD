/**
 * Unit Tests for Chat Amount Detector Service
 * Tests detection of currency amounts in chat messages for the negotiation system
 */

import { describe, it, expect } from '@jest/globals';
import {
  detectAmount,
  isAmountMessage,
  extractAllAmounts,
  formatAmount,
  isValidNegotiationAmount,
  NEGOTIATION_AMOUNT_LIMITS,
  type DetectedAmount,
} from '../server/services/chat-amount-detector';

describe('Chat Amount Detector', () => {
  
  describe('detectAmount()', () => {
    
    describe('RD$ format detection', () => {
      it('should detect RD$ format with comma separator', () => {
        const result = detectAmount('El costo sería RD$ 5,000');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(5000);
      });

      it('should detect RD$ format without space', () => {
        const result = detectAmount('Te cobro RD$3,500');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(3500);
      });

      it('should detect RD$ format with decimals', () => {
        const result = detectAmount('El monto es RD$ 1,500.50');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(1500.50);
      });

      it('should detect large amounts with RD$', () => {
        const result = detectAmount('Por la extracción serían RD$ 150,000');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(150000);
      });
    });

    describe('$ format detection', () => {
      it('should detect $ format with comma separator', () => {
        const result = detectAmount('Son $8,000 pesos');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(8000);
      });

      it('should detect $ format without comma', () => {
        const result = detectAmount('Cuesta $500');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(500);
      });
    });

    describe('Pesos format detection', () => {
      it('should detect "X pesos" format', () => {
        const result = detectAmount('Te cobro 3,000 pesos');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(3000);
      });

      it('should detect "X pesos" format without comma', () => {
        const result = detectAmount('Son 5000 pesos');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(5000);
      });
    });

    describe('Natural language detection', () => {
      it('should detect "el costo es X" format', () => {
        const result = detectAmount('El costo es 7,500');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(7500);
      });

      it('should detect "el costo seria X" format', () => {
        const result = detectAmount('El costo seria de 10,000');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(10000);
      });

      it('should detect "serian X" format', () => {
        const result = detectAmount('Serían RD$6,000');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(6000);
      });

      it('should detect "te cobro X" format', () => {
        const result = detectAmount('Te cobro 4,500');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(4500);
      });

      it('should detect "cobraría X" format', () => {
        const result = detectAmount('Te cobraría 8,000');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(8000);
      });

      it('should detect "precio: X" format', () => {
        const result = detectAmount('Precio: RD$12,000');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(12000);
      });

      it('should detect "monto X" format', () => {
        const result = detectAmount('El monto es 9,000');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(9000);
      });

      it('should detect "total X" format', () => {
        const result = detectAmount('Total: 15,000');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(15000);
      });

      it('should detect "cuesta X" format', () => {
        const result = detectAmount('Esto cuesta 7,000');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(7000);
      });

      it('should detect "vale X" format', () => {
        const result = detectAmount('Vale 5,500');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(5500);
      });
    });

    describe('Amount limits validation', () => {
      it('should not detect amounts below minimum (500)', () => {
        const result = detectAmount('Te cobro RD$ 200');
        expect(result).toBeNull();
      });

      it('should detect minimum amount (500)', () => {
        const result = detectAmount('Te cobro RD$ 500');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(500);
      });

      it('should detect maximum amount (500,000)', () => {
        const result = detectAmount('El total es RD$ 500,000');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(500000);
      });

      it('should detect only amounts within valid range', () => {
        const result = detectAmount('Serían RD$ 600,000');
        if (result !== null) {
          expect(result.amount).toBeGreaterThanOrEqual(500);
          expect(result.amount).toBeLessThanOrEqual(500000);
        }
      });
    });

    describe('Edge cases', () => {
      it('should return null for messages without amounts', () => {
        const result = detectAmount('Hola, buenos días');
        expect(result).toBeNull();
      });

      it('should return null for empty string', () => {
        const result = detectAmount('');
        expect(result).toBeNull();
      });

      it('should pick the highest valid amount when multiple are present', () => {
        const result = detectAmount('El mínimo es RD$1,000 pero te recomiendo RD$5,000');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(5000);
      });

      it('should handle amounts with accent marks', () => {
        const result = detectAmount('El costo sería RD$ 3,000');
        expect(result).not.toBeNull();
        expect(result!.amount).toBe(3000);
      });
    });

    describe('Detection metadata', () => {
      it('should include correct startIndex and endIndex', () => {
        const message = 'El precio es RD$ 5,000 pesos';
        const result = detectAmount(message);
        expect(result).not.toBeNull();
        expect(result!.startIndex).toBeGreaterThanOrEqual(0);
        expect(result!.endIndex).toBeLessThanOrEqual(message.length);
        expect(result!.rawMatch).toContain('5,000');
      });
    });
  });

  describe('isAmountMessage()', () => {
    it('should return true for messages with valid amounts', () => {
      expect(isAmountMessage('Te cobro RD$ 5,000')).toBe(true);
      expect(isAmountMessage('Son 3,000 pesos')).toBe(true);
      expect(isAmountMessage('El costo es $8,000')).toBe(true);
    });

    it('should return false for messages without amounts', () => {
      expect(isAmountMessage('Hola, cómo estás?')).toBe(false);
      expect(isAmountMessage('El vehículo está muy lejos')).toBe(false);
      expect(isAmountMessage('')).toBe(false);
    });

    it('should return false for amounts outside valid range', () => {
      expect(isAmountMessage('Te cobro RD$ 100')).toBe(false);
    });
  });

  describe('extractAllAmounts()', () => {
    it('should extract multiple amounts from a message', () => {
      const amounts = extractAllAmounts('Opción 1: RD$3,000, Opción 2: RD$5,000');
      expect(amounts.length).toBeGreaterThanOrEqual(2);
      const values = amounts.map(a => a.amount);
      expect(values).toContain(3000);
      expect(values).toContain(5000);
    });

    it('should return empty array for messages without amounts', () => {
      const amounts = extractAllAmounts('Sin montos aquí');
      expect(amounts).toEqual([]);
    });

    it('should sort amounts in descending order', () => {
      const amounts = extractAllAmounts('RD$1,000 o RD$5,000 o RD$3,000');
      expect(amounts.length).toBeGreaterThan(0);
      for (let i = 1; i < amounts.length; i++) {
        expect(amounts[i - 1].amount).toBeGreaterThanOrEqual(amounts[i].amount);
      }
    });

    it('should not include duplicate amounts', () => {
      const amounts = extractAllAmounts('Son RD$5,000. Te confirmo: 5,000 pesos');
      const uniqueValues = new Set(amounts.map(a => a.amount));
      expect(amounts.length).toBe(uniqueValues.size);
    });

    it('should only include amounts within valid range', () => {
      const amounts = extractAllAmounts('RD$100 no, RD$5,000 sí, RD$1,000,000 no');
      amounts.forEach(a => {
        expect(a.amount).toBeGreaterThanOrEqual(NEGOTIATION_AMOUNT_LIMITS.min);
        expect(a.amount).toBeLessThanOrEqual(NEGOTIATION_AMOUNT_LIMITS.max);
      });
    });
  });

  describe('formatAmount()', () => {
    it('should format amount with RD$ prefix', () => {
      const formatted = formatAmount(5000);
      expect(formatted).toContain('RD$');
      expect(formatted).toContain('5');
    });

    it('should format amount with two decimal places', () => {
      const formatted = formatAmount(1500.50);
      const containsExpectedFormat = formatted.includes('1,500.50') || formatted.includes('1.500,50');
      expect(containsExpectedFormat).toBe(true);
    });

    it('should add .00 to whole numbers', () => {
      const formatted = formatAmount(3000);
      expect(formatted).toMatch(/3[,.]000[,.]00/);
    });

    it('should handle large amounts with thousand separators', () => {
      const formatted = formatAmount(150000);
      expect(formatted).toContain('150');
    });
  });

  describe('isValidNegotiationAmount()', () => {
    it('should return true for valid amounts', () => {
      expect(isValidNegotiationAmount(500)).toBe(true);
      expect(isValidNegotiationAmount(5000)).toBe(true);
      expect(isValidNegotiationAmount(500000)).toBe(true);
      expect(isValidNegotiationAmount(50000.50)).toBe(true);
    });

    it('should return false for amounts below minimum', () => {
      expect(isValidNegotiationAmount(499)).toBe(false);
      expect(isValidNegotiationAmount(0)).toBe(false);
      expect(isValidNegotiationAmount(-1000)).toBe(false);
    });

    it('should return false for amounts above maximum', () => {
      expect(isValidNegotiationAmount(500001)).toBe(false);
      expect(isValidNegotiationAmount(1000000)).toBe(false);
    });

    it('should return false for non-finite numbers', () => {
      expect(isValidNegotiationAmount(Infinity)).toBe(false);
      expect(isValidNegotiationAmount(-Infinity)).toBe(false);
      expect(isValidNegotiationAmount(NaN)).toBe(false);
    });
  });

  describe('NEGOTIATION_AMOUNT_LIMITS', () => {
    it('should have correct min and max values', () => {
      expect(NEGOTIATION_AMOUNT_LIMITS.min).toBe(500);
      expect(NEGOTIATION_AMOUNT_LIMITS.max).toBe(500000);
    });
  });
});
