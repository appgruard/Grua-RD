/**
 * Service Priority System
 * Prioritizes available service requests based on urgency, category, and wait time
 */

import type { Servicio } from "@shared/schema";

export type PriorityLevel = 'high' | 'medium' | 'low';

export interface PrioritizedService {
  service: Servicio;
  priority: PriorityLevel;
  priorityScore: number;
  waitTimeMinutes: number;
  displayId: string;
}

const CATEGORY_PREFIXES: Record<string, string> = {
  extraccion: 'EXT',
  remolque_estandar: 'REM',
  remolque_especializado: 'ESP',
  remolque_plataforma: 'PLA',
  remolque_motocicletas: 'MOT',
  auxilio_vial: 'AUX',
  camiones_pesados: 'CAM',
  vehiculos_pesados: 'VEH',
  maquinarias: 'MAQ',
  izaje_construccion: 'IZA',
  remolque_recreativo: 'REC',
};

const HIGH_PRIORITY_CATEGORIES = ['extraccion'];
const HIGH_PRIORITY_SUBTYPES = [
  'extraccion_accidente',
  'extraccion_volcado',
  'vehiculo_chocado',
];

const MEDIUM_PRIORITY_CATEGORIES = [
  'remolque_especializado',
  'camiones_pesados',
  'vehiculos_pesados',
];

const HIGH_PRIORITY_WAIT_THRESHOLD = 30;
const MEDIUM_PRIORITY_WAIT_THRESHOLD = 15;

function generateDisplayId(service: Servicio, index: number): string {
  const categoria = service.servicioCategoria || 'remolque_estandar';
  const prefix = CATEGORY_PREFIXES[categoria] || 'SRV';
  const numericPart = String(index + 1).padStart(3, '0');
  return `${prefix}-${numericPart}`;
}

function calculateWaitTimeMinutes(createdAt: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  return Math.floor(diffMs / (1000 * 60));
}

function calculatePriorityScore(service: Servicio, waitTimeMinutes: number): number {
  let score = 0;

  const categoria = service.servicioCategoria || 'remolque_estandar';
  if (HIGH_PRIORITY_CATEGORIES.includes(categoria)) {
    score += 100;
  } else if (MEDIUM_PRIORITY_CATEGORIES.includes(categoria)) {
    score += 50;
  }

  const subtipo = service.servicioSubtipo;
  if (subtipo && HIGH_PRIORITY_SUBTYPES.includes(subtipo)) {
    score += 75;
  }

  if (waitTimeMinutes >= HIGH_PRIORITY_WAIT_THRESHOLD) {
    score += 80;
  } else if (waitTimeMinutes >= MEDIUM_PRIORITY_WAIT_THRESHOLD) {
    score += 40;
  } else {
    score += Math.min(waitTimeMinutes * 2, 30);
  }

  if (service.requiereNegociacion) {
    score += 25;
  }

  return score;
}

function determinePriorityLevel(score: number, waitTimeMinutes: number, service: Servicio): PriorityLevel {
  const categoria = service.servicioCategoria || 'remolque_estandar';
  const subtipo = service.servicioSubtipo;

  if (
    HIGH_PRIORITY_CATEGORIES.includes(categoria) ||
    (subtipo && HIGH_PRIORITY_SUBTYPES.includes(subtipo)) ||
    waitTimeMinutes >= HIGH_PRIORITY_WAIT_THRESHOLD ||
    score >= 100
  ) {
    return 'high';
  }

  if (
    MEDIUM_PRIORITY_CATEGORIES.includes(categoria) ||
    waitTimeMinutes >= MEDIUM_PRIORITY_WAIT_THRESHOLD ||
    score >= 50
  ) {
    return 'medium';
  }

  return 'low';
}

export function prioritizeServices(services: Servicio[]): PrioritizedService[] {
  const prioritized: PrioritizedService[] = services.map((service, index) => {
    const waitTimeMinutes = calculateWaitTimeMinutes(new Date(service.createdAt));
    const priorityScore = calculatePriorityScore(service, waitTimeMinutes);
    const priority = determinePriorityLevel(priorityScore, waitTimeMinutes, service);
    const displayId = generateDisplayId(service, index);

    return {
      service,
      priority,
      priorityScore,
      waitTimeMinutes,
      displayId,
    };
  });

  return prioritized.sort((a, b) => b.priorityScore - a.priorityScore);
}

export function getPriorityColor(priority: PriorityLevel): string {
  switch (priority) {
    case 'high':
      return '#EF4444';
    case 'medium':
      return '#F97316';
    case 'low':
      return '#22C55E';
  }
}

export function getPriorityLabel(priority: PriorityLevel): string {
  switch (priority) {
    case 'high':
      return 'Alta Prioridad';
    case 'medium':
      return 'Prioridad Media';
    case 'low':
      return 'Prioridad Normal';
  }
}

export function filterByPriority(services: PrioritizedService[], priority: PriorityLevel): PrioritizedService[] {
  return services.filter(s => s.priority === priority);
}

export function getServicesSummary(services: PrioritizedService[]): { high: number; medium: number; low: number; total: number } {
  return {
    high: services.filter(s => s.priority === 'high').length,
    medium: services.filter(s => s.priority === 'medium').length,
    low: services.filter(s => s.priority === 'low').length,
    total: services.length,
  };
}
