import { getConfiguredAdapters, getInsuranceAdapter, InsurerCode } from './factory';
import { 
  InsurancePolicy, 
  TowingAuthorization, 
  TowingClaimData, 
  ClaimResult,
  AdapterHealthCheck 
} from './types';
import { logSystem as logger } from '../../logger';

export interface ValidationResult {
  found: boolean;
  policy?: InsurancePolicy;
  insurerCode?: InsurerCode;
  error?: string;
}

export interface MultiInsurerValidationResult {
  found: boolean;
  policies: Array<{
    insurerCode: InsurerCode;
    policy: InsurancePolicy;
  }>;
  errors: Array<{
    insurerCode: string;
    error: string;
  }>;
}

class InsuranceValidationService {
  async validatePolicyByNumber(
    policyNumber: string, 
    vehiclePlate: string,
    insurerCode?: InsurerCode
  ): Promise<ValidationResult> {
    logger.info('Validating insurance policy', { policyNumber, vehiclePlate, insurerCode });

    if (insurerCode) {
      try {
        const adapter = getInsuranceAdapter(insurerCode);
        const policy = await adapter.validatePolicy(policyNumber, vehiclePlate);
        
        if (policy) {
          return { found: true, policy, insurerCode };
        }
        return { found: false };
      } catch (error: any) {
        logger.error('Policy validation error', { error, insurerCode });
        return { found: false, error: error.message };
      }
    }

    const adapters = getConfiguredAdapters();
    
    for (const adapter of adapters) {
      try {
        const policy = await adapter.validatePolicy(policyNumber, vehiclePlate);
        if (policy) {
          logger.info('Policy found', { 
            policyNumber, 
            insurerCode: adapter.insurerCode 
          });
          return { 
            found: true, 
            policy, 
            insurerCode: adapter.insurerCode as InsurerCode 
          };
        }
      } catch (error: any) {
        logger.warn('Adapter validation failed', { 
          insurerCode: adapter.insurerCode, 
          error: error.message 
        });
      }
    }

    return { found: false };
  }

  async validatePolicyByCedula(
    cedula: string, 
    vehiclePlate: string
  ): Promise<MultiInsurerValidationResult> {
    logger.info('Validating insurance by cedula', { cedula, vehiclePlate });

    const adapters = getConfiguredAdapters();
    const policies: Array<{ insurerCode: InsurerCode; policy: InsurancePolicy }> = [];
    const errors: Array<{ insurerCode: string; error: string }> = [];

    const validationPromises = adapters.map(async (adapter) => {
      try {
        const policy = await adapter.validatePolicyByCedula(cedula, vehiclePlate);
        if (policy) {
          return { 
            insurerCode: adapter.insurerCode as InsurerCode, 
            policy 
          };
        }
        return null;
      } catch (error: any) {
        return { 
          error: true, 
          insurerCode: adapter.insurerCode, 
          message: error.message 
        };
      }
    });

    const results = await Promise.all(validationPromises);

    for (const result of results) {
      if (!result) continue;
      
      if ('error' in result && result.error) {
        errors.push({ 
          insurerCode: result.insurerCode as string, 
          error: result.message as string 
        });
      } else if ('policy' in result) {
        policies.push(result as { insurerCode: InsurerCode; policy: InsurancePolicy });
      }
    }

    logger.info('Cedula validation complete', { 
      found: policies.length > 0, 
      count: policies.length 
    });

    return {
      found: policies.length > 0,
      policies,
      errors,
    };
  }

  async requestTowingAuthorization(
    policyNumber: string,
    vehiclePlate: string,
    insurerCode: InsurerCode
  ): Promise<TowingAuthorization> {
    logger.info('Requesting towing authorization', { policyNumber, insurerCode });

    const adapter = getInsuranceAdapter(insurerCode);
    
    const policy = await adapter.validatePolicy(policyNumber, vehiclePlate);
    if (!policy) {
      return {
        authorized: false,
        reason: 'Poliza no encontrada o no valida',
      };
    }

    return adapter.requestTowingAuthorization(policy);
  }

  async submitTowingClaim(
    insurerCode: InsurerCode,
    claimData: TowingClaimData
  ): Promise<ClaimResult> {
    logger.info('Submitting towing claim', { 
      insurerCode, 
      servicioId: claimData.servicioId 
    });

    const adapter = getInsuranceAdapter(insurerCode);
    return adapter.submitTowingClaim(claimData);
  }

  async cancelAuthorization(
    insurerCode: InsurerCode,
    authorizationCode: string
  ): Promise<boolean> {
    logger.info('Canceling authorization', { insurerCode, authorizationCode });

    const adapter = getInsuranceAdapter(insurerCode);
    return adapter.cancelAuthorization(authorizationCode);
  }

  async checkAllAdaptersHealth(): Promise<Map<string, AdapterHealthCheck>> {
    const adapters = getConfiguredAdapters();
    const healthResults = new Map<string, AdapterHealthCheck>();

    const healthPromises = adapters.map(async (adapter) => {
      const health = await adapter.healthCheck();
      return { code: adapter.insurerCode, health };
    });

    const results = await Promise.all(healthPromises);
    
    for (const { code, health } of results) {
      healthResults.set(code, health);
    }

    return healthResults;
  }
}

export const insuranceValidationService = new InsuranceValidationService();
