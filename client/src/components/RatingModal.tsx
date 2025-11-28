import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { StarRating } from './StarRating';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
  driverName: string;
}

export function RatingModal({ isOpen, onClose, serviceId, driverName }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitRating = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/services/${serviceId}/calificar`, {
        puntuacion: rating,
        comentario: comment || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Calificacion enviada',
        description: 'Gracias por calificar el servicio',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/services', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['/api/services', serviceId, 'calificacion'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/my-services'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo enviar la calificacion',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast({
        title: 'Selecciona una calificacion',
        description: 'Por favor selecciona al menos 1 estrella',
        variant: 'destructive',
      });
      return;
    }
    submitRating.mutate();
  };

  const handleClose = () => {
    setRating(0);
    setHoveredRating(0);
    setComment('');
    onClose();
  };

  const displayRating = hoveredRating || rating;

  const ratingLabels = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="rating-modal">
        <DialogHeader>
          <DialogTitle data-testid="rating-modal-title">Califica tu servicio</DialogTitle>
          <DialogDescription data-testid="rating-modal-description">
            Como estuvo tu experiencia con {driverName}?
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="flex justify-center gap-2 mb-4" data-testid="star-buttons-container">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 transition-transform hover:scale-110 focus:outline-none"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                data-testid={`button-star-${star}`}
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= displayRating
                      ? 'fill-accent text-accent'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground h-5" data-testid="text-rating-label">
            {displayRating > 0 ? ratingLabels[displayRating] : 'Selecciona una calificacion'}
          </p>

          <div className="mt-6">
            <Textarea
              placeholder="Agrega un comentario (opcional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
              rows={3}
              data-testid="input-comment"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submitRating.isPending}
            data-testid="button-skip-rating"
          >
            Omitir
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitRating.isPending}
            data-testid="button-submit-rating"
          >
            {submitRating.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar calificacion'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { StarRating } from './StarRating';
