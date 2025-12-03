import { 
  Truck, 
  Wrench, 
  Car, 
  HardHat, 
  Ship,
  Sparkles
} from 'lucide-react';

interface ServiceCategorySelectorProps {
  value: string | null;
  onChange: (category: string) => void;
}

function TowTruckIcon({ className }: { className?: string }) {
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
      <path d="M5 18v-5h14v5" />
      <path d="M19 13V9.5a2 2 0 0 0-2-2h-3l-2-2.5H5a2 2 0 0 0-2 2V13" />
      <circle cx="6.5" cy="18" r="2" />
      <circle cx="17.5" cy="18" r="2" />
      <path d="M8.5 18h7" />
      <path d="M14 5v8" />
      <path d="M10 9h4" />
    </svg>
  );
}

function CraneIcon({ className }: { className?: string }) {
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
      <path d="M6 21V6a2 2 0 0 1 2-2h2" />
      <path d="M10 4h7l3 3v3" />
      <path d="M20 10v11" />
      <path d="M3 21h18" />
      <path d="M14 4v3" />
      <path d="M16 10v6" />
      <circle cx="16" cy="19" r="2" />
    </svg>
  );
}

function BoatTrailerIcon({ className }: { className?: string }) {
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
      <path d="M2 20h20" />
      <path d="M5 18h14l-2-8H7z" />
      <path d="M7 10l2-5h6l2 5" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}

function FlatbedIcon({ className }: { className?: string }) {
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
      <path d="M3 17h18" />
      <path d="M3 17V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8" />
      <path d="M5 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" />
      <circle cx="6" cy="17" r="2" />
      <circle cx="18" cy="17" r="2" />
      <path d="M8 17h8" />
    </svg>
  );
}

function MotorcycleIcon({ className }: { className?: string }) {
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
      <circle cx="5" cy="17" r="3" />
      <circle cx="19" cy="17" r="3" />
      <path d="M5 17h3l3-7h4l2.5 7H19" />
      <path d="M11 10l1 4" />
      <path d="M13 7h2l2 3" />
      <circle cx="14" cy="6" r="1" />
    </svg>
  );
}

const serviceCategories = [
  { 
    id: 'remolque_estandar', 
    label: 'Remolque', 
    description: 'Servicio de grúa estándar',
    Icon: TowTruckIcon 
  },
  { 
    id: 'remolque_motocicletas', 
    label: 'Remolque Motocicletas', 
    description: 'Motos, scooters y pasolas',
    Icon: MotorcycleIcon 
  },
  { 
    id: 'remolque_plataforma', 
    label: 'Plataforma / Flatbed', 
    description: 'Vehículos de lujo y bajos',
    Icon: FlatbedIcon 
  },
  { 
    id: 'auxilio_vial', 
    label: 'Auxilio Vial', 
    description: 'Asistencia sin grúa',
    Icon: Wrench 
  },
  { 
    id: 'remolque_especializado', 
    label: 'Remolque Especializado', 
    description: 'Vehículos especiales',
    Icon: Sparkles 
  },
  { 
    id: 'vehiculos_pesados', 
    label: 'Vehículos Pesados', 
    description: 'Vehículos de carga',
    Icon: Truck 
  },
  { 
    id: 'maquinarias', 
    label: 'Maquinarias', 
    description: 'Greda, rodillo, retro y más',
    Icon: HardHat 
  },
  { 
    id: 'izaje_construccion', 
    label: 'Izaje y Construcción', 
    description: 'Materiales y equipos',
    Icon: CraneIcon 
  },
  { 
    id: 'remolque_recreativo', 
    label: 'Remolque Recreativo', 
    description: 'Botes, jetski y más',
    Icon: BoatTrailerIcon 
  },
];

export function ServiceCategorySelector({ value, onChange }: ServiceCategorySelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {serviceCategories.map(({ id, label, description, Icon }) => {
        const isSelected = value === id;
        return (
          <button
            key={id}
            type="button"
            data-testid={`service-category-${id}`}
            onClick={() => onChange(id)}
            className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
              isSelected
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border bg-card hover-elevate'
            }`}
          >
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isSelected ? 'bg-primary/10' : 'bg-muted'
            }`}>
              <Icon
                className={`w-6 h-6 transition-colors ${
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                }`}
              />
            </div>
            <div className="text-center">
              <span
                className={`text-sm font-semibold transition-colors block ${
                  isSelected ? 'text-primary' : 'text-foreground'
                }`}
              >
                {label}
              </span>
              <span className="text-xs text-muted-foreground">
                {description}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export { serviceCategories };
