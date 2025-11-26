import { BaseInsuranceAdapter } from '../adapter';
import { 
  InsurancePolicy, 
  TowingAuthorization, 
  TowingClaimData, 
  ClaimResult,
  AdapterHealthCheck 
} from '../types';
import { logSystem as logger } from '../../../logger';

export class ConnectInsuranceAdapter extends BaseInsuranceAdapter {
  readonly insurerCode = 'CONNECT';
  readonly insurerName = 'Connect Seguros';

  private async makeApiRequest<T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> {
    if (!this.config.apiBaseUrl || !this.config.apiKey) {
      throw new Error('Connect adapter not configured. Please provide apiBaseUrl and apiKey.');
    }

    const url = `${this.config.apiBaseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Connect-API-Key': this.config.apiKey,
      'X-Connect-Secret': this.config.apiSecret || '',
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.config.timeout || 30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Connect API error: ${response.status} - ${errorText}`);
      }

      return response.json();
    } catch (error: any) {
      logger.error('Connect API request failed', { 
        endpoint, 
        error: error.message 
      });
      throw error;
    }
  }

  async validatePolicy(policyNumber: string, vehiclePlate: string): Promise<InsurancePolicy | null> {
    logger.info('ConnectAdapter: Validating policy', { policyNumber, vehiclePlate });

    if (!this.config.apiBaseUrl) {
      logger.warn('Connect adapter not configured, returning null');
      return null;
    }

    try {
      const response = await this.makeApiRequest<{
        found: boolean;
        data?: {
          policy_id: string;
          client_name: string;
          client_id: string;
          vehicle: {
            plate: string;
            brand: string;
            model: string;
            year: number;
            vin?: string;
          };
          coverage: {
            type: string;
            start_date: string;
            end_date: string;
            active: boolean;
          };
          towing: {
            enabled: boolean;
            annual_limit: number;
            used_count: number;
            max_distance: number;
            max_cost: number;
          };
        };
      }>(`/api/v2/policies/${encodeURIComponent(policyNumber)}/validate`, 'POST', {
        plate: vehiclePlate,
      });

      if (!response.found || !response.data) {
        return null;
      }

      const d = response.data;
      return {
        policyNumber: d.policy_id,
        holderName: d.client_name,
        holderCedula: d.client_id,
        vehiclePlate: d.vehicle.plate,
        vehicleBrand: d.vehicle.brand,
        vehicleModel: d.vehicle.model,
        vehicleYear: d.vehicle.year,
        vehicleVin: d.vehicle.vin,
        coverageType: this.mapCoverageType(d.coverage.type),
        startDate: new Date(d.coverage.start_date),
        endDate: new Date(d.coverage.end_date),
        isActive: d.coverage.active,
        towingCoverage: {
          included: d.towing.enabled,
          annualLimit: d.towing.annual_limit,
          remainingTows: d.towing.annual_limit - d.towing.used_count,
          maxDistanceKm: d.towing.max_distance,
          maxAmountPerTow: d.towing.max_cost,
        },
        insurerCode: this.insurerCode,
        insurerName: this.insurerName,
        rawData: response.data,
      };
    } catch (error) {
      logger.error('ConnectAdapter: Failed to validate policy', { error });
      return null;
    }
  }

  async validatePolicyByCedula(cedula: string, vehiclePlate: string): Promise<InsurancePolicy | null> {
    logger.info('ConnectAdapter: Validating policy by cedula', { cedula, vehiclePlate });

    if (!this.config.apiBaseUrl) {
      logger.warn('Connect adapter not configured, returning null');
      return null;
    }

    try {
      const response = await this.makeApiRequest<{
        policies: Array<{
          policy_id: string;
          vehicle_plate: string;
        }>;
      }>(`/api/v2/clients/${encodeURIComponent(cedula)}/policies`);

      if (!response.policies?.length) {
        return null;
      }

      const matchingPolicy = response.policies.find(
        p => p.vehicle_plate.toLowerCase() === vehiclePlate.toLowerCase()
      );

      if (!matchingPolicy) {
        return null;
      }

      return this.validatePolicy(matchingPolicy.policy_id, vehiclePlate);
    } catch (error) {
      logger.error('ConnectAdapter: Failed to validate policy by cedula', { error });
      return null;
    }
  }

  async requestTowingAuthorization(policy: InsurancePolicy): Promise<TowingAuthorization> {
    logger.info('ConnectAdapter: Requesting towing authorization', { 
      policyNumber: policy.policyNumber 
    });

    if (!this.config.apiBaseUrl) {
      return {
        authorized: false,
        reason: 'Sistema de Connect no configurado',
      };
    }

    try {
      const response = await this.makeApiRequest<{
        approved: boolean;
        authorization?: {
          code: string;
          max_km: number;
          max_amount: number;
          remaining: number;
          valid_until: string;
          notes?: string[];
        };
        rejection_reason?: string;
      }>('/api/v2/towing/request-authorization', 'POST', {
        policy_id: policy.policyNumber,
        plate: policy.vehiclePlate,
        client_id: policy.holderCedula,
      });

      if (!response.approved || !response.authorization) {
        return {
          authorized: false,
          reason: response.rejection_reason || 'Solicitud no aprobada por Connect',
        };
      }

      const auth = response.authorization;
      return {
        authorized: true,
        authorizationCode: auth.code,
        maxDistanceKm: auth.max_km,
        maxAmount: auth.max_amount,
        remainingTows: auth.remaining,
        expiresAt: new Date(auth.valid_until),
        restrictions: auth.notes,
      };
    } catch (error: any) {
      logger.error('ConnectAdapter: Failed to request authorization', { error });
      return {
        authorized: false,
        reason: `Error de conexion con Connect: ${error.message}`,
      };
    }
  }

  async submitTowingClaim(claimData: TowingClaimData): Promise<ClaimResult> {
    logger.info('ConnectAdapter: Submitting towing claim', { 
      authorizationCode: claimData.authorizationCode 
    });

    if (!this.config.apiBaseUrl) {
      return {
        success: false,
        errors: ['Sistema de Connect no configurado'],
      };
    }

    try {
      const response = await this.makeApiRequest<{
        processed: boolean;
        claim?: {
          claim_id: string;
          approved_amount: number;
          client_owes: number;
          status_message?: string;
        };
        error_messages?: string[];
      }>('/api/v2/towing/submit-claim', 'POST', {
        auth_code: claimData.authorizationCode,
        policy_id: claimData.policyNumber,
        plate: claimData.vehiclePlate,
        service_ref: claimData.servicioId,
        pickup: {
          address: claimData.originAddress,
          lat: claimData.originLat,
          lng: claimData.originLng,
        },
        dropoff: {
          address: claimData.destinationAddress,
          lat: claimData.destinationLat,
          lng: claimData.destinationLng,
        },
        distance_km: claimData.distanceKm,
        operator: {
          name: claimData.driverName,
          id: claimData.driverCedula,
          truck_plate: claimData.towTruckPlate,
        },
        completed_at: claimData.completedAt.toISOString(),
        total_cost: claimData.totalCost,
      });

      if (!response.processed || !response.claim) {
        return {
          success: false,
          errors: response.error_messages || ['Error al procesar reclamo en Connect'],
        };
      }

      return {
        success: true,
        claimNumber: response.claim.claim_id,
        amountApproved: response.claim.approved_amount,
        amountPending: response.claim.client_owes,
        message: response.claim.status_message,
      };
    } catch (error: any) {
      logger.error('ConnectAdapter: Failed to submit claim', { error });
      return {
        success: false,
        errors: [`Error de conexion con Connect: ${error.message}`],
      };
    }
  }

  async cancelAuthorization(authorizationCode: string): Promise<boolean> {
    logger.info('ConnectAdapter: Canceling authorization', { authorizationCode });

    if (!this.config.apiBaseUrl) {
      return false;
    }

    try {
      const response = await this.makeApiRequest<{ cancelled: boolean }>(
        `/api/v2/towing/authorizations/${encodeURIComponent(authorizationCode)}/cancel`,
        'POST'
      );
      return response.cancelled;
    } catch (error) {
      logger.error('ConnectAdapter: Failed to cancel authorization', { error });
      return false;
    }
  }

  async healthCheck(): Promise<AdapterHealthCheck> {
    if (!this.config.apiBaseUrl) {
      return {
        isHealthy: false,
        lastChecked: new Date(),
        errorMessage: 'Adapter not configured',
      };
    }

    const startTime = Date.now();
    
    try {
      await this.makeApiRequest<{ healthy: boolean }>('/api/v2/health');
      
      return {
        isHealthy: true,
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error: any) {
      return {
        isHealthy: false,
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
        errorMessage: error.message,
      };
    }
  }

  private mapCoverageType(type: string): 'basic' | 'full' | 'premium' {
    const typeMap: Record<string, 'basic' | 'full' | 'premium'> = {
      'BASIC': 'basic',
      'STANDARD': 'full',
      'FULL': 'full',
      'PREMIUM': 'premium',
      'EXECUTIVE': 'premium',
    };
    return typeMap[type.toUpperCase()] || 'basic';
  }
}
