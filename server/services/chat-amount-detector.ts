/**
 * Chat Amount Detector Service
 * Detects currency amounts in chat messages for the negotiation system
 * Supports Dominican Peso (RD$) and various formats
 */

export interface DetectedAmount {
  amount: number;
  rawMatch: string;
  startIndex: number;
  endIndex: number;
}

const AMOUNT_PATTERNS = [
  /RD\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/gi,
  /RD\$\s*([0-9]+(?:\.[0-9]{1,2})?)/gi,
  /\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/gi,
  /\$\s*([0-9]+(?:\.[0-9]{1,2})?)/gi,
  /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*pesos/gi,
  /([0-9]+(?:\.[0-9]{1,2})?)\s*pesos/gi,
  /el\s+costo\s+(?:es|seria|sería|será)\s+(?:de\s+)?(?:RD\$?\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/gi,
  /(?:serian|serían|seria|sería|son|cuesta|costaria|costaría|vale|valdria|valdría)\s+(?:RD\$?\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/gi,
  /(?:te\s+)?(?:cobro|cobraria|cobraría)\s+(?:RD\$?\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/gi,
  /(?:precio|monto|costo|total)(?:\s+(?:es|seria|sería|de))?\s*:?\s*(?:RD\$?\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/gi,
];

const MIN_AMOUNT = 500;
const MAX_AMOUNT = 500000;

function parseAmount(rawAmount: string): number {
  const cleaned = rawAmount.replace(/,/g, '').replace(/\s/g, '');
  return parseFloat(cleaned);
}

export function detectAmount(message: string): DetectedAmount | null {
  let bestMatch: DetectedAmount | null = null;

  for (const pattern of AMOUNT_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(message)) !== null) {
      const rawMatch = match[1];
      const amount = parseAmount(rawMatch);

      if (amount >= MIN_AMOUNT && amount <= MAX_AMOUNT) {
        if (!bestMatch || amount > bestMatch.amount) {
          bestMatch = {
            amount,
            rawMatch: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
          };
        }
      }
    }
  }

  return bestMatch;
}

export function isAmountMessage(message: string): boolean {
  return detectAmount(message) !== null;
}

export function extractAllAmounts(message: string): DetectedAmount[] {
  const amounts: DetectedAmount[] = [];
  const seen = new Set<number>();

  for (const pattern of AMOUNT_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(message)) !== null) {
      const rawMatch = match[1];
      const amount = parseAmount(rawMatch);

      if (amount >= MIN_AMOUNT && amount <= MAX_AMOUNT && !seen.has(amount)) {
        seen.add(amount);
        amounts.push({
          amount,
          rawMatch: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  return amounts.sort((a, b) => b.amount - a.amount);
}

export function formatAmount(amount: number): string {
  return `RD$ ${amount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function isValidNegotiationAmount(amount: number): boolean {
  return amount >= MIN_AMOUNT && amount <= MAX_AMOUNT && Number.isFinite(amount);
}

export const NEGOTIATION_AMOUNT_LIMITS = {
  min: MIN_AMOUNT,
  max: MAX_AMOUNT,
} as const;
