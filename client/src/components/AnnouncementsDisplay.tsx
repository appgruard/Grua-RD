import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X, ExternalLink, Megaphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import type { InAppAnnouncement } from '@shared/schema';

const DISMISSED_KEY = 'dismissed_announcements';

function getDismissedAnnouncements(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch (e) {
    console.error('Error reading dismissed announcements:', e);
  }
  return new Set();
}

function addDismissedAnnouncement(id: string): void {
  try {
    const dismissed = getDismissedAnnouncements();
    dismissed.add(id);
    const arr = Array.from(dismissed).slice(-50);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
  } catch (e) {
    console.error('Error saving dismissed announcement:', e);
  }
}

export function AnnouncementsDisplay() {
  const { toast } = useToast();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => getDismissedAnnouncements());
  const [currentModalIndex, setCurrentModalIndex] = useState(0);

  const { data: announcements } = useQuery<InAppAnnouncement[]>({
    queryKey: ['/api/announcements/active'],
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/announcements/${id}/view`, { descartado: true });
      if (!res.ok) throw new Error('Failed to dismiss announcement');
      return res.json();
    },
  });

  const handleDismiss = useCallback((id: string) => {
    addDismissedAnnouncement(id);
    setDismissedIds(prev => new Set(Array.from(prev).concat([id])));
    dismissMutation.mutate(id);
  }, [dismissMutation]);

  const handleActionClick = useCallback((announcement: InAppAnnouncement) => {
    handleDismiss(announcement.id);
    if (announcement.enlaceAccion) {
      if (announcement.enlaceAccion.startsWith('http')) {
        window.open(announcement.enlaceAccion, '_blank');
      } else {
        window.location.href = announcement.enlaceAccion;
      }
    }
  }, [handleDismiss]);

  const visibleAnnouncements = announcements?.filter(a => !dismissedIds.has(a.id)) || [];

  const modalAnnouncements = visibleAnnouncements.filter(a => a.tipo === 'modal');
  const bannerAnnouncements = visibleAnnouncements.filter(a => a.tipo === 'banner');
  const toastAnnouncements = visibleAnnouncements.filter(a => a.tipo === 'toast');

  useEffect(() => {
    toastAnnouncements.forEach(announcement => {
      toast({
        title: announcement.titulo,
        description: announcement.contenido,
        duration: 8000,
      });
      handleDismiss(announcement.id);
    });
  }, [toastAnnouncements.map(a => a.id).join(',')]);

  const currentModal = modalAnnouncements[currentModalIndex];
  const isModalOpen = !!currentModal;

  const handleModalClose = useCallback(() => {
    if (currentModal) {
      handleDismiss(currentModal.id);
      if (currentModalIndex < modalAnnouncements.length - 1) {
        setCurrentModalIndex(prev => prev + 1);
      }
    }
  }, [currentModal, currentModalIndex, modalAnnouncements.length, handleDismiss]);

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <>
      {bannerAnnouncements.map(announcement => (
        <div
          key={announcement.id}
          data-testid={`banner-announcement-${announcement.id}`}
          className="relative w-full"
          style={{
            backgroundColor: announcement.colorFondo || '#1a1a2e',
            color: announcement.colorTexto || '#ffffff',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Megaphone className="h-4 w-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{announcement.titulo}</p>
                <p className="text-sm opacity-90 line-clamp-1">{announcement.contenido}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {announcement.enlaceAccion && announcement.textoBoton && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleActionClick(announcement)}
                  data-testid={`banner-action-${announcement.id}`}
                  className="text-xs"
                >
                  {announcement.textoBoton}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDismiss(announcement.id)}
                data-testid={`banner-dismiss-${announcement.id}`}
                className="h-8 w-8"
                style={{ color: announcement.colorTexto || '#ffffff' }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleModalClose()}>
        {currentModal && (
          <DialogContent
            data-testid={`modal-announcement-${currentModal.id}`}
            className="max-w-md"
            style={{
              backgroundColor: currentModal.colorFondo || undefined,
              color: currentModal.colorTexto || undefined,
            }}
          >
            {currentModal.imagenUrl && (
              <div className="w-full h-40 -mt-6 -mx-6 mb-4 overflow-hidden rounded-t-lg" style={{ width: 'calc(100% + 3rem)' }}>
                <img
                  src={currentModal.imagenUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <DialogHeader>
              <DialogTitle style={{ color: currentModal.colorTexto || undefined }}>
                {currentModal.titulo}
              </DialogTitle>
              <DialogDescription
                className="text-sm"
                style={{ color: currentModal.colorTexto ? `${currentModal.colorTexto}cc` : undefined }}
              >
                {currentModal.contenido}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 mt-4">
              {currentModal.enlaceAccion && currentModal.textoBoton ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={handleModalClose}
                    data-testid={`modal-dismiss-${currentModal.id}`}
                    style={{ color: currentModal.colorTexto || undefined }}
                  >
                    Cerrar
                  </Button>
                  <Button
                    onClick={() => handleActionClick(currentModal)}
                    data-testid={`modal-action-${currentModal.id}`}
                  >
                    {currentModal.textoBoton}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleModalClose}
                  data-testid={`modal-dismiss-${currentModal.id}`}
                >
                  Entendido
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
