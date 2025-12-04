import webpush from 'web-push';
import { storage } from './storage';

const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn('⚠️  VAPID keys not configured. Push notifications will not work.');
  console.warn('   Generate keys with: npx web-push generate-vapid-keys');
  console.warn('   Then set VAPID_PRIVATE_KEY and VITE_VAPID_PUBLIC_KEY in environment variables');
} else {
  webpush.setVapidDetails(
    'mailto:admin@gruard.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
}

export class PushNotificationService {
  async sendToUser(userId: string, payload: PushNotificationPayload): Promise<void> {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.log('Push notifications not configured, skipping notification');
      return;
    }

    try {
      const subscriptions = await storage.getPushSubscriptionsByUserId(userId);
      
      if (subscriptions.length === 0) {
        console.log(`No push subscriptions found for user ${userId}`);
        return;
      }

      const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/icon-192.png',
        data: payload.data || {},
        tag: payload.tag || 'default',
      });

      const sendPromises = subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dhKey,
                auth: sub.authKey,
              },
            },
            notificationPayload
          );
          console.log(`Push notification sent successfully to endpoint: ${sub.endpoint.substring(0, 50)}...`);
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`Subscription expired, removing: ${sub.endpoint.substring(0, 50)}...`);
            await storage.deletePushSubscription(sub.endpoint);
          } else {
            console.error('Error sending push notification:', error);
          }
        }
      });

      await Promise.allSettled(sendPromises);
    } catch (error) {
      console.error('Error in sendToUser:', error);
    }
  }

  async notifyServiceAccepted(servicioId: string, clienteId: string, conductorName: string): Promise<void> {
    await this.sendToUser(clienteId, {
      title: 'Grúa en camino',
      body: `${conductorName} ha aceptado tu solicitud`,
      data: { type: 'service_accepted', servicioId },
      tag: `service-${servicioId}`,
    });
  }

  async notifyNewServiceRequest(conductorId: string, origenDireccion: string): Promise<void> {
    await this.sendToUser(conductorId, {
      title: 'Nueva solicitud de servicio',
      body: `Solicitud desde ${origenDireccion}`,
      data: { type: 'new_request' },
      tag: 'new-requests',
    });
  }

  async notifyServiceStarted(servicioId: string, clienteId: string): Promise<void> {
    await this.sendToUser(clienteId, {
      title: 'Servicio iniciado',
      body: 'El conductor va en camino al destino',
      data: { type: 'service_started', servicioId },
      tag: `service-${servicioId}`,
    });
  }

  async notifyServiceCompleted(servicioId: string, clienteId: string): Promise<void> {
    await this.sendToUser(clienteId, {
      title: 'Servicio completado',
      body: 'Tu vehículo ha sido entregado. Por favor califica el servicio',
      data: { type: 'service_completed', servicioId },
      tag: `service-${servicioId}`,
    });
  }

  async notifyNewMessage(recipientId: string, senderName: string, message: string): Promise<void> {
    await this.sendToUser(recipientId, {
      title: `Nuevo mensaje de ${senderName}`,
      body: message.substring(0, 100),
      data: { type: 'new_message' },
      tag: 'chat',
    });
  }

  async notifyServiceUpdate(servicioId: string, clienteId: string, updateMessage: string): Promise<void> {
    await this.sendToUser(clienteId, {
      title: 'Actualización del servicio',
      body: updateMessage,
      data: { type: 'service_update', servicioId },
      tag: `service-${servicioId}`,
    });
  }

  async notifyNegotiationAmountProposed(clienteId: string, monto: number): Promise<void> {
    await this.sendToUser(clienteId, {
      title: 'Nueva cotización recibida',
      body: `El operador ha propuesto RD$ ${monto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`,
      data: { type: 'negotiation_proposed', monto },
      tag: 'negotiation',
    });
  }

  async notifyNegotiationAmountConfirmed(clienteId: string, monto: number): Promise<void> {
    await this.sendToUser(clienteId, {
      title: 'Cotización confirmada',
      body: `El operador ha confirmado el monto de RD$ ${monto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}. Por favor responde.`,
      data: { type: 'negotiation_confirmed', monto },
      tag: 'negotiation',
    });
  }

  async notifyNegotiationAmountAccepted(conductorId: string, monto: number): Promise<void> {
    await this.sendToUser(conductorId, {
      title: 'Cotización aceptada',
      body: `El cliente ha aceptado tu cotización de RD$ ${monto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`,
      data: { type: 'negotiation_accepted', monto },
      tag: 'negotiation',
    });
  }

  async notifyNegotiationAmountRejected(conductorId: string): Promise<void> {
    await this.sendToUser(conductorId, {
      title: 'Cotización rechazada',
      body: 'El cliente ha rechazado tu cotización. El servicio está disponible nuevamente.',
      data: { type: 'negotiation_rejected' },
      tag: 'negotiation',
    });
  }

  async notifyNewExtractionRequest(conductorId: string, origenDireccion: string): Promise<void> {
    await this.sendToUser(conductorId, {
      title: 'Nueva solicitud de extracción',
      body: `Solicitud de extracción desde ${origenDireccion}. Requiere evaluación.`,
      data: { type: 'new_extraction_request' },
      tag: 'extraction-requests',
    });
  }
}

export const pushService = new PushNotificationService();
