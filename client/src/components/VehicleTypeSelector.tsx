import { Card } from '@/components/ui/card';
import { Car, Bike, Truck } from 'lucide-react';

interface VehicleTypeSelectorProps {
  value: string | null;
  onChange: (type: string) => void;
}

function JeepIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 17h14v-5H5z" />
      <path d="M19 12V8a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v4" />
      <circle cx="7.5" cy="17" r="2" />
      <circle cx="16.5" cy="17" r="2" />
      <path d="M5 12h14" />
      <path d="M8 8h2" />
      <path d="M14 8h2" />
      <path d="M4 12v-1a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

const vehicleTypes = [
  { id: 'carro', label: 'Carro', Icon: Car },
  { id: 'motor', label: 'Motor', Icon: Bike },
  { id: 'jeep', label: 'Jeep/SUV', Icon: JeepIcon },
  { id: 'camion', label: 'Camión', Icon: Truck },
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
