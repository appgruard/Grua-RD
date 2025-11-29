import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Banknote, CreditCard, Building2, AlertCircle, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { Link } from 'wouter';

interface SavedCard {
  id: string;
  cardBrand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

interface PaymentMethodSelectorProps {
  value: string;
  onChange: (method: string) => void;
  selectedCardId?: string | null;
  onCardSelect?: (cardId: string | null) => void;
  insuranceStatus?: {
    hasApprovedInsurance: boolean;
    insuranceStatus: 'pendiente' | 'aprobado' | 'rechazado' | null;
  } | null;
}

const paymentMethods = [
  { id: 'efectivo', label: 'Efectivo', Icon: Banknote, description: 'Paga en efectivo al conductor' },
  { id: 'tarjeta', label: 'Tarjeta', Icon: CreditCard, description: 'Paga con tarjeta de crédito/débito' },
  { id: 'aseguradora', label: 'Aseguradora', Icon: Building2, description: 'Cargo a tu seguro' },
];

export function PaymentMethodSelector({ 
  value, 
  onChange, 
  selectedCardId,
  onCardSelect,
  insuranceStatus 
}: PaymentMethodSelectorProps) {
  const isInsuranceDisabled = !insuranceStatus?.hasApprovedInsurance;
  const insuranceState = insuranceStatus?.insuranceStatus;

  const { data: savedCards, isLoading: isLoadingCards } = useQuery<SavedCard[]>({
    queryKey: ['/api/client/payment-methods'],
  });

  useEffect(() => {
    if (value === 'tarjeta' && !selectedCardId && savedCards && savedCards.length > 0 && onCardSelect) {
      const defaultCard = savedCards.find(c => c.isDefault) || savedCards[0];
      onCardSelect(defaultCard.id);
    }
  }, [value, selectedCardId, savedCards, onCardSelect]);

  const getInsuranceStatusBadge = () => {
    if (!insuranceState) {
      return (
        <Badge variant="outline" className="text-xs">
          <AlertCircle className="w-3 h-3 mr-1" />
          Sin seguro
        </Badge>
      );
    }
    if (insuranceState === 'pendiente') {
      return (
        <Badge variant="secondary" className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          En revisión
        </Badge>
      );
    }
    if (insuranceState === 'rechazado') {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="w-3 h-3 mr-1" />
          Rechazado
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="text-xs bg-green-500">
        <CheckCircle className="w-3 h-3 mr-1" />
        Aprobado
      </Badge>
    );
  };

  const getBrandName = (brand: string) => {
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

  const handleMethodChange = (method: string) => {
    onChange(method);
    
    if (method === 'tarjeta' && savedCards && savedCards.length > 0 && onCardSelect) {
      const defaultCard = savedCards.find(c => c.isDefault) || savedCards[0];
      onCardSelect(defaultCard.id);
    } else if (method !== 'tarjeta' && onCardSelect) {
      onCardSelect(null);
    }
  };

  const handleCardChange = (cardId: string) => {
    if (onCardSelect) {
      onCardSelect(cardId);
    }
  };

  return (
    <div className="space-y-4">
      <RadioGroup value={value} onValueChange={handleMethodChange} className="space-y-3">
        {paymentMethods.map(({ id, label, Icon, description }) => {
          const isDisabled = id === 'aseguradora' && isInsuranceDisabled;
          const isCardWithNoSavedCards = id === 'tarjeta' && (!savedCards || savedCards.length === 0);
          
          return (
            <div key={id}>
              <div
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all ${
                  isDisabled 
                    ? 'opacity-50 cursor-not-allowed border-border bg-muted/30' 
                    : 'hover-elevate'
                } ${
                  value === id && !isDisabled
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                <RadioGroupItem
                  value={id}
                  id={id}
                  disabled={isDisabled}
                  data-testid={`payment-method-${id}`}
                />
                <Label
                  htmlFor={id}
                  className={`flex items-center gap-3 flex-1 ${
                    isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isDisabled 
                        ? 'text-muted-foreground/50' 
                        : value === id 
                          ? 'text-primary' 
                          : 'text-muted-foreground'
                    }`}
                  />
                  <div className="flex flex-col gap-1">
                    <span className={`${value === id && !isDisabled ? 'font-semibold' : ''} ${isDisabled ? 'text-muted-foreground' : ''}`}>
                      {label}
                    </span>
                    {id === 'aseguradora' && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {getInsuranceStatusBadge()}
                        {isDisabled && (
                          <span className="text-xs text-muted-foreground">
                            Sube tu seguro en tu perfil
                          </span>
                        )}
                      </div>
                    )}
                    {id === 'tarjeta' && isCardWithNoSavedCards && value === 'tarjeta' && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertCircle className="w-3 h-3" />
                        <span>No tienes tarjetas guardadas. </span>
                        <Link href="/client/profile" className="text-primary underline">
                          Agregar tarjeta
                        </Link>
                      </div>
                    )}
                  </div>
                </Label>
              </div>
              
              {id === 'tarjeta' && value === 'tarjeta' && savedCards && savedCards.length > 0 && (
                <div className="ml-4 mt-2 pl-4 border-l-2 border-muted space-y-2">
                  {isLoadingCards ? (
                    <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cargando tarjetas...
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">Selecciona una tarjeta:</p>
                      <RadioGroup 
                        value={selectedCardId || ''} 
                        onValueChange={handleCardChange}
                        className="space-y-2"
                      >
                        {savedCards.map((card) => (
                          <div
                            key={card.id}
                            className={`flex items-center gap-3 p-3 rounded-md border transition-all ${
                              selectedCardId === card.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover-elevate'
                            }`}
                          >
                            <RadioGroupItem
                              value={card.id}
                              id={`card-${card.id}`}
                              data-testid={`select-card-${card.id}`}
                            />
                            <Label 
                              htmlFor={`card-${card.id}`}
                              className="flex items-center gap-2 flex-1 cursor-pointer"
                            >
                              <CreditCard className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">
                                {getBrandName(card.cardBrand)} •••• {card.last4}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {card.expiryMonth.toString().padStart(2, '0')}/{card.expiryYear.toString().slice(-2)}
                              </span>
                              {card.isDefault && (
                                <Badge variant="secondary" className="text-xs ml-auto">
                                  Predeterminada
                                </Badge>
                              )}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                      <Link 
                        href="/client/profile" 
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                      >
                        <CreditCard className="w-3 h-3" />
                        Administrar tarjetas
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
