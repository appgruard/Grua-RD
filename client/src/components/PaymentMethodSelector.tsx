import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Banknote, CreditCard, Building2, AlertCircle, Clock, CheckCircle } from 'lucide-react';

interface PaymentMethodSelectorProps {
  value: string;
  onChange: (method: string) => void;
  insuranceStatus?: {
    hasApprovedInsurance: boolean;
    insuranceStatus: 'pendiente' | 'aprobado' | 'rechazado' | null;
  } | null;
}

const paymentMethods = [
  { id: 'efectivo', label: 'Efectivo', Icon: Banknote },
  { id: 'tarjeta', label: 'Tarjeta', Icon: CreditCard },
  { id: 'aseguradora', label: 'Aseguradora', Icon: Building2 },
];

export function PaymentMethodSelector({ value, onChange, insuranceStatus }: PaymentMethodSelectorProps) {
  const isInsuranceDisabled = !insuranceStatus?.hasApprovedInsurance;
  const insuranceState = insuranceStatus?.insuranceStatus;

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

  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
      {paymentMethods.map(({ id, label, Icon }) => {
        const isDisabled = id === 'aseguradora' && isInsuranceDisabled;
        
        return (
          <div
            key={id}
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
                  <div className="flex items-center gap-2">
                    {getInsuranceStatusBadge()}
                    {isDisabled && (
                      <span className="text-xs text-muted-foreground">
                        Sube tu seguro en tu perfil
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
}
