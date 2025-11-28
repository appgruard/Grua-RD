import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < threeDays) {
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const installHandler = () => {
      setIsInstalled(true);
      setIsVisible(false);
    };

    window.addEventListener('appinstalled', installHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      
      if (result.outcome === 'accepted') {
        setIsVisible(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!isVisible || isInstalled) {
    return null;
  }

  return (
    <Card 
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 shadow-lg border-accent"
      data-testid="install-pwa-banner"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <Download className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">Instalar Grua RD</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Instala la app para acceso rapido y notificaciones en tiempo real
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleInstall}
                data-testid="button-install-pwa"
              >
                Instalar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                data-testid="button-dismiss-install"
              >
                Mas tarde
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-close-install"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export function UpdateAvailable() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdate(true);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setShowUpdate(true);
              }
            });
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (isUpdating) {
          window.location.reload();
        }
      });
    }
  }, [isUpdating]);

  const handleUpdate = () => {
    if (!waitingWorker) {
      window.location.reload();
      return;
    }

    setIsUpdating(true);
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <Card 
      className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 shadow-lg border-primary"
      data-testid="update-available-banner"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h4 className="font-semibold text-sm">Actualizacion disponible</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Hay una nueva version de la aplicacion
            </p>
            <Button
              size="sm"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="mt-3"
              data-testid="button-update-app"
            >
              {isUpdating ? 'Actualizando...' : 'Actualizar ahora'}
            </Button>
          </div>
          <button
            onClick={() => setShowUpdate(false)}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-close-update"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div 
      className="fixed top-0 left-0 right-0 bg-destructive text-destructive-foreground py-2 px-4 text-center text-sm z-50"
      data-testid="offline-indicator"
    >
      Sin conexion a internet. Algunas funciones pueden no estar disponibles.
    </div>
  );
}
