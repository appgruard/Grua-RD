import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerDescription,
  DrawerFooter
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info,
  Plus,
  Trash2,
  Star
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethod {
  id: string;
  cardBrand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  cardholderName?: string;
}

interface PayDebtModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletId: string;
  totalDebt: number;
  onSuccess: () => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(amount);
};

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

type PaymentStep = 'select-method' | 'add-card' | 'amount' | 'processing' | 'success' | 'error';

export function PayDebtModal({ 
  open, 
  onOpenChange, 
  walletId, 
  totalDebt,
  onSuccess 
}: PayDebtModalProps) {
  const [step, setStep] = useState<PaymentStep>('select-method');
  const [amount, setAmount] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum > 0 && amountNum <= totalDebt;

  const { data: paymentMethods = [], isLoading: isLoadingCards } = useQuery<PaymentMethod[]>({
    queryKey: ['/api/operator/payment-methods'],
    enabled: open,
  });

  const addCardMutation = useMutation({
    mutationFn: async (cardData: { cardNumber: string; cardExpiry: string; cardCVV: string; cardholderName: string }) => {
      const res = await apiRequest('POST', '/api/operator/payment-methods', cardData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al guardar la tarjeta');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/operator/payment-methods'] });
      setCardNumber('');
      setCardExpiry('');
      setCardCVV('');
      setCardholderName('');
      setStep('select-method');
      toast({
        title: 'Tarjeta guardada',
        description: 'Tu tarjeta ha sido guardada correctamente.',
      });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const res = await apiRequest('DELETE', `/api/operator/payment-methods/${cardId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al eliminar la tarjeta');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/operator/payment-methods'] });
      if (selectedCardId) {
        setSelectedCardId(null);
      }
      toast({
        title: 'Tarjeta eliminada',
        description: 'La tarjeta ha sido eliminada correctamente.',
      });
    },
  });

  const payWithCardMutation = useMutation({
    mutationFn: async (data: { paymentMethodId: string; amount: number }) => {
      const res = await apiRequest('POST', '/api/operator/pay-debt-with-card', data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al procesar el pago');
      }
      return res.json();
    },
  });

  const handleAddCard = async () => {
    if (!cardNumber || !cardExpiry || !cardCVV) {
      toast({
        title: 'Datos incompletos',
        description: 'Por favor completa todos los campos de la tarjeta.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addCardMutation.mutateAsync({
        cardNumber,
        cardExpiry,
        cardCVV,
        cardholderName,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al guardar la tarjeta',
        variant: 'destructive',
      });
    }
  };

  const handlePayWithCard = async () => {
    if (!selectedCardId || !isValidAmount) return;

    setStep('processing');
    setErrorMessage('');

    try {
      await payWithCardMutation.mutateAsync({
        paymentMethodId: selectedCardId,
        amount: amountNum,
      });

      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/debts'] });
      
      toast({
        title: 'Pago exitoso',
        description: `Se han pagado ${formatCurrency(amountNum)} de tu deuda.`,
      });
    } catch (error: any) {
      setStep('error');
      setErrorMessage(error.message || 'Ocurrió un error al procesar el pago');
    }
  };

  const handleClose = () => {
    if (step === 'success') {
      onSuccess();
    }
    setStep('select-method');
    setAmount('');
    setSelectedCardId(null);
    setErrorMessage('');
    setCardNumber('');
    setCardExpiry('');
    setCardCVV('');
    setCardholderName('');
    onOpenChange(false);
  };

  const handlePayAll = () => {
    setAmount(totalDebt.toFixed(2));
  };

  const handleSelectCard = (cardId: string) => {
    setSelectedCardId(cardId);
    setStep('amount');
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const renderContent = () => {
    switch (step) {
      case 'select-method':
        return (
          <>
            <div className="p-4 space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Deuda pendiente</p>
                <p className="text-2xl font-bold" data-testid="text-debt-to-pay">
                  {formatCurrency(totalDebt)}
                </p>
              </div>

              {isLoadingCards ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : paymentMethods.length > 0 ? (
                <div className="space-y-3">
                  <Label>Selecciona una tarjeta</Label>
                  <RadioGroup value={selectedCardId || ''} onValueChange={handleSelectCard}>
                    {paymentMethods.map((method) => (
                      <div 
                        key={method.id} 
                        className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer"
                        onClick={() => handleSelectCard(method.id)}
                        data-testid={`card-payment-method-${method.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={method.id} id={method.id} data-testid={`radio-card-${method.id}`} />
                          <CreditCard className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{getCardBrandLabel(method.cardBrand)}</span>
                              <span>**** {method.last4}</span>
                              {method.isDefault && (
                                <Star className="w-3 h-3 fill-primary text-primary" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Vence {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCardMutation.mutate(method.id);
                          }}
                          disabled={deleteCardMutation.isPending}
                          data-testid={`button-delete-card-${method.id}`}
                        >
                          {deleteCardMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ) : (
                <div className="text-center py-6">
                  <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-2">No tienes tarjetas guardadas</p>
                  <p className="text-sm text-muted-foreground">
                    Agrega una tarjeta para pagar tu deuda
                  </p>
                </div>
              )}

              <Separator />

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStep('add-card')}
                data-testid="button-add-new-card"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar nueva tarjeta
              </Button>
            </div>

            <DrawerFooter className="border-t">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleClose}
                data-testid="button-cancel-select-method"
              >
                Cancelar
              </Button>
            </DrawerFooter>
          </>
        );

      case 'add-card':
        return (
          <>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-number">Número de tarjeta</Label>
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
                  Tu tarjeta se guardará de forma segura para futuros pagos de deuda.
                </AlertDescription>
              </Alert>
            </div>

            <DrawerFooter className="border-t">
              <Button 
                className="w-full"
                onClick={handleAddCard}
                disabled={addCardMutation.isPending || !cardNumber || !cardExpiry || !cardCVV}
                data-testid="button-save-card"
              >
                {addCardMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Guardar tarjeta
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setStep('select-method')}
                data-testid="button-back-to-select"
              >
                Volver
              </Button>
            </DrawerFooter>
          </>
        );

      case 'amount':
        const selectedCard = paymentMethods.find(m => m.id === selectedCardId);
        return (
          <>
            <div className="p-4 space-y-4">
              {selectedCard && (
                <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3" data-testid="selected-card-display">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {getCardBrandLabel(selectedCard.cardBrand)} **** {selectedCard.last4}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vence {selectedCard.expiryMonth.toString().padStart(2, '0')}/{selectedCard.expiryYear}
                    </p>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Deuda pendiente</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalDebt)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-amount">Monto a pagar</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    RD$
                  </span>
                  <Input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={totalDebt}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-12"
                    placeholder="0.00"
                    data-testid="input-payment-amount"
                  />
                </div>
                {amountNum > totalDebt && (
                  <p className="text-xs text-destructive">
                    El monto no puede exceder la deuda pendiente
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handlePayAll}
                data-testid="button-pay-all"
              >
                Pagar todo ({formatCurrency(totalDebt)})
              </Button>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  El pago se aplicará a las deudas más antiguas primero. 
                  Puedes realizar pagos parciales.
                </AlertDescription>
              </Alert>
            </div>

            <DrawerFooter className="border-t">
              <Button 
                className="w-full"
                onClick={handlePayWithCard}
                disabled={!isValidAmount}
                data-testid="button-confirm-payment"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pagar {amount ? formatCurrency(amountNum) : ''}
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setStep('select-method')}
                data-testid="button-change-card"
              >
                Cambiar tarjeta
              </Button>
            </DrawerFooter>
          </>
        );

      case 'processing':
        return (
          <div className="p-8 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium mb-2">Procesando pago...</p>
            <p className="text-sm text-muted-foreground text-center">
              Por favor espera mientras procesamos tu pago de {formatCurrency(amountNum)}
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="p-8 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
            </div>
            <p className="text-lg font-medium mb-2">¡Pago exitoso!</p>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Se han pagado {formatCurrency(amountNum)} de tu deuda.
            </p>
            <p className="text-sm font-medium">
              Nueva deuda: {formatCurrency(Math.max(0, totalDebt - amountNum))}
            </p>
            <DrawerFooter className="w-full mt-4">
              <Button 
                className="w-full"
                onClick={handleClose}
                data-testid="button-close-success"
              >
                Cerrar
              </Button>
            </DrawerFooter>
          </div>
        );

      case 'error':
        return (
          <div className="p-8 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-lg font-medium mb-2">Error en el pago</p>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {errorMessage}
            </p>
            <DrawerFooter className="w-full">
              <Button 
                className="w-full"
                onClick={() => setStep('amount')}
                data-testid="button-retry-payment"
              >
                Intentar de nuevo
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleClose}
                data-testid="button-cancel-error"
              >
                Cancelar
              </Button>
            </DrawerFooter>
          </div>
        );
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent>
        <DrawerHeader className="text-left border-b">
          <DrawerTitle>
            {step === 'add-card' ? 'Agregar Tarjeta' : 'Pagar Deuda'}
          </DrawerTitle>
          <DrawerDescription>
            {step === 'add-card' 
              ? 'Ingresa los datos de tu tarjeta de crédito o débito'
              : 'Paga total o parcialmente tu deuda pendiente'
            }
          </DrawerDescription>
        </DrawerHeader>
        
        {renderContent()}
      </DrawerContent>
    </Drawer>
  );
}
