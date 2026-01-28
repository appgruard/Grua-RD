import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';

interface CancelServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
  serviceCost: number;
  userType: 'cliente' | 'conductor';
}

export function CancelServiceModal({
  isOpen,
  onClose,
  serviceId,
  serviceCost,
  userType,
}: CancelServiceModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reasonsData, isLoading: reasonsLoading } = useQuery({
    queryKey: ['/api/razones-cancelacion'],
  });

  const reasons = reasonsData || [];

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReason) {
        throw new Error('Selecciona una razón');
      }

      const response = await apiRequest('POST', `/api/servicios/${serviceId}/cancelar`, {
        razonCodigo: selectedReason,
        notasUsuario: notes || null,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al cancelar');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Servicio cancelado',
        description: `Penalización: $${data.penalizacion?.monto || 0}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/services', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['/api/services/my-services'] });
      queryClient.invalidateQueries({ queryKey: [`/api/usuarios/${userType === 'cliente' ? 'current' : 'current'}/cancelaciones`] });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al cancelar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setSelectedReason('');
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectedReasonData = reasons.find((r: any) => r.codigo === selectedReason);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="cancel-service-modal">
        <DialogHeader>
          <DialogTitle data-testid="cancel-modal-title">Cancelar Servicio</DialogTitle>
          <DialogDescription data-testid="cancel-modal-description">
            Por favor, selecciona una razón y añade comentarios si es necesario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4" data-testid="cancel-form-container">
          <div className="space-y-2" data-testid="reason-selector-group">
            <label className="text-sm font-medium" data-testid="label-reason">
              Razón de Cancelación *
            </label>
            {reasonsLoading ? (
              <div className="p-2 text-center text-sm text-muted-foreground">
                Cargando razones...
              </div>
            ) : (
              <Select value={selectedReason} onValueChange={setSelectedReason}>
                <SelectTrigger data-testid="select-trigger-reason">
                  <SelectValue placeholder="Selecciona una razón..." />
                </SelectTrigger>
                <SelectContent data-testid="select-content-reason">
                  {reasons.map((reason: any) => (
                    <SelectItem
                      key={reason.codigo}
                      value={reason.codigo}
                      data-testid={`reason-option-${reason.codigo}`}
                    >
                      {reason.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2" data-testid="notes-field-group">
            <label className="text-sm font-medium" data-testid="label-notes">
              Notas Adicionales (Opcional)
            </label>
            <Textarea
              placeholder="Cuéntanos más sobre tu cancelación..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              data-testid="textarea-notes"
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground" data-testid="notes-counter">
              {notes.length}/500 caracteres
            </p>
          </div>

          {selectedReason && (
            <Card
              className={`${selectedReasonData?.penalizacionPredeterminada 
                ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950' 
                : 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950'}`}
              data-testid="penalty-warning-card"
            >
              <CardHeader className="pb-3" data-testid="penalty-header">
                <CardTitle className="flex gap-2 text-sm" data-testid="penalty-title">
                  <AlertCircle className={`h-4 w-4 ${selectedReasonData?.penalizacionPredeterminada 
                    ? 'text-amber-600 dark:text-amber-400' 
                    : 'text-green-600 dark:text-green-400'}`} />
                  {selectedReasonData?.penalizacionPredeterminada 
                    ? 'Información de Penalización' 
                    : 'Información de Cancelación'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm" data-testid="penalty-content">
                <p data-testid="penalty-description">
                  {selectedReasonData?.penalizacionPredeterminada
                    ? 'Se aplicará una penalización por esta cancelación según el estado del servicio y otros factores.'
                    : 'Esta razón puede ser exonerada de penalización o tener reducción de cargos.'}
                </p>
                <p className="font-medium text-xs text-muted-foreground" data-testid="penalty-calculation-note">
                  {selectedReasonData?.penalizacionPredeterminada
                    ? 'La penalización final dependerá de: estado del servicio, distancia recorrida, hora, demanda y reincidencia.'
                    : 'Se requiere revisión administrativa para confirmar.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            data-testid="button-cancel-modal-close"
          >
            Cerrar
          </Button>
          <Button
            onClick={() => cancelMutation.mutate()}
            disabled={!selectedReason || cancelMutation.isPending}
            data-testid="button-submit-cancel"
          >
            {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
