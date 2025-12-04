/**
 * Unit Tests for Negotiation States Validation
 * Tests the negotiation state machine and transitions
 */

import { describe, it, expect } from '@jest/globals';

const VALID_NEGOTIATION_STATES = [
  'no_aplica',
  'pendiente_evaluacion',
  'propuesto',
  'confirmado',
  'aceptado',
  'rechazado',
  'cancelado',
] as const;

type EstadoNegociacion = typeof VALID_NEGOTIATION_STATES[number];

const VALID_MESSAGE_TYPES = [
  'texto',
  'imagen',
  'video',
  'monto_propuesto',
  'monto_confirmado',
  'monto_aceptado',
  'monto_rechazado',
  'sistema',
] as const;

type TipoMensajeChat = typeof VALID_MESSAGE_TYPES[number];

const EXTRACTION_SUBTYPES = [
  'extraccion_zanja',
  'extraccion_lodo',
  'extraccion_volcado',
  'extraccion_accidente',
  'extraccion_dificil',
] as const;

type ExtractionSubtype = typeof EXTRACTION_SUBTYPES[number];

interface NegotiationStateTransition {
  from: EstadoNegociacion;
  to: EstadoNegociacion;
  action: string;
  actor: 'conductor' | 'cliente' | 'sistema';
}

const VALID_TRANSITIONS: NegotiationStateTransition[] = [
  { from: 'pendiente_evaluacion', to: 'propuesto', action: 'propose_amount', actor: 'conductor' },
  { from: 'propuesto', to: 'propuesto', action: 'update_proposal', actor: 'conductor' },
  { from: 'propuesto', to: 'confirmado', action: 'confirm_amount', actor: 'conductor' },
  { from: 'confirmado', to: 'aceptado', action: 'accept_amount', actor: 'cliente' },
  { from: 'confirmado', to: 'rechazado', action: 'reject_amount', actor: 'cliente' },
  { from: 'propuesto', to: 'cancelado', action: 'cancel_service', actor: 'cliente' },
  { from: 'confirmado', to: 'cancelado', action: 'cancel_service', actor: 'cliente' },
  { from: 'pendiente_evaluacion', to: 'cancelado', action: 'cancel_service', actor: 'cliente' },
];

function isValidTransition(from: EstadoNegociacion, to: EstadoNegociacion): boolean {
  return VALID_TRANSITIONS.some(t => t.from === from && t.to === to);
}

function canActorPerformAction(
  state: EstadoNegociacion, 
  action: string, 
  actor: 'conductor' | 'cliente'
): boolean {
  return VALID_TRANSITIONS.some(
    t => t.from === state && t.action === action && t.actor === actor
  );
}

function getNextState(
  currentState: EstadoNegociacion, 
  action: string
): EstadoNegociacion | null {
  const transition = VALID_TRANSITIONS.find(
    t => t.from === currentState && t.action === action
  );
  return transition ? transition.to : null;
}

function isExtractionSubtype(subtype: string): boolean {
  return EXTRACTION_SUBTYPES.includes(subtype as ExtractionSubtype);
}

function shouldRequireNegotiation(categoria: string, subtipo?: string | null): boolean {
  if (categoria === 'extraccion') return true;
  if (subtipo && isExtractionSubtype(subtipo)) return true;
  return false;
}

function getInitialNegotiationState(requiereNegociacion: boolean): EstadoNegociacion {
  return requiereNegociacion ? 'pendiente_evaluacion' : 'no_aplica';
}

function isTerminalState(state: EstadoNegociacion): boolean {
  return ['aceptado', 'rechazado', 'cancelado', 'no_aplica'].includes(state);
}

function canProposeAmount(state: EstadoNegociacion): boolean {
  return state === 'pendiente_evaluacion' || state === 'propuesto';
}

function canConfirmAmount(state: EstadoNegociacion): boolean {
  return state === 'propuesto';
}

function canRespondToAmount(state: EstadoNegociacion): boolean {
  return state === 'confirmado';
}

describe('Negotiation States Validation', () => {

  describe('Valid Negotiation States', () => {
    it('should have all required negotiation states', () => {
      expect(VALID_NEGOTIATION_STATES).toContain('no_aplica');
      expect(VALID_NEGOTIATION_STATES).toContain('pendiente_evaluacion');
      expect(VALID_NEGOTIATION_STATES).toContain('propuesto');
      expect(VALID_NEGOTIATION_STATES).toContain('confirmado');
      expect(VALID_NEGOTIATION_STATES).toContain('aceptado');
      expect(VALID_NEGOTIATION_STATES).toContain('rechazado');
      expect(VALID_NEGOTIATION_STATES).toContain('cancelado');
    });

    it('should have exactly 7 negotiation states', () => {
      expect(VALID_NEGOTIATION_STATES).toHaveLength(7);
    });
  });

  describe('Valid Message Types', () => {
    it('should have all required message types', () => {
      expect(VALID_MESSAGE_TYPES).toContain('texto');
      expect(VALID_MESSAGE_TYPES).toContain('imagen');
      expect(VALID_MESSAGE_TYPES).toContain('video');
      expect(VALID_MESSAGE_TYPES).toContain('monto_propuesto');
      expect(VALID_MESSAGE_TYPES).toContain('monto_confirmado');
      expect(VALID_MESSAGE_TYPES).toContain('monto_aceptado');
      expect(VALID_MESSAGE_TYPES).toContain('monto_rechazado');
      expect(VALID_MESSAGE_TYPES).toContain('sistema');
    });

    it('should have exactly 8 message types', () => {
      expect(VALID_MESSAGE_TYPES).toHaveLength(8);
    });
  });

  describe('Extraction Subtypes', () => {
    it('should have all extraction subtypes', () => {
      expect(EXTRACTION_SUBTYPES).toContain('extraccion_zanja');
      expect(EXTRACTION_SUBTYPES).toContain('extraccion_lodo');
      expect(EXTRACTION_SUBTYPES).toContain('extraccion_volcado');
      expect(EXTRACTION_SUBTYPES).toContain('extraccion_accidente');
      expect(EXTRACTION_SUBTYPES).toContain('extraccion_dificil');
    });

    it('should have exactly 5 extraction subtypes', () => {
      expect(EXTRACTION_SUBTYPES).toHaveLength(5);
    });

    it('should identify extraction subtypes correctly', () => {
      expect(isExtractionSubtype('extraccion_zanja')).toBe(true);
      expect(isExtractionSubtype('extraccion_lodo')).toBe(true);
      expect(isExtractionSubtype('extraccion_volcado')).toBe(true);
      expect(isExtractionSubtype('extraccion_accidente')).toBe(true);
      expect(isExtractionSubtype('extraccion_dificil')).toBe(true);
    });

    it('should not identify non-extraction subtypes as extraction', () => {
      expect(isExtractionSubtype('cambio_goma')).toBe(false);
      expect(isExtractionSubtype('vehiculo_lujo')).toBe(false);
      expect(isExtractionSubtype('remolque_standard')).toBe(false);
    });
  });

  describe('State Transitions', () => {

    describe('Valid transitions', () => {
      it('should allow proposing amount from pendiente_evaluacion', () => {
        expect(isValidTransition('pendiente_evaluacion', 'propuesto')).toBe(true);
      });

      it('should allow updating proposal from propuesto', () => {
        expect(isValidTransition('propuesto', 'propuesto')).toBe(true);
      });

      it('should allow confirming from propuesto', () => {
        expect(isValidTransition('propuesto', 'confirmado')).toBe(true);
      });

      it('should allow accepting from confirmado', () => {
        expect(isValidTransition('confirmado', 'aceptado')).toBe(true);
      });

      it('should allow rejecting from confirmado', () => {
        expect(isValidTransition('confirmado', 'rechazado')).toBe(true);
      });

      it('should allow canceling from various states', () => {
        expect(isValidTransition('pendiente_evaluacion', 'cancelado')).toBe(true);
        expect(isValidTransition('propuesto', 'cancelado')).toBe(true);
        expect(isValidTransition('confirmado', 'cancelado')).toBe(true);
      });
    });

    describe('Invalid transitions', () => {
      it('should not allow direct transition from pendiente_evaluacion to aceptado', () => {
        expect(isValidTransition('pendiente_evaluacion', 'aceptado')).toBe(false);
      });

      it('should not allow transition from aceptado (terminal state)', () => {
        expect(isValidTransition('aceptado', 'propuesto')).toBe(false);
        expect(isValidTransition('aceptado', 'confirmado')).toBe(false);
      });

      it('should not allow transition from rechazado (terminal state)', () => {
        expect(isValidTransition('rechazado', 'propuesto')).toBe(false);
        expect(isValidTransition('rechazado', 'aceptado')).toBe(false);
      });

      it('should not allow transition from cancelado (terminal state)', () => {
        expect(isValidTransition('cancelado', 'propuesto')).toBe(false);
        expect(isValidTransition('cancelado', 'aceptado')).toBe(false);
      });

      it('should not allow transition from no_aplica', () => {
        expect(isValidTransition('no_aplica', 'propuesto')).toBe(false);
        expect(isValidTransition('no_aplica', 'aceptado')).toBe(false);
      });

      it('should not allow accepting from propuesto (must be confirmed first)', () => {
        expect(isValidTransition('propuesto', 'aceptado')).toBe(false);
      });
    });
  });

  describe('Actor Permissions', () => {

    describe('Conductor (Driver) actions', () => {
      it('should allow conductor to propose amount', () => {
        expect(canActorPerformAction('pendiente_evaluacion', 'propose_amount', 'conductor')).toBe(true);
      });

      it('should allow conductor to update proposal', () => {
        expect(canActorPerformAction('propuesto', 'update_proposal', 'conductor')).toBe(true);
      });

      it('should allow conductor to confirm amount', () => {
        expect(canActorPerformAction('propuesto', 'confirm_amount', 'conductor')).toBe(true);
      });

      it('should not allow conductor to accept amount', () => {
        expect(canActorPerformAction('confirmado', 'accept_amount', 'conductor')).toBe(false);
      });

      it('should not allow conductor to reject amount', () => {
        expect(canActorPerformAction('confirmado', 'reject_amount', 'conductor')).toBe(false);
      });
    });

    describe('Cliente (Client) actions', () => {
      it('should allow cliente to accept amount', () => {
        expect(canActorPerformAction('confirmado', 'accept_amount', 'cliente')).toBe(true);
      });

      it('should allow cliente to reject amount', () => {
        expect(canActorPerformAction('confirmado', 'reject_amount', 'cliente')).toBe(true);
      });

      it('should allow cliente to cancel service', () => {
        expect(canActorPerformAction('pendiente_evaluacion', 'cancel_service', 'cliente')).toBe(true);
        expect(canActorPerformAction('propuesto', 'cancel_service', 'cliente')).toBe(true);
        expect(canActorPerformAction('confirmado', 'cancel_service', 'cliente')).toBe(true);
      });

      it('should not allow cliente to propose amount', () => {
        expect(canActorPerformAction('pendiente_evaluacion', 'propose_amount', 'cliente')).toBe(false);
      });

      it('should not allow cliente to confirm amount', () => {
        expect(canActorPerformAction('propuesto', 'confirm_amount', 'cliente')).toBe(false);
      });
    });
  });

  describe('Next State Calculation', () => {
    it('should return correct next state for propose_amount', () => {
      expect(getNextState('pendiente_evaluacion', 'propose_amount')).toBe('propuesto');
    });

    it('should return correct next state for confirm_amount', () => {
      expect(getNextState('propuesto', 'confirm_amount')).toBe('confirmado');
    });

    it('should return correct next state for accept_amount', () => {
      expect(getNextState('confirmado', 'accept_amount')).toBe('aceptado');
    });

    it('should return correct next state for reject_amount', () => {
      expect(getNextState('confirmado', 'reject_amount')).toBe('rechazado');
    });

    it('should return null for invalid action', () => {
      expect(getNextState('pendiente_evaluacion', 'invalid_action')).toBeNull();
    });

    it('should return null for invalid state', () => {
      expect(getNextState('aceptado', 'propose_amount')).toBeNull();
    });
  });

  describe('Negotiation Requirement Detection', () => {
    it('should require negotiation for extraccion category', () => {
      expect(shouldRequireNegotiation('extraccion')).toBe(true);
    });

    it('should require negotiation for extraction subtypes', () => {
      expect(shouldRequireNegotiation('remolque_especializado', 'extraccion_zanja')).toBe(true);
      expect(shouldRequireNegotiation('remolque_especializado', 'extraccion_lodo')).toBe(true);
      expect(shouldRequireNegotiation('remolque_especializado', 'extraccion_volcado')).toBe(true);
      expect(shouldRequireNegotiation('remolque_especializado', 'extraccion_accidente')).toBe(true);
      expect(shouldRequireNegotiation('remolque_especializado', 'extraccion_dificil')).toBe(true);
    });

    it('should not require negotiation for standard categories', () => {
      expect(shouldRequireNegotiation('remolque_estandar')).toBe(false);
      expect(shouldRequireNegotiation('auxilio_vial')).toBe(false);
      expect(shouldRequireNegotiation('remolque_motocicletas')).toBe(false);
    });

    it('should not require negotiation for non-extraction subtypes', () => {
      expect(shouldRequireNegotiation('auxilio_vial', 'cambio_goma')).toBe(false);
      expect(shouldRequireNegotiation('remolque_especializado', 'vehiculo_lujo')).toBe(false);
    });
  });

  describe('Initial State Calculation', () => {
    it('should return pendiente_evaluacion when negotiation required', () => {
      expect(getInitialNegotiationState(true)).toBe('pendiente_evaluacion');
    });

    it('should return no_aplica when negotiation not required', () => {
      expect(getInitialNegotiationState(false)).toBe('no_aplica');
    });
  });

  describe('Terminal States', () => {
    it('should identify terminal states correctly', () => {
      expect(isTerminalState('aceptado')).toBe(true);
      expect(isTerminalState('rechazado')).toBe(true);
      expect(isTerminalState('cancelado')).toBe(true);
      expect(isTerminalState('no_aplica')).toBe(true);
    });

    it('should identify non-terminal states correctly', () => {
      expect(isTerminalState('pendiente_evaluacion')).toBe(false);
      expect(isTerminalState('propuesto')).toBe(false);
      expect(isTerminalState('confirmado')).toBe(false);
    });
  });

  describe('State-based Action Availability', () => {

    describe('canProposeAmount', () => {
      it('should allow proposing from pendiente_evaluacion', () => {
        expect(canProposeAmount('pendiente_evaluacion')).toBe(true);
      });

      it('should allow proposing from propuesto (update)', () => {
        expect(canProposeAmount('propuesto')).toBe(true);
      });

      it('should not allow proposing from other states', () => {
        expect(canProposeAmount('confirmado')).toBe(false);
        expect(canProposeAmount('aceptado')).toBe(false);
        expect(canProposeAmount('rechazado')).toBe(false);
        expect(canProposeAmount('no_aplica')).toBe(false);
      });
    });

    describe('canConfirmAmount', () => {
      it('should allow confirming from propuesto', () => {
        expect(canConfirmAmount('propuesto')).toBe(true);
      });

      it('should not allow confirming from other states', () => {
        expect(canConfirmAmount('pendiente_evaluacion')).toBe(false);
        expect(canConfirmAmount('confirmado')).toBe(false);
        expect(canConfirmAmount('aceptado')).toBe(false);
      });
    });

    describe('canRespondToAmount', () => {
      it('should allow responding from confirmado', () => {
        expect(canRespondToAmount('confirmado')).toBe(true);
      });

      it('should not allow responding from other states', () => {
        expect(canRespondToAmount('pendiente_evaluacion')).toBe(false);
        expect(canRespondToAmount('propuesto')).toBe(false);
        expect(canRespondToAmount('aceptado')).toBe(false);
      });
    });
  });

  describe('Complete Flow Scenarios', () => {

    it('should complete happy path: proposal -> confirm -> accept', () => {
      let state: EstadoNegociacion = 'pendiente_evaluacion';

      state = getNextState(state, 'propose_amount')!;
      expect(state).toBe('propuesto');

      state = getNextState(state, 'confirm_amount')!;
      expect(state).toBe('confirmado');

      state = getNextState(state, 'accept_amount')!;
      expect(state).toBe('aceptado');

      expect(isTerminalState(state)).toBe(true);
    });

    it('should complete rejection path: proposal -> confirm -> reject', () => {
      let state: EstadoNegociacion = 'pendiente_evaluacion';

      state = getNextState(state, 'propose_amount')!;
      expect(state).toBe('propuesto');

      state = getNextState(state, 'confirm_amount')!;
      expect(state).toBe('confirmado');

      state = getNextState(state, 'reject_amount')!;
      expect(state).toBe('rechazado');

      expect(isTerminalState(state)).toBe(true);
    });

    it('should allow multiple proposal updates before confirmation', () => {
      let state: EstadoNegociacion = 'pendiente_evaluacion';

      state = getNextState(state, 'propose_amount')!;
      expect(state).toBe('propuesto');

      state = getNextState(state, 'update_proposal')!;
      expect(state).toBe('propuesto');

      state = getNextState(state, 'update_proposal')!;
      expect(state).toBe('propuesto');

      expect(canConfirmAmount(state)).toBe(true);
    });

    it('should allow cancellation at any non-terminal state', () => {
      const nonTerminalStates: EstadoNegociacion[] = ['pendiente_evaluacion', 'propuesto', 'confirmado'];

      for (const state of nonTerminalStates) {
        const nextState = getNextState(state, 'cancel_service');
        expect(nextState).toBe('cancelado');
      }
    });
  });
});
