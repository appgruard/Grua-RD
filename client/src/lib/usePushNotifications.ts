import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { fetchVapidPublicKey } from '@/hooks/use-public-config';

const VITE_VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking push subscription:', error);
    }
  }

  async function subscribe() {
    if (!isSupported) {
      toast({
        title: 'No soportado',
        description: 'Tu navegador no soporta notificaciones push',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const vapidKey = VITE_VAPID_PUBLIC_KEY || await fetchVapidPublicKey();
      
      if (!vapidKey) {
        toast({
          title: 'Configuración pendiente',
          description: 'Las notificaciones push no están configuradas en el servidor',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast({
          title: 'Permisos denegados',
          description: 'Necesitamos tu permiso para enviarte notificaciones',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subscriptionData = subscription.toJSON();

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscriptionData.endpoint,
          keys: subscriptionData.keys,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setIsSubscribed(true);
      toast({
        title: 'Notificaciones activadas',
        description: 'Recibirás notificaciones sobre tus servicios',
      });
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast({
        title: 'Error',
        description: 'No se pudo activar las notificaciones',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function unsubscribe() {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const subscriptionData = subscription.toJSON();

        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscriptionData.endpoint,
          }),
        });

        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      toast({
        title: 'Notificaciones desactivadas',
        description: 'Ya no recibirás notificaciones push',
      });
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast({
        title: 'Error',
        description: 'No se pudo desactivar las notificaciones',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
