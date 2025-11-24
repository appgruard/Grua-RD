import { Card } from '@/components/ui/card';
import { Car, Bike, Truck, TruckIcon } from 'lucide-react';

interface VehicleTypeSelectorProps {
  value: string | null;
  onChange: (type: string) => void;
}

const vehicleTypes = [
  { id: 'carro', label: 'Carro', Icon: Car },
  { id: 'motor', label: 'Motor', Icon: Bike },
  { id: 'jeep', label: 'Jeep', Icon: Truck },
  { id: 'camion', label: 'Camión', Icon: TruckIcon },
];

export function VehicleTypeSelector({ value, onChange }: VehicleTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {vehicleTypes.map(({ id, label, Icon }) => (
        <Card
          key={id}
          data-testid={`vehicle-type-${id}`}
          onClick={() => onChange(id)}
          className={`p-6 cursor-pointer hover-elevate active-elevate-2 transition-all ${
            value === id
              ? 'border-2 border-primary bg-primary/5'
              : 'border-2 border-transparent'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <Icon
              className={`w-12 h-12 ${
                value === id ? 'text-primary' : 'text-muted-foreground'
              }`}
            />
            <span
              className={`text-sm font-semibold ${
                value === id ? 'text-primary' : 'text-foreground'
              }`}
            >
              {label}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
