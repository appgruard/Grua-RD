export interface InsurancePolicy {
  policyNumber: string;
  holderName: string;
  holderCedula: string;
  vehiclePlate: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleVin?: string;
  coverageType: 'basic' | 'full' | 'premium';
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  towingCoverage: {
    included: boolean;
    annualLimit?: number;
    remainingTows?: number;
    maxDistanceKm?: number;
    maxAmountPerTow?: number;
  };
  insurerCode: string;
  insurerName: string;
  rawData?: Record<string, unknown>;
}

export interface TowingAuthorization {
  authorized: boolean;
  authorizationCode?: string;
  maxDistanceKm?: number;
  maxAmount?: number;
  remainingTows?: number;
  reason?: string;
  expiresAt?: Date;
  restrictions?: string[];
}

export interface TowingClaimData {
  authorizationCode: string;
  policyNumber: string;
  vehiclePlate: string;
  servicioId: string;
  originAddress: string;
  originLat: number;
  originLng: number;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
  distanceKm: number;
  driverName: string;
  driverCedula: string;
  towTruckPlate: string;
  completedAt: Date;
  totalCost: number;
}

export interface ClaimResult {
  success: boolean;
  claimNumber?: string;
  amountApproved?: number;
  amountPending?: number;
  message?: string;
  errors?: string[];
}

export interface InsuranceAdapterConfig {
  apiBaseUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  timeout?: number;
  retryAttempts?: number;
  sandbox?: boolean;
}

export interface AdapterHealthCheck {
  isHealthy: boolean;
  latencyMs?: number;
  lastChecked: Date;
  errorMessage?: string;
}
