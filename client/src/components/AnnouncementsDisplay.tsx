import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X, ExternalLink, Megaphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn, getAbsoluteUrl } from '@/lib/utils';
import type { InAppAnnouncement } from '@shared/schema';

// Default colors that represent "use theme colors"
const DEFAULT_BG_COLOR = '#1a1a2e';
const DEFAULT_TEXT_COLOR = '#ffffff';

// Get modal size classes based on tamano field
function getModalSizeClass(tamano?: string | null): string {
  switch (tamano) {
    case 'pequeno':
      return 'max-w-sm';
    case 'grande':
      return 'max-w-2xl';
    case 'mediano':
    default:
      return 'max-w-md';
  }
}

// Check if a color is the default (meaning use theme-adaptive colors)
function isDefaultColor(color: string | undefined, defaultValue: string): boolean {
  if (!color) return true;
  return color.toLowerCase() === defaultValue.toLowerCase();
}

// Get theme-adaptive styles for an announcement
function getAdaptiveStyles(announcement: InAppAnnouncement): {
  useThemeColors: boolean;
  bgStyle?: string;
  textStyle?: string;
} {
  const hasBgDefault = isDefaultColor(announcement.colorFondo ?? undefined, DEFAULT_BG_COLOR);
  const hasTextDefault = isDefaultColor(announcement.colorTexto ?? undefined, DEFAULT_TEXT_COLOR);
  
  // If both are default values, use theme-adaptive CSS classes
  if (hasBgDefault && hasTextDefault) {
    return { useThemeColors: true };
  }
  
  // Otherwise use inline styles with the specified colors
  return {
    useThemeColors: false,
    bgStyle: announcement.colorFondo || DEFAULT_BG_COLOR,
    textStyle: announcement.colorTexto || DEFAULT_TEXT_COLOR,
  };
}

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

  const modalAnnouncements = visibleAnnouncements.filter(a => a.tipo === 'modal' || a.tipo === 'imagen');
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
      {bannerAnnouncements.map(announcement => {
        const styles = getAdaptiveStyles(announcement);
        return (
          <div
            key={announcement.id}
            data-testid={`banner-announcement-${announcement.id}`}
            className={cn(
              "relative w-full",
              styles.useThemeColors && "bg-primary text-primary-foreground dark:bg-card dark:text-card-foreground dark:border-b dark:border-border"
            )}
            style={styles.useThemeColors ? undefined : {
              backgroundColor: styles.bgStyle,
              color: styles.textStyle,
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
                  style={styles.useThemeColors ? undefined : { color: styles.textStyle }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleModalClose()}>
        {currentModal && (() => {
          const modalStyles = getAdaptiveStyles(currentModal);
          const isImageOnly = currentModal.tipo === 'imagen';
          const sizeClass = getModalSizeClass(currentModal.tamano);
          
          // Image-only announcements: show just the image, click to dismiss
          if (isImageOnly && currentModal.imagenUrl) {
            return (
              <DialogContent
                data-testid={`modal-announcement-${currentModal.id}`}
                className={cn(
                  sizeClass,
                  "p-0 overflow-hidden border-2 bg-transparent"
                )}
                onClick={handleModalClose}
                style={{ cursor: 'pointer' }}
              >
                <img
                  src={getAbsoluteUrl(currentModal.imagenUrl) || ''}
                  alt={currentModal.titulo || 'Anuncio'}
                  className="w-full h-auto object-contain rounded-lg"
                  data-testid={`image-announcement-${currentModal.id}`}
                />
              </DialogContent>
            );
          }
          
          // Regular modal announcements
          return (
            <DialogContent
              data-testid={`modal-announcement-${currentModal.id}`}
              className={cn(
                sizeClass,
                modalStyles.useThemeColors && "bg-background text-foreground"
              )}
              style={modalStyles.useThemeColors ? undefined : {
                backgroundColor: modalStyles.bgStyle,
                color: modalStyles.textStyle,
              }}
            >
              {currentModal.imagenUrl && (
                <div className="w-full h-40 -mt-6 -mx-6 mb-4 overflow-hidden rounded-t-lg" style={{ width: 'calc(100% + 3rem)' }}>
                  <img
                    src={getAbsoluteUrl(currentModal.imagenUrl) || ''}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <DialogHeader>
                <DialogTitle className={modalStyles.useThemeColors ? "text-foreground" : undefined}
                  style={modalStyles.useThemeColors ? undefined : { color: modalStyles.textStyle }}
                >
                  {currentModal.titulo}
                </DialogTitle>
                <DialogDescription
                  className={cn("text-sm", modalStyles.useThemeColors && "text-muted-foreground")}
                  style={modalStyles.useThemeColors ? undefined : { color: modalStyles.textStyle ? `${modalStyles.textStyle}cc` : undefined }}
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
                      className={modalStyles.useThemeColors ? undefined : ""}
                      style={modalStyles.useThemeColors ? undefined : { color: modalStyles.textStyle }}
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
          );
        })()}
      </Dialog>
    </>
  );
}
