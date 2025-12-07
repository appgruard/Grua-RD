import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CreditCard,
  Loader2,
  Plus,
  Trash2,
  Star,
  Info,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface PaymentMethod {
  id: string;
  cardBrand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  cardholderName?: string;
}

const getCardBrandLabel = (brand: string): string => {
  switch (brand.toLowerCase()) {
    case 'visa':
      return 'Visa';
    case 'mastercard':
      return 'Mastercard';
    case 'amex':
      return 'Amex';
    default:
      return 'Tarjeta';
  }
};

const formatCardNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join(' ') : cleaned;
};

const formatExpiryDate = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length >= 2) {
    return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
  }
  return cleaned;
};

export default function ClientPaymentMethods() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<PaymentMethod | null>(null);

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: paymentMethods = [], isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ['/api/client/payment-methods'],
  });

  const addCardMutation = useMutation({
    mutationFn: async (cardData: { 
      cardNumber: string; 
      cardExpiry: string; 
      cardCVV: string; 
      cardholderName: string;
    }) => {
      const res = await apiRequest('POST', '/api/client/payment-methods', cardData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al guardar la tarjeta');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/payment-methods'] });
      resetForm();
      setAddDialogOpen(false);
      toast({
        title: 'Tarjeta agregada',
        description: 'Tu tarjeta ha sido guardada correctamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al guardar la tarjeta',
        variant: 'destructive',
      });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const res = await apiRequest('DELETE', `/api/client/payment-methods/${cardId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al eliminar la tarjeta');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/payment-methods'] });
      setCardToDelete(null);
      setDeleteDialogOpen(false);
      toast({
        title: 'Tarjeta eliminada',
        description: 'La tarjeta ha sido eliminada correctamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al eliminar la tarjeta',
        variant: 'destructive',
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const res = await apiRequest('PUT', `/api/client/payment-methods/${cardId}/default`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al establecer tarjeta predeterminada');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/payment-methods'] });
      toast({
        title: 'Tarjeta predeterminada',
        description: 'La tarjeta ha sido establecida como predeterminada.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al establecer tarjeta predeterminada',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setCardNumber('');
    setCardExpiry('');
    setCardCVV('');
    setCardholderName('');
  };

  const handleAddCard = async () => {
    if (!cardNumber || !cardExpiry || !cardCVV) {
      toast({
        title: 'Datos incompletos',
        description: 'Por favor completa todos los campos de la tarjeta.',
        variant: 'destructive',
      });
      return;
    }

    await addCardMutation.mutateAsync({
      cardNumber: cardNumber.replace(/\s/g, ''),
      cardExpiry,
      cardCVV,
      cardholderName,
    });
  };

  const handleDeleteClick = (card: PaymentMethod) => {
    setCardToDelete(card);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (cardToDelete) {
      await deleteCardMutation.mutateAsync(cardToDelete.id);
    }
  };

  const handleSetDefault = (cardId: string) => {
    setDefaultMutation.mutate(cardId);
  };

  const handleCloseAddDialog = () => {
    resetForm();
    setAddDialogOpen(false);
  };

  return (
    <Card className="overflow-hidden" data-testid="card-payment-methods">
      <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Metodos de Pago
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          data-testid="button-add-payment-method"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar
        </Button>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="text-center py-6">
            <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-2">No tienes tarjetas guardadas</p>
            <p className="text-sm text-muted-foreground">
              Agrega una tarjeta para pagar tus servicios
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-3 rounded-lg border gap-3"
                data-testid={`card-payment-method-${method.id}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CreditCard className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium" data-testid={`text-card-brand-${method.id}`}>
                        {getCardBrandLabel(method.cardBrand)}
                      </span>
                      <span data-testid={`text-card-last4-${method.id}`}>
                        **** {method.last4}
                      </span>
                      {method.isDefault && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-primary text-primary" />
                          Predeterminada
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground" data-testid={`text-card-expiry-${method.id}`}>
                      Vence {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                    </p>
                    {method.cardholderName && (
                      <p className="text-xs text-muted-foreground truncate">
                        {method.cardholderName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!method.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(method.id)}
                      disabled={setDefaultMutation.isPending}
                      data-testid={`button-set-default-${method.id}`}
                    >
                      {setDefaultMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Star className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(method)}
                    disabled={deleteCardMutation.isPending}
                    data-testid={`button-delete-card-${method.id}`}
                  >
                    {deleteCardMutation.isPending && cardToDelete?.id === method.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-destructive" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={addDialogOpen} onOpenChange={handleCloseAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Tarjeta</DialogTitle>
            <DialogDescription>
              Ingresa los datos de tu tarjeta de credito o debito
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="card-number">Numero de tarjeta</Label>
              <Input
                id="card-number"
                placeholder="1234 5678 9012 3456"
                value={formatCardNumber(cardNumber)}
                onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, ''))}
                maxLength={19}
                data-testid="input-card-number"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="card-expiry">Vencimiento</Label>
                <Input
                  id="card-expiry"
                  placeholder="MM/YY"
                  value={formatExpiryDate(cardExpiry)}
                  onChange={(e) => setCardExpiry(e.target.value.replace(/\D/g, ''))}
                  maxLength={5}
                  data-testid="input-card-expiry"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-cvv">CVV</Label>
                <Input
                  id="card-cvv"
                  placeholder="123"
                  value={cardCVV}
                  onChange={(e) => setCardCVV(e.target.value.replace(/\D/g, ''))}
                  maxLength={4}
                  type="password"
                  data-testid="input-card-cvv"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardholder-name">Nombre del titular (opcional)</Label>
              <Input
                id="cardholder-name"
                placeholder="Como aparece en la tarjeta"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                data-testid="input-cardholder-name"
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Tu tarjeta se guardara de forma segura para futuros pagos.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleCloseAddDialog}
              data-testid="button-cancel-add-card"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddCard}
              disabled={addCardMutation.isPending || !cardNumber || !cardExpiry || !cardCVV}
              data-testid="button-save-card"
            >
              {addCardMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Guardar tarjeta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar tarjeta"
        description={
          cardToDelete
            ? `Esta seguro que desea eliminar la tarjeta ${getCardBrandLabel(cardToDelete.cardBrand)} terminada en ${cardToDelete.last4}?`
            : 'Esta seguro que desea eliminar esta tarjeta?'
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
        loading={deleteCardMutation.isPending}
      />
    </Card>
  );
}
