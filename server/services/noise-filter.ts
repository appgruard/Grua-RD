import { logSystem } from '../logger';

export interface NoiseFilterResult {
  shouldProcess: boolean;
  reason?: string;
  isTransient: boolean;
  suppressDuration?: number;
  groupKey?: string;
}

interface ErrorPattern {
  pattern: RegExp;
  transient: boolean;
  suppressMinutes?: number;
  description: string;
}

const KNOWN_TRANSIENT_PATTERNS: ErrorPattern[] = [
  {
    pattern: /ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i,
    transient: true,
    suppressMinutes: 5,
    description: 'Network connection error - usually resolves automatically',
  },
  {
    pattern: /socket hang up|network socket disconnected/i,
    transient: true,
    suppressMinutes: 5,
    description: 'Socket disconnection - typically transient',
  },
  {
    pattern: /EPIPE|write EPIPE/i,
    transient: true,
    suppressMinutes: 3,
    description: 'Broken pipe - client disconnected',
  },
  {
    pattern: /too many connections|connection pool exhausted/i,
    transient: true,
    suppressMinutes: 10,
    description: 'Connection pool saturation - usually recovers',
  },
  {
    pattern: /rate limit|429|too many requests/i,
    transient: true,
    suppressMinutes: 15,
    description: 'Rate limiting - wait for reset',
  },
  {
    pattern: /DNS resolution|getaddrinfo|ENOENT.*dns/i,
    transient: true,
    suppressMinutes: 5,
    description: 'DNS resolution issues - often temporary',
  },
  {
    pattern: /certificate.*expired|SSL.*error|TLS.*handshake/i,
    transient: false,
    description: 'SSL/TLS certificate issue - requires attention',
  },
];

const IGNORABLE_PATTERNS: ErrorPattern[] = [
  {
    pattern: /favicon\.ico|robots\.txt|\.well-known/i,
    transient: false,
    description: 'Static file requests - ignorable',
  },
  {
    pattern: /healthcheck|health-check|ping|ready|alive/i,
    transient: false,
    description: 'Health check endpoint - monitoring noise',
  },
  {
    pattern: /preflight|OPTIONS/i,
    transient: false,
    description: 'CORS preflight request - expected behavior',
  },
  {
    pattern: /user canceled|user aborted|AbortError/i,
    transient: false,
    description: 'User-initiated cancellation - not an error',
  },
  {
    pattern: /session.*expired|session not found/i,
    transient: false,
    description: 'Normal session expiration',
  },
];

const GROUPING_PATTERNS: Array<{ pattern: RegExp; groupKey: string }> = [
  { pattern: /database|postgres|pg_|connection pool/i, groupKey: 'database_errors' },
  { pattern: /azul|payment|stripe|transaction/i, groupKey: 'payment_errors' },
  { pattern: /email|smtp|resend|sendgrid/i, groupKey: 'email_errors' },
  { pattern: /sms|twilio|vonage/i, groupKey: 'sms_errors' },
  { pattern: /storage|s3|replit.*storage|upload|download/i, groupKey: 'storage_errors' },
  { pattern: /websocket|ws:|socket/i, groupKey: 'websocket_errors' },
  { pattern: /jira|github|external.*api/i, groupKey: 'integration_errors' },
  { pattern: /auth|login|session|token|jwt/i, groupKey: 'auth_errors' },
];

class NoiseFilterService {
  private suppressedErrors: Map<string, { until: Date; count: number }> = new Map();
  
  evaluateError(
    message: string,
    stackTrace?: string,
    route?: string,
    metadata?: Record<string, any>
  ): NoiseFilterResult {
    const fullContext = [
      message,
      stackTrace || '',
      route || '',
      JSON.stringify(metadata || {}),
    ].join(' ');

    const ignorableMatch = this.matchesIgnorablePattern(message, route);
    if (ignorableMatch) {
      logSystem.debug('Error filtered as ignorable', {
        message: message.substring(0, 100),
        reason: ignorableMatch.description,
      });
      return {
        shouldProcess: false,
        reason: ignorableMatch.description,
        isTransient: false,
      };
    }

    const transientMatch = this.matchesTransientPattern(message);
    if (transientMatch) {
      const fingerprint = this.generateSuppressionKey(message, route);
      const suppressed = this.suppressedErrors.get(fingerprint);
      
      if (suppressed && suppressed.until > new Date()) {
        suppressed.count++;
        logSystem.debug('Error suppressed (transient)', {
          message: message.substring(0, 100),
          suppressedCount: suppressed.count,
        });
        return {
          shouldProcess: false,
          reason: `Suppressed transient error (${suppressed.count} occurrences)`,
          isTransient: true,
          suppressDuration: transientMatch.suppressMinutes,
        };
      }

      if (transientMatch.suppressMinutes) {
        const until = new Date(Date.now() + transientMatch.suppressMinutes * 60 * 1000);
        this.suppressedErrors.set(fingerprint, { until, count: 1 });
        
        if (this.suppressedErrors.size > 1000) {
          this.cleanupExpiredSuppressions();
        }
      }

      return {
        shouldProcess: true,
        reason: transientMatch.description,
        isTransient: true,
        suppressDuration: transientMatch.suppressMinutes,
        groupKey: this.findGroupKey(fullContext),
      };
    }

    return {
      shouldProcess: true,
      isTransient: false,
      groupKey: this.findGroupKey(fullContext),
    };
  }

  private matchesIgnorablePattern(message: string, route?: string): ErrorPattern | null {
    const combined = `${message} ${route || ''}`;
    
    for (const pattern of IGNORABLE_PATTERNS) {
      if (pattern.pattern.test(combined)) {
        return pattern;
      }
    }
    
    return null;
  }

  private matchesTransientPattern(message: string): ErrorPattern | null {
    for (const pattern of KNOWN_TRANSIENT_PATTERNS) {
      if (pattern.pattern.test(message)) {
        return pattern;
      }
    }
    return null;
  }

  private findGroupKey(context: string): string | undefined {
    for (const { pattern, groupKey } of GROUPING_PATTERNS) {
      if (pattern.test(context)) {
        return groupKey;
      }
    }
    return undefined;
  }

  private generateSuppressionKey(message: string, route?: string): string {
    const normalized = message
      .replace(/\d+/g, 'N')
      .replace(/[a-f0-9-]{36}/gi, 'UUID')
      .substring(0, 100);
    return `${normalized}:${route || 'unknown'}`;
  }

  private cleanupExpiredSuppressions(): void {
    const now = new Date();
    let cleaned = 0;
    const keysToDelete: string[] = [];
    
    this.suppressedErrors.forEach((value, key) => {
      if (value.until < now) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.suppressedErrors.delete(key);
      cleaned++;
    });
    
    if (cleaned > 0) {
      logSystem.debug('Cleaned up expired suppressions', { count: cleaned });
    }
  }

  getSuppressionStats(): { active: number; patterns: number } {
    this.cleanupExpiredSuppressions();
    return {
      active: this.suppressedErrors.size,
      patterns: KNOWN_TRANSIENT_PATTERNS.length + IGNORABLE_PATTERNS.length,
    };
  }
}

export const noiseFilter = new NoiseFilterService();
