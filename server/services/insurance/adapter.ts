import { 
  InsurancePolicy, 
  TowingAuthorization, 
  TowingClaimData, 
  ClaimResult, 
  InsuranceAdapterConfig,
  AdapterHealthCheck 
} from './types';

export interface InsuranceAdapter {
  readonly insurerCode: string;
  readonly insurerName: string;

  validatePolicy(policyNumber: string, vehiclePlate: string): Promise<InsurancePolicy | null>;
  
  validatePolicyByCedula(cedula: string, vehiclePlate: string): Promise<InsurancePolicy | null>;
  
  requestTowingAuthorization(policy: InsurancePolicy): Promise<TowingAuthorization>;
  
  submitTowingClaim(claimData: TowingClaimData): Promise<ClaimResult>;
  
  cancelAuthorization(authorizationCode: string): Promise<boolean>;
  
  healthCheck(): Promise<AdapterHealthCheck>;
  
  configure(config: InsuranceAdapterConfig): void;
}

export abstract class BaseInsuranceAdapter implements InsuranceAdapter {
  abstract readonly insurerCode: string;
  abstract readonly insurerName: string;
  
  protected config: InsuranceAdapterConfig = {
    timeout: 30000,
    retryAttempts: 3,
    sandbox: true,
  };

  configure(config: InsuranceAdapterConfig): void {
    this.config = { ...this.config, ...config };
  }

  abstract validatePolicy(policyNumber: string, vehiclePlate: string): Promise<InsurancePolicy | null>;
  
  abstract validatePolicyByCedula(cedula: string, vehiclePlate: string): Promise<InsurancePolicy | null>;
  
  abstract requestTowingAuthorization(policy: InsurancePolicy): Promise<TowingAuthorization>;
  
  abstract submitTowingClaim(claimData: TowingClaimData): Promise<ClaimResult>;
  
  abstract cancelAuthorization(authorizationCode: string): Promise<boolean>;
  
  abstract healthCheck(): Promise<AdapterHealthCheck>;

  protected generateAuthorizationCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${this.insurerCode}-${timestamp}-${random}`;
  }

  protected generateClaimNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CLM-${this.insurerCode}-${date}-${random}`;
  }

  protected isPolicyActive(policy: InsurancePolicy): boolean {
    const now = new Date();
    return (
      policy.isActive && 
      new Date(policy.startDate) <= now && 
      new Date(policy.endDate) >= now
    );
  }

  protected hasTowingCoverage(policy: InsurancePolicy): boolean {
    return (
      policy.towingCoverage.included && 
      (policy.towingCoverage.remainingTows === undefined || policy.towingCoverage.remainingTows > 0)
    );
  }
}
