import { storage } from '../storage';
import { logSystem } from '../logger';
import { pushService } from '../push-service';
import type WebSocket from 'ws';

const SERVICE_TIMEOUT_MINUTES = 10;
const CHECK_INTERVAL_MS = 60 * 1000;

let intervalId: NodeJS.Timeout | null = null;
let serviceSessions: Map<string, Set<WebSocket>> | null = null;

export function initServiceAutoCancellation(sessions: Map<string, Set<WebSocket>>) {
  serviceSessions = sessions;
  
  logSystem.info('Service auto-cancellation initialized', { 
    timeoutMinutes: SERVICE_TIMEOUT_MINUTES,
    checkIntervalMs: CHECK_INTERVAL_MS 
  });

  intervalId = setInterval(async () => {
    await checkAndCancelExpiredServices();
  }, CHECK_INTERVAL_MS);

  setTimeout(() => {
    checkAndCancelExpiredServices();
  }, 5000);
}

export function stopServiceAutoCancellation() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logSystem.info('Service auto-cancellation stopped');
  }
}

async function cancelPaymentAuthorization(service: any): Promise<void> {
  if (service.metodoPago !== 'tarjeta' || !service.dlocalAuthorizationId) {
    return;
  }

  try {
    const { dlocalPaymentService } = await import('./dlocal-payment');
    
    if (!dlocalPaymentService.isConfigured()) {
      logSystem.warn('dLocal not configured, cannot cancel authorization', { 
        servicioId: service.id 
      });
      return;
    }

    const result = await dlocalPaymentService.cancelAuthorization(service.dlocalAuthorizationId);
    
    logSystem.info('Payment authorization cancelled for auto-cancelled service', { 
      servicioId: service.id,
      authorizationId: service.dlocalAuthorizationId,
      cancelled: result.cancelled,
      status: result.status
    });
  } catch (error) {
    logSystem.error('Failed to cancel payment authorization', error, { 
      servicioId: service.id,
      authorizationId: service.dlocalAuthorizationId 
    });
  }
}

async function checkAndCancelExpiredServices() {
  try {
    const cancelledServices = await storage.cancelExpiredServicios(SERVICE_TIMEOUT_MINUTES);
    
    if (cancelledServices.length === 0) {
      return;
    }

    logSystem.info(`Auto-cancelled ${cancelledServices.length} expired pending services`);

    for (const service of cancelledServices) {
      logSystem.info('Service auto-cancelled', { 
        servicioId: service.id,
        clienteId: service.clienteId,
        createdAt: service.createdAt
      });

      await cancelPaymentAuthorization(service);

      try {
        await pushService.sendNotification(
          service.clienteId,
          'Servicio cancelado',
          'Tu solicitud fue cancelada porque ningún operador estuvo disponible. Por favor, intenta nuevamente.',
          { type: 'service_cancelled', servicioId: service.id }
        );
      } catch (pushError) {
        logSystem.warn('Push notification failed for auto-cancelled service', { 
          servicioId: service.id, 
          error: pushError 
        });
      }

      if (serviceSessions?.has(service.id)) {
        const broadcast = JSON.stringify({
          type: 'service_status_change',
          payload: service,
        });
        serviceSessions.get(service.id)!.forEach((client) => {
          if (client.readyState === 1) {
            client.send(broadcast);
          }
        });
      }
    }
  } catch (error) {
    logSystem.error('Error in checkAndCancelExpiredServices', error);
  }
}

export { SERVICE_TIMEOUT_MINUTES };
