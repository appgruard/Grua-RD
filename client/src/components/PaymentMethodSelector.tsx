import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Banknote, CreditCard, Building2 } from 'lucide-react';

interface PaymentMethodSelectorProps {
  value: string;
  onChange: (method: string) => void;
}

const paymentMethods = [
  { id: 'efectivo', label: 'Efectivo', Icon: Banknote },
  { id: 'tarjeta', label: 'Tarjeta', Icon: CreditCard },
  { id: 'aseguradora', label: 'Aseguradora', Icon: Building2 },
];

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
      {paymentMethods.map(({ id, label, Icon }) => (
        <div
          key={id}
          className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all hover-elevate ${
            value === id
              ? 'border-primary bg-primary/5'
              : 'border-border'
          }`}
        >
          <RadioGroupItem
            value={id}
            id={id}
            data-testid={`payment-method-${id}`}
          />
          <Label
            htmlFor={id}
            className="flex items-center gap-3 cursor-pointer flex-1"
          >
            <Icon
              className={`w-5 h-5 ${
                value === id ? 'text-primary' : 'text-muted-foreground'
              }`}
            />
            <span className={value === id ? 'font-semibold' : ''}>
              {label}
            </span>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
