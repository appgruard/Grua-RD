import { BaseInsuranceAdapter } from '../adapter';
import { 
  InsurancePolicy, 
  TowingAuthorization, 
  TowingClaimData, 
  ClaimResult,
  AdapterHealthCheck 
} from '../types';
import { logSystem as logger } from '../../../logger';

const mockPolicies: Map<string, InsurancePolicy> = new Map([
  ['POL-001-2024', {
    policyNumber: 'POL-001-2024',
    holderName: 'Juan Carlos Rodriguez',
    holderCedula: '001-1234567-8',
    vehiclePlate: 'A123456',
    vehicleBrand: 'Toyota',
    vehicleModel: 'Corolla',
    vehicleYear: 2022,
    coverageType: 'full',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-01-01'),
    isActive: true,
    towingCoverage: {
      included: true,
      annualLimit: 3,
      remainingTows: 2,
      maxDistanceKm: 100,
      maxAmountPerTow: 5000,
    },
    insurerCode: 'MOCK',
    insurerName: 'Mock Insurance Co.',
  }],
  ['POL-002-2024', {
    policyNumber: 'POL-002-2024',
    holderName: 'Maria Elena Santos',
    holderCedula: '002-9876543-2',
    vehiclePlate: 'B789012',
    vehicleBrand: 'Honda',
    vehicleModel: 'Civic',
    vehicleYear: 2023,
    coverageType: 'premium',
    startDate: new Date('2024-03-15'),
    endDate: new Date('2025-03-15'),
    isActive: true,
    towingCoverage: {
      included: true,
      annualLimit: 5,
      remainingTows: 5,
      maxDistanceKm: 200,
      maxAmountPerTow: 10000,
    },
    insurerCode: 'MOCK',
    insurerName: 'Mock Insurance Co.',
  }],
  ['POL-003-2024', {
    policyNumber: 'POL-003-2024',
    holderName: 'Pedro Luis Martinez',
    holderCedula: '003-5555555-5',
    vehiclePlate: 'C345678',
    vehicleBrand: 'Hyundai',
    vehicleModel: 'Elantra',
    vehicleYear: 2021,
    coverageType: 'basic',
    startDate: new Date('2024-02-01'),
    endDate: new Date('2025-02-01'),
    isActive: true,
    towingCoverage: {
      included: false,
    },
    insurerCode: 'MOCK',
    insurerName: 'Mock Insurance Co.',
  }],
]);

const pendingAuthorizations: Map<string, { policy: InsurancePolicy; expiresAt: Date }> = new Map();

export class MockInsuranceAdapter extends BaseInsuranceAdapter {
  readonly insurerCode = 'MOCK';
  readonly insurerName = 'Mock Insurance Co. (Development)';

  private simulateLatency(): Promise<void> {
    const latency = Math.random() * 500 + 100;
    return new Promise(resolve => setTimeout(resolve, latency));
  }

  async validatePolicy(policyNumber: string, vehiclePlate: string): Promise<InsurancePolicy | null> {
    await this.simulateLatency();

    logger.info('MockAdapter: Validating policy', { policyNumber, vehiclePlate });

    const policy = mockPolicies.get(policyNumber);
    
    if (!policy) {
      logger.info('MockAdapter: Policy not found', { policyNumber });
      return null;
    }

    if (policy.vehiclePlate.toLowerCase() !== vehiclePlate.toLowerCase()) {
      logger.info('MockAdapter: Plate mismatch', { 
        policyPlate: policy.vehiclePlate, 
        providedPlate: vehiclePlate 
      });
      return null;
    }

    if (!this.isPolicyActive(policy)) {
      logger.info('MockAdapter: Policy is not active or expired', { policyNumber });
      return null;
    }

    return { ...policy };
  }

  async validatePolicyByCedula(cedula: string, vehiclePlate: string): Promise<InsurancePolicy | null> {
    await this.simulateLatency();

    logger.info('MockAdapter: Validating policy by cedula', { cedula, vehiclePlate });

    for (const policy of mockPolicies.values()) {
      if (
        policy.holderCedula === cedula && 
        policy.vehiclePlate.toLowerCase() === vehiclePlate.toLowerCase() &&
        this.isPolicyActive(policy)
      ) {
        return { ...policy };
      }
    }

    return null;
  }

  async requestTowingAuthorization(policy: InsurancePolicy): Promise<TowingAuthorization> {
    await this.simulateLatency();

    logger.info('MockAdapter: Requesting towing authorization', { 
      policyNumber: policy.policyNumber 
    });

    if (!this.hasTowingCoverage(policy)) {
      return {
        authorized: false,
        reason: 'La poliza no incluye cobertura de grua o se agotaron los servicios disponibles',
      };
    }

    const authCode = this.generateAuthorizationCode();
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

    pendingAuthorizations.set(authCode, { policy, expiresAt });

    return {
      authorized: true,
      authorizationCode: authCode,
      maxDistanceKm: policy.towingCoverage.maxDistanceKm,
      maxAmount: policy.towingCoverage.maxAmountPerTow,
      remainingTows: policy.towingCoverage.remainingTows,
      expiresAt,
      restrictions: policy.coverageType === 'basic' 
        ? ['Solo aplica para averias mecanicas'] 
        : undefined,
    };
  }

  async submitTowingClaim(claimData: TowingClaimData): Promise<ClaimResult> {
    await this.simulateLatency();

    logger.info('MockAdapter: Submitting towing claim', { 
      authorizationCode: claimData.authorizationCode,
      policyNumber: claimData.policyNumber,
    });

    const auth = pendingAuthorizations.get(claimData.authorizationCode);
    
    if (!auth) {
      return {
        success: false,
        errors: ['Codigo de autorizacion invalido o expirado'],
      };
    }

    if (new Date() > auth.expiresAt) {
      pendingAuthorizations.delete(claimData.authorizationCode);
      return {
        success: false,
        errors: ['La autorizacion ha expirado'],
      };
    }

    const maxAmount = auth.policy.towingCoverage.maxAmountPerTow || Infinity;
    const amountApproved = Math.min(claimData.totalCost, maxAmount);
    const amountPending = claimData.totalCost > maxAmount ? claimData.totalCost - maxAmount : 0;

    const claimNumber = this.generateClaimNumber();

    pendingAuthorizations.delete(claimData.authorizationCode);

    const currentPolicy = mockPolicies.get(auth.policy.policyNumber);
    if (currentPolicy && currentPolicy.towingCoverage.remainingTows !== undefined) {
      currentPolicy.towingCoverage.remainingTows--;
    }

    logger.info('MockAdapter: Claim submitted successfully', { 
      claimNumber,
      amountApproved,
      amountPending,
    });

    return {
      success: true,
      claimNumber,
      amountApproved,
      amountPending,
      message: amountPending > 0 
        ? `Monto parcial aprobado. El cliente debe pagar RD$ ${amountPending.toFixed(2)} adicionales.`
        : 'Reclamacion procesada exitosamente. El monto total sera cubierto por la aseguradora.',
    };
  }

  async cancelAuthorization(authorizationCode: string): Promise<boolean> {
    await this.simulateLatency();

    logger.info('MockAdapter: Canceling authorization', { authorizationCode });

    if (pendingAuthorizations.has(authorizationCode)) {
      pendingAuthorizations.delete(authorizationCode);
      return true;
    }

    return false;
  }

  async healthCheck(): Promise<AdapterHealthCheck> {
    const startTime = Date.now();
    await this.simulateLatency();
    
    return {
      isHealthy: true,
      latencyMs: Date.now() - startTime,
      lastChecked: new Date(),
    };
  }
}
