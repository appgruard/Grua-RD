/**
 * Unit Tests for Service Priority System
 * Tests prioritization of service requests based on urgency, category, and wait time
 */

import { describe, it, expect } from '@jest/globals';
import {
  prioritizeServices,
  getPriorityColor,
  getPriorityLabel,
  filterByPriority,
  getServicesSummary,
  type PriorityLevel,
  type PrioritizedService,
} from '../server/services/service-priority';

import type { Servicio } from '../shared/schema';

function createMockService(overrides: Partial<Servicio> = {}): Servicio {
  const now = new Date();
  return {
    id: 'srv-' + Math.random().toString(36).substring(7),
    clienteId: 'client-1',
    conductorId: null,
    ubicacionOrigenLat: '18.4861',
    ubicacionOrigenLng: '-69.9312',
    ubicacionDestinoLat: '18.5000',
    ubicacionDestinoLng: '-69.9000',
    direccionOrigen: 'Santo Domingo',
    direccionDestino: 'Santiago',
    estado: 'pendiente',
    metodoPago: 'efectivo',
    tipoVehiculo: 'carro',
    servicioCategoria: 'remolque_estandar',
    servicioSubtipo: null,
    descripcionProblema: 'Vehículo no enciende',
    costoTotal: '2500.00',
    distanciaKm: '15.5',
    createdAt: now,
    requiereNegociacion: false,
    estadoNegociacion: 'no_aplica',
    montoNegociado: null,
    notasExtraccion: null,
    descripcionSituacion: null,
    ...overrides,
  } as Servicio;
}

describe('Service Priority System', () => {
  
  describe('prioritizeServices()', () => {
    
    describe('Category-based prioritization', () => {
      it('should assign high priority to extraction services', () => {
        const services = [
          createMockService({ servicioCategoria: 'extraccion' }),
        ];
        const prioritized = prioritizeServices(services);
        expect(prioritized[0].priority).toBe('high');
      });

      it('should assign medium priority to specialized services', () => {
        const services = [
          createMockService({ servicioCategoria: 'remolque_especializado' }),
        ];
        const prioritized = prioritizeServices(services);
        expect(prioritized[0].priority).toBe('medium');
      });

      it('should assign medium priority to heavy trucks', () => {
        const services = [
          createMockService({ servicioCategoria: 'camiones_pesados' }),
        ];
        const prioritized = prioritizeServices(services);
        expect(prioritized[0].priority).toBe('medium');
      });

      it('should assign low priority to standard tow services', () => {
        const now = new Date();
        const services = [
          createMockService({ 
            servicioCategoria: 'remolque_estandar',
            createdAt: now,
          }),
        ];
        const prioritized = prioritizeServices(services);
        expect(prioritized[0].priority).toBe('low');
      });
    });

    describe('Subtype-based prioritization', () => {
      it('should assign high priority to accident subtypes', () => {
        const services = [
          createMockService({ 
            servicioCategoria: 'remolque_especializado',
            servicioSubtipo: 'extraccion_accidente',
          }),
        ];
        const prioritized = prioritizeServices(services);
        expect(prioritized[0].priority).toBe('high');
      });

      it('should assign high priority to rollover subtypes', () => {
        const services = [
          createMockService({ 
            servicioCategoria: 'extraccion',
            servicioSubtipo: 'extraccion_volcado',
          }),
        ];
        const prioritized = prioritizeServices(services);
        expect(prioritized[0].priority).toBe('high');
      });

      it('should assign high priority to crashed vehicle subtypes', () => {
        const services = [
          createMockService({ 
            servicioCategoria: 'remolque_especializado',
            servicioSubtipo: 'vehiculo_chocado',
          }),
        ];
        const prioritized = prioritizeServices(services);
        expect(prioritized[0].priority).toBe('high');
      });
    });

    describe('Wait time-based prioritization', () => {
      it('should increase priority for services waiting 30+ minutes', () => {
        const thirtyMinsAgo = new Date(Date.now() - 31 * 60 * 1000);
        const services = [
          createMockService({ 
            servicioCategoria: 'remolque_estandar',
            createdAt: thirtyMinsAgo,
          }),
        ];
        const prioritized = prioritizeServices(services);
        expect(prioritized[0].priority).toBe('high');
        expect(prioritized[0].waitTimeMinutes).toBeGreaterThanOrEqual(30);
      });

      it('should increase priority for services waiting 15-30 minutes', () => {
        const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
        const services = [
          createMockService({ 
            servicioCategoria: 'remolque_estandar',
            createdAt: twentyMinsAgo,
          }),
        ];
        const prioritized = prioritizeServices(services);
        expect(['medium', 'high']).toContain(prioritized[0].priority);
      });

      it('should calculate waitTimeMinutes correctly', () => {
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        const services = [
          createMockService({ createdAt: tenMinsAgo }),
        ];
        const prioritized = prioritizeServices(services);
        expect(prioritized[0].waitTimeMinutes).toBeGreaterThanOrEqual(9);
        expect(prioritized[0].waitTimeMinutes).toBeLessThanOrEqual(11);
      });
    });

    describe('Negotiation-based prioritization', () => {
      it('should increase score for services requiring negotiation', () => {
        const now = new Date();
        const services = [
          createMockService({ 
            requiereNegociacion: true,
            createdAt: now,
          }),
          createMockService({ 
            requiereNegociacion: false,
            createdAt: now,
          }),
        ];
        const prioritized = prioritizeServices(services);
        const withNegotiation = prioritized.find(p => p.service.requiereNegociacion);
        const withoutNegotiation = prioritized.find(p => !p.service.requiereNegociacion);
        
        expect(withNegotiation!.priorityScore).toBeGreaterThan(withoutNegotiation!.priorityScore);
      });
    });

    describe('Sorting and display IDs', () => {
      it('should sort services by priority score (descending)', () => {
        const thirtyMinsAgo = new Date(Date.now() - 35 * 60 * 1000);
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        const services = [
          createMockService({ 
            servicioCategoria: 'remolque_estandar',
            createdAt: fiveMinsAgo,
          }),
          createMockService({ 
            servicioCategoria: 'extraccion',
            createdAt: thirtyMinsAgo,
          }),
        ];
        
        const prioritized = prioritizeServices(services);
        
        for (let i = 1; i < prioritized.length; i++) {
          expect(prioritized[i - 1].priorityScore).toBeGreaterThanOrEqual(
            prioritized[i].priorityScore
          );
        }
      });

      it('should generate correct display IDs for extraction', () => {
        const services = [
          createMockService({ servicioCategoria: 'extraccion' }),
        ];
        const prioritized = prioritizeServices(services);
        expect(prioritized[0].displayId).toMatch(/^EXT-\d{3}$/);
      });

      it('should generate correct display IDs for standard tow', () => {
        const services = [
          createMockService({ servicioCategoria: 'remolque_estandar' }),
        ];
        const prioritized = prioritizeServices(services);
        expect(prioritized[0].displayId).toMatch(/^REM-\d{3}$/);
      });

      it('should generate correct display IDs for specialized tow', () => {
        const services = [
          createMockService({ servicioCategoria: 'remolque_especializado' }),
        ];
        const prioritized = prioritizeServices(services);
        expect(prioritized[0].displayId).toMatch(/^ESP-\d{3}$/);
      });

      it('should generate correct display IDs for motorcycles', () => {
        const services = [
          createMockService({ servicioCategoria: 'remolque_motocicletas' }),
        ];
        const prioritized = prioritizeServices(services);
        expect(prioritized[0].displayId).toMatch(/^MOT-\d{3}$/);
      });

      it('should generate correct display IDs for flatbed', () => {
        const services = [
          createMockService({ servicioCategoria: 'remolque_plataforma' }),
        ];
        const prioritized = prioritizeServices(services);
        expect(prioritized[0].displayId).toMatch(/^PLA-\d{3}$/);
      });

      it('should generate correct display IDs for roadside assistance', () => {
        const services = [
          createMockService({ servicioCategoria: 'auxilio_vial' }),
        ];
        const prioritized = prioritizeServices(services);
        expect(prioritized[0].displayId).toMatch(/^AUX-\d{3}$/);
      });

      it('should number display IDs sequentially', () => {
        const services = [
          createMockService({ servicioCategoria: 'extraccion' }),
          createMockService({ servicioCategoria: 'extraccion' }),
          createMockService({ servicioCategoria: 'extraccion' }),
        ];
        const prioritized = prioritizeServices(services);
        const ids = prioritized.map(p => p.displayId);
        expect(ids).toEqual(expect.arrayContaining(['EXT-001', 'EXT-002', 'EXT-003']));
      });
    });

    describe('Empty and edge cases', () => {
      it('should return empty array for empty input', () => {
        const prioritized = prioritizeServices([]);
        expect(prioritized).toEqual([]);
      });

      it('should handle services with null category', () => {
        const services = [
          createMockService({ servicioCategoria: null as any }),
        ];
        const prioritized = prioritizeServices(services);
        expect(prioritized).toHaveLength(1);
        const matchesSRV = prioritized[0].displayId.match(/^SRV-\d{3}$/);
        const matchesREM = prioritized[0].displayId.match(/^REM-\d{3}$/);
        expect(matchesSRV || matchesREM).toBeTruthy();
      });
    });
  });

  describe('getPriorityColor()', () => {
    it('should return red for high priority', () => {
      const color = getPriorityColor('high');
      expect(color).toBe('#EF4444');
    });

    it('should return orange for medium priority', () => {
      const color = getPriorityColor('medium');
      expect(color).toBe('#F97316');
    });

    it('should return green for low priority', () => {
      const color = getPriorityColor('low');
      expect(color).toBe('#22C55E');
    });
  });

  describe('getPriorityLabel()', () => {
    it('should return correct label for high priority', () => {
      const label = getPriorityLabel('high');
      expect(label).toBe('Alta Prioridad');
    });

    it('should return correct label for medium priority', () => {
      const label = getPriorityLabel('medium');
      expect(label).toBe('Prioridad Media');
    });

    it('should return correct label for low priority', () => {
      const label = getPriorityLabel('low');
      expect(label).toBe('Prioridad Normal');
    });
  });

  describe('filterByPriority()', () => {
    it('should filter services by high priority', () => {
      const services = [
        createMockService({ servicioCategoria: 'extraccion' }),
        createMockService({ servicioCategoria: 'remolque_estandar' }),
      ];
      const prioritized = prioritizeServices(services);
      const highOnly = filterByPriority(prioritized, 'high');
      
      highOnly.forEach(s => {
        expect(s.priority).toBe('high');
      });
    });

    it('should return empty array if no services match priority', () => {
      const now = new Date();
      const services = [
        createMockService({ 
          servicioCategoria: 'remolque_estandar',
          createdAt: now,
        }),
      ];
      const prioritized = prioritizeServices(services);
      const highOnly = filterByPriority(prioritized, 'high');
      
      expect(highOnly).toHaveLength(0);
    });
  });

  describe('getServicesSummary()', () => {
    it('should correctly count services by priority', () => {
      const now = new Date();
      const oldDate = new Date(Date.now() - 35 * 60 * 1000);
      
      const services = [
        createMockService({ servicioCategoria: 'extraccion', createdAt: now }),
        createMockService({ servicioCategoria: 'remolque_especializado', createdAt: now }),
        createMockService({ servicioCategoria: 'remolque_estandar', createdAt: now }),
      ];
      
      const prioritized = prioritizeServices(services);
      const summary = getServicesSummary(prioritized);
      
      expect(summary.total).toBe(3);
      expect(summary.high + summary.medium + summary.low).toBe(summary.total);
    });

    it('should return zeros for empty array', () => {
      const summary = getServicesSummary([]);
      
      expect(summary).toEqual({
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
      });
    });

    it('should count extraction services as high priority', () => {
      const services = [
        createMockService({ servicioCategoria: 'extraccion' }),
        createMockService({ servicioCategoria: 'extraccion' }),
      ];
      
      const prioritized = prioritizeServices(services);
      const summary = getServicesSummary(prioritized);
      
      expect(summary.high).toBe(2);
    });
  });
});
