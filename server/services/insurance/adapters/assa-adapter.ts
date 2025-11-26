import { BaseInsuranceAdapter } from '../adapter';
import { 
  InsurancePolicy, 
  TowingAuthorization, 
  TowingClaimData, 
  ClaimResult,
  AdapterHealthCheck 
} from '../types';
import { logSystem as logger } from '../../../logger';

export class ASSAInsuranceAdapter extends BaseInsuranceAdapter {
  readonly insurerCode = 'ASSA';
  readonly insurerName = 'ASSA Compania de Seguros';

  private async makeApiRequest<T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> {
    if (!this.config.apiBaseUrl || !this.config.apiKey) {
      throw new Error('ASSA adapter not configured. Please provide apiBaseUrl and apiKey.');
    }

    const url = `${this.config.apiBaseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'X-API-Key': this.config.apiSecret || '',
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
        throw new Error(`ASSA API error: ${response.status} - ${errorText}`);
      }

      return response.json();
    } catch (error: any) {
      logger.error('ASSA API request failed', { 
        endpoint, 
        error: error.message 
      });
      throw error;
    }
  }

  async validatePolicy(policyNumber: string, vehiclePlate: string): Promise<InsurancePolicy | null> {
    logger.info('ASSAAdapter: Validating policy', { policyNumber, vehiclePlate });

    if (!this.config.apiBaseUrl) {
      logger.warn('ASSA adapter not configured, returning null');
      return null;
    }

    try {
      const response = await this.makeApiRequest<{
        success: boolean;
        policy?: {
          numero_poliza: string;
          titular_nombre: string;
          titular_cedula: string;
          vehiculo_placa: string;
          vehiculo_marca: string;
          vehiculo_modelo: string;
          vehiculo_ano: number;
          tipo_cobertura: string;
          fecha_inicio: string;
          fecha_fin: string;
          estado: string;
          grua_incluida: boolean;
          grua_limite_anual: number;
          grua_usos_restantes: number;
          grua_km_maximo: number;
          grua_monto_maximo: number;
        };
      }>(`/v1/policies/validate?number=${encodeURIComponent(policyNumber)}&plate=${encodeURIComponent(vehiclePlate)}`);

      if (!response.success || !response.policy) {
        return null;
      }

      const p = response.policy;
      return {
        policyNumber: p.numero_poliza,
        holderName: p.titular_nombre,
        holderCedula: p.titular_cedula,
        vehiclePlate: p.vehiculo_placa,
        vehicleBrand: p.vehiculo_marca,
        vehicleModel: p.vehiculo_modelo,
        vehicleYear: p.vehiculo_ano,
        coverageType: this.mapCoverageType(p.tipo_cobertura),
        startDate: new Date(p.fecha_inicio),
        endDate: new Date(p.fecha_fin),
        isActive: p.estado === 'ACTIVA',
        towingCoverage: {
          included: p.grua_incluida,
          annualLimit: p.grua_limite_anual,
          remainingTows: p.grua_usos_restantes,
          maxDistanceKm: p.grua_km_maximo,
          maxAmountPerTow: p.grua_monto_maximo,
        },
        insurerCode: this.insurerCode,
        insurerName: this.insurerName,
        rawData: response.policy,
      };
    } catch (error) {
      logger.error('ASSAAdapter: Failed to validate policy', { error });
      return null;
    }
  }

  async validatePolicyByCedula(cedula: string, vehiclePlate: string): Promise<InsurancePolicy | null> {
    logger.info('ASSAAdapter: Validating policy by cedula', { cedula, vehiclePlate });

    if (!this.config.apiBaseUrl) {
      logger.warn('ASSA adapter not configured, returning null');
      return null;
    }

    try {
      const response = await this.makeApiRequest<{
        success: boolean;
        policies?: Array<{
          numero_poliza: string;
          vehiculo_placa: string;
        }>;
      }>(`/v1/policies/by-cedula?cedula=${encodeURIComponent(cedula)}`);

      if (!response.success || !response.policies?.length) {
        return null;
      }

      const matchingPolicy = response.policies.find(
        p => p.vehiculo_placa.toLowerCase() === vehiclePlate.toLowerCase()
      );

      if (!matchingPolicy) {
        return null;
      }

      return this.validatePolicy(matchingPolicy.numero_poliza, vehiclePlate);
    } catch (error) {
      logger.error('ASSAAdapter: Failed to validate policy by cedula', { error });
      return null;
    }
  }

  async requestTowingAuthorization(policy: InsurancePolicy): Promise<TowingAuthorization> {
    logger.info('ASSAAdapter: Requesting towing authorization', { 
      policyNumber: policy.policyNumber 
    });

    if (!this.config.apiBaseUrl) {
      return {
        authorized: false,
        reason: 'Sistema de ASSA no configurado',
      };
    }

    try {
      const response = await this.makeApiRequest<{
        success: boolean;
        authorization?: {
          codigo: string;
          km_maximo: number;
          monto_maximo: number;
          usos_restantes: number;
          expira_en: string;
          restricciones?: string[];
        };
        error?: string;
      }>('/v1/towing/authorize', 'POST', {
        numero_poliza: policy.policyNumber,
        vehiculo_placa: policy.vehiclePlate,
        titular_cedula: policy.holderCedula,
      });

      if (!response.success || !response.authorization) {
        return {
          authorized: false,
          reason: response.error || 'No se pudo obtener autorizacion de ASSA',
        };
      }

      const auth = response.authorization;
      return {
        authorized: true,
        authorizationCode: auth.codigo,
        maxDistanceKm: auth.km_maximo,
        maxAmount: auth.monto_maximo,
        remainingTows: auth.usos_restantes,
        expiresAt: new Date(auth.expira_en),
        restrictions: auth.restricciones,
      };
    } catch (error: any) {
      logger.error('ASSAAdapter: Failed to request authorization', { error });
      return {
        authorized: false,
        reason: `Error de conexion con ASSA: ${error.message}`,
      };
    }
  }

  async submitTowingClaim(claimData: TowingClaimData): Promise<ClaimResult> {
    logger.info('ASSAAdapter: Submitting towing claim', { 
      authorizationCode: claimData.authorizationCode 
    });

    if (!this.config.apiBaseUrl) {
      return {
        success: false,
        errors: ['Sistema de ASSA no configurado'],
      };
    }

    try {
      const response = await this.makeApiRequest<{
        success: boolean;
        claim?: {
          numero_reclamo: string;
          monto_aprobado: number;
          monto_pendiente: number;
          mensaje?: string;
        };
        errors?: string[];
      }>('/v1/towing/claim', 'POST', {
        codigo_autorizacion: claimData.authorizationCode,
        numero_poliza: claimData.policyNumber,
        vehiculo_placa: claimData.vehiclePlate,
        servicio_id: claimData.servicioId,
        origen_direccion: claimData.originAddress,
        origen_lat: claimData.originLat,
        origen_lng: claimData.originLng,
        destino_direccion: claimData.destinationAddress,
        destino_lat: claimData.destinationLat,
        destino_lng: claimData.destinationLng,
        distancia_km: claimData.distanceKm,
        conductor_nombre: claimData.driverName,
        conductor_cedula: claimData.driverCedula,
        grua_placa: claimData.towTruckPlate,
        completado_en: claimData.completedAt.toISOString(),
        costo_total: claimData.totalCost,
      });

      if (!response.success || !response.claim) {
        return {
          success: false,
          errors: response.errors || ['Error al procesar reclamo en ASSA'],
        };
      }

      return {
        success: true,
        claimNumber: response.claim.numero_reclamo,
        amountApproved: response.claim.monto_aprobado,
        amountPending: response.claim.monto_pendiente,
        message: response.claim.mensaje,
      };
    } catch (error: any) {
      logger.error('ASSAAdapter: Failed to submit claim', { error });
      return {
        success: false,
        errors: [`Error de conexion con ASSA: ${error.message}`],
      };
    }
  }

  async cancelAuthorization(authorizationCode: string): Promise<boolean> {
    logger.info('ASSAAdapter: Canceling authorization', { authorizationCode });

    if (!this.config.apiBaseUrl) {
      return false;
    }

    try {
      const response = await this.makeApiRequest<{ success: boolean }>(
        `/v1/towing/authorize/${encodeURIComponent(authorizationCode)}`,
        'DELETE'
      );
      return response.success;
    } catch (error) {
      logger.error('ASSAAdapter: Failed to cancel authorization', { error });
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
      await this.makeApiRequest<{ status: string }>('/v1/health');
      
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
      'BASICO': 'basic',
      'COMPLETO': 'full',
      'PREMIUM': 'premium',
      'TODO_RIESGO': 'premium',
    };
    return typeMap[type] || 'basic';
  }
}
