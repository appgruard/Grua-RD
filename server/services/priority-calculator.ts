import { logSystem } from '../logger';

export type ModuleWeight = 'critical' | 'high' | 'medium' | 'low';
export type CalculatedPriority = 'urgente' | 'alta' | 'media' | 'baja';

interface PriorityFactors {
  errorSource: string;
  errorType: string;
  severity: string;
  occurrenceCount: number;
  route?: string;
  metadata?: Record<string, any>;
  cascadeIndicators?: {
    hasRelatedErrors: boolean;
    relatedErrorCount: number;
    isRootCause: boolean;
  };
}

interface PriorityScore {
  total: number;
  breakdown: {
    moduleWeight: number;
    severityWeight: number;
    frequencyWeight: number;
    cascadeWeight: number;
    patternWeight: number;
  };
  priority: CalculatedPriority;
  reasoning: string[];
}

const MODULE_WEIGHTS: Record<string, number> = {
  payment: 100,
  database: 90,
  authentication: 85,
  file_storage: 70,
  external_api: 65,
  websocket: 60,
  email: 50,
  sms: 50,
  internal_service: 40,
  unknown: 30,
};

const ROUTE_PATTERNS: Record<string, number> = {
  '/api/payment': 100,
  '/api/azul': 100,
  '/api/wallet': 95,
  '/api/auth': 85,
  '/api/servicios': 75,
  '/api/drivers': 65,
  '/api/admin': 60,
  '/api/tickets': 55,
  '/api/chat': 50,
};

const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

const ERROR_TYPE_WEIGHTS: Record<string, number> = {
  connection_error: 80,
  timeout_error: 70,
  configuration_error: 90,
  integration_error: 65,
  system_error: 75,
  permission_error: 40,
  validation_error: 20,
  not_found_error: 15,
  rate_limit_error: 30,
  unknown_error: 50,
};

const CRITICAL_KEYWORDS = [
  'payment',
  'transaction',
  'money',
  'credit',
  'debit',
  'wallet',
  'balance',
  'payout',
  'azul',
  'stripe',
  'authentication',
  'password',
  'token',
  'session',
  'database',
  'connection',
  'pool',
  'crash',
  'fatal',
  'corruption',
  'data loss',
];

class PriorityCalculatorService {
  calculatePriority(factors: PriorityFactors): PriorityScore {
    const reasoning: string[] = [];
    
    const moduleWeight = this.calculateModuleWeight(factors.errorSource, factors.route);
    const severityWeight = this.calculateSeverityWeight(factors.severity, factors.errorType);
    const frequencyWeight = this.calculateFrequencyWeight(factors.occurrenceCount);
    const cascadeWeight = this.calculateCascadeWeight(factors.cascadeIndicators);
    const patternWeight = this.calculatePatternWeight(factors.metadata, factors.route);
    
    if (moduleWeight >= 80) {
      reasoning.push(`Módulo crítico afectado: ${factors.errorSource}`);
    }
    if (severityWeight >= 75) {
      reasoning.push(`Severidad alta del error: ${factors.severity}`);
    }
    if (frequencyWeight >= 60) {
      reasoning.push(`Alta frecuencia de ocurrencias: ${factors.occurrenceCount}`);
    }
    if (cascadeWeight > 0 && factors.cascadeIndicators?.hasRelatedErrors) {
      reasoning.push(`Error con ${factors.cascadeIndicators.relatedErrorCount} errores relacionados`);
    }
    if (patternWeight >= 50) {
      reasoning.push('Contiene patrones críticos en metadata');
    }

    const total = Math.round(
      (moduleWeight * 0.30) +
      (severityWeight * 0.25) +
      (frequencyWeight * 0.20) +
      (cascadeWeight * 0.15) +
      (patternWeight * 0.10)
    );

    const priority = this.scoreToPriority(total);
    
    logSystem.debug('Priority calculated', {
      factors: {
        errorSource: factors.errorSource,
        severity: factors.severity,
        occurrenceCount: factors.occurrenceCount,
      },
      score: total,
      priority,
    });

    return {
      total,
      breakdown: {
        moduleWeight,
        severityWeight,
        frequencyWeight,
        cascadeWeight,
        patternWeight,
      },
      priority,
      reasoning,
    };
  }

  private calculateModuleWeight(errorSource: string, route?: string): number {
    let weight = MODULE_WEIGHTS[errorSource] || MODULE_WEIGHTS.unknown;
    
    if (route) {
      for (const [pattern, patternWeight] of Object.entries(ROUTE_PATTERNS)) {
        if (route.startsWith(pattern)) {
          weight = Math.max(weight, patternWeight);
          break;
        }
      }
    }
    
    return weight;
  }

  private calculateSeverityWeight(severity: string, errorType: string): number {
    const severityScore = SEVERITY_WEIGHTS[severity] || 50;
    const typeScore = ERROR_TYPE_WEIGHTS[errorType] || 50;
    
    return Math.round((severityScore * 0.6) + (typeScore * 0.4));
  }

  private calculateFrequencyWeight(occurrenceCount: number): number {
    if (occurrenceCount >= 100) return 100;
    if (occurrenceCount >= 50) return 85;
    if (occurrenceCount >= 20) return 70;
    if (occurrenceCount >= 10) return 55;
    if (occurrenceCount >= 5) return 40;
    if (occurrenceCount >= 3) return 25;
    return 10;
  }

  private calculateCascadeWeight(cascadeIndicators?: PriorityFactors['cascadeIndicators']): number {
    if (!cascadeIndicators) return 0;
    
    let weight = 0;
    
    if (cascadeIndicators.hasRelatedErrors) {
      weight += 30;
      weight += Math.min(cascadeIndicators.relatedErrorCount * 10, 50);
    }
    
    if (cascadeIndicators.isRootCause) {
      weight += 20;
    }
    
    return Math.min(weight, 100);
  }

  private calculatePatternWeight(metadata?: Record<string, any>, route?: string): number {
    let weight = 0;
    const searchText = JSON.stringify(metadata || {}).toLowerCase() + (route || '').toLowerCase();
    
    for (const keyword of CRITICAL_KEYWORDS) {
      if (searchText.includes(keyword)) {
        weight += 15;
      }
    }
    
    return Math.min(weight, 100);
  }

  private scoreToPriority(score: number): CalculatedPriority {
    if (score >= 80) return 'urgente';
    if (score >= 60) return 'alta';
    if (score >= 40) return 'media';
    return 'baja';
  }

  mapSeverityToInitialPriority(severity: string): CalculatedPriority {
    const mapping: Record<string, CalculatedPriority> = {
      critical: 'urgente',
      high: 'alta',
      medium: 'media',
      low: 'baja',
    };
    return mapping[severity] || 'media';
  }
}

export const priorityCalculator = new PriorityCalculatorService();
