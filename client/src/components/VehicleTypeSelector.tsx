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
    <div className="grid grid-cols-2 gap-3">
      {vehicleTypes.map(({ id, label, Icon }) => {
        const isSelected = value === id;
        return (
          <button
            key={id}
            type="button"
            data-testid={`vehicle-type-${id}`}
            onClick={() => onChange(id)}
            className={`relative flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-2 transition-all duration-200 ${
              isSelected
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border bg-card hover:border-primary/30 hover:bg-muted/50'
            }`}
          >
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isSelected ? 'bg-primary/10' : 'bg-muted'
            }`}>
              <Icon
                className={`w-8 h-8 transition-colors ${
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                }`}
              />
            </div>
            <span
              className={`text-sm font-semibold transition-colors ${
                isSelected ? 'text-primary' : 'text-foreground'
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
