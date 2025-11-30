import { 
  CircleDot,
  Wind,
  Zap,
  Key,
  Fuel,
  Battery,
  MonitorSmartphone,
  Move,
  CircleSlash,
  Compass,
  AlertTriangle,
  Gem,
  Leaf,
  Truck,
  Container,
  Forklift,
  Tractor,
  Shovel,
  Package,
  Sofa,
  Box,
  Ship,
  Waves,
  Bike
} from 'lucide-react';

interface ServiceSubtypeSelectorProps {
  category: string;
  value: string | null;
  onChange: (subtype: string | null) => void;
}

interface SubtypeOption {
  id: string;
  label: string;
  description?: string;
  Icon: any;
}

const auxilioVialSubtypes: SubtypeOption[] = [
  { id: 'cambio_goma', label: 'Cambio de Goma', description: 'Cambio de neumático pinchado', Icon: CircleDot },
  { id: 'inflado_neumatico', label: 'Inflado de Neumático', description: 'Inflado de goma baja', Icon: Wind },
  { id: 'paso_corriente', label: 'Paso de Corriente', description: 'Batería descargada', Icon: Zap },
  { id: 'cerrajero_automotriz', label: 'Cerrajero Automotriz', description: 'Llaves perdidas o bloqueadas', Icon: Key },
  { id: 'suministro_combustible', label: 'Suministro de Combustible', description: 'Entrega de gasolina/diesel', Icon: Fuel },
  { id: 'envio_bateria', label: 'Envío/Instalación Batería', description: 'Nueva batería a domicilio', Icon: Battery },
  { id: 'diagnostico_obd', label: 'Diagnóstico OBD-II', description: 'Escaneo de computadora', Icon: MonitorSmartphone },
  { id: 'extraccion_vehiculo', label: 'Extracción de Vehículo', description: 'Vehículo atascado', Icon: Move },
];

const remolqueEspecializadoSubtypes: SubtypeOption[] = [
  { id: 'vehiculo_sin_llanta', label: 'Vehículo sin Llanta', description: 'Falta una o más llantas', Icon: CircleSlash },
  { id: 'vehiculo_sin_direccion', label: 'Vehículo sin Dirección', description: 'Dirección dañada', Icon: Compass },
  { id: 'vehiculo_chocado', label: 'Vehículo Chocado', description: 'Daños por accidente', Icon: AlertTriangle },
  { id: 'vehiculo_lujo', label: 'Vehículo de Lujo', description: 'Bajo perfil / premium', Icon: Gem },
  { id: 'vehiculo_electrico', label: 'Vehículo Eléctrico/Híbrido', description: 'EV o híbrido', Icon: Leaf },
];

const camionesPesadosSubtypes: SubtypeOption[] = [
  { id: 'camion_liviano', label: 'Camión Liviano', description: 'Fuso, NPR, Canter', Icon: Truck },
  { id: 'camion_mediano', label: 'Camión Mediano', description: '10 ruedas', Icon: Truck },
  { id: 'patana_cabezote', label: 'Patana / Cabezote', description: 'Trailer o cabezote', Icon: Container },
  { id: 'volteo', label: 'Volteo', description: 'Camión de volteo', Icon: Truck },
  { id: 'transporte_maquinarias', label: 'Transporte Maquinarias', description: 'Maquinaria pesada', Icon: Forklift },
  { id: 'montacargas', label: 'Montacargas', description: 'Forklift / patín', Icon: Forklift },
  { id: 'retroexcavadora', label: 'Retroexcavadora', description: 'Excavadora', Icon: Shovel },
  { id: 'tractor', label: 'Tractor', description: 'Tractor agrícola', Icon: Tractor },
];

const izajeConstruccionSubtypes: SubtypeOption[] = [
  { id: 'izaje_materiales', label: 'Izaje de Materiales', description: 'Subida de materiales', Icon: Package },
  { id: 'subida_muebles', label: 'Subida de Muebles', description: 'Muebles y electrodomésticos', Icon: Sofa },
  { id: 'transporte_equipos', label: 'Transporte de Equipos', description: 'Generadores, tanques, etc.', Icon: Box },
];

const remolqueRecreativoSubtypes: SubtypeOption[] = [
  { id: 'remolque_botes', label: 'Remolque de Botes', description: 'Lanchas y botes', Icon: Ship },
  { id: 'remolque_jetski', label: 'Remolque de Jetski', description: 'Moto acuática', Icon: Waves },
  { id: 'remolque_cuatrimoto', label: 'Remolque Cuatrimoto', description: 'ATV o side-by-side', Icon: Bike },
];

const subtypesByCategory: Record<string, SubtypeOption[]> = {
  'auxilio_vial': auxilioVialSubtypes,
  'remolque_especializado': remolqueEspecializadoSubtypes,
  'camiones_pesados': camionesPesadosSubtypes,
  'izaje_construccion': izajeConstruccionSubtypes,
  'remolque_recreativo': remolqueRecreativoSubtypes,
};

export function ServiceSubtypeSelector({ category, value, onChange }: ServiceSubtypeSelectorProps) {
  const subtypes = subtypesByCategory[category];
  
  if (!subtypes || subtypes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2">
        {subtypes.map(({ id, label, description, Icon }) => {
          const isSelected = value === id;
          return (
            <button
              key={id}
              type="button"
              data-testid={`service-subtype-${id}`}
              onClick={() => onChange(isSelected ? null : id)}
              className={`relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover-elevate'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                isSelected ? 'bg-primary/10' : 'bg-muted'
              }`}>
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm font-semibold transition-colors block ${
                    isSelected ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {label}
                </span>
                {description && (
                  <span className="text-xs text-muted-foreground truncate block">
                    {description}
                  </span>
                )}
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function hasSubtypes(category: string): boolean {
  return category !== 'remolque_estandar' && subtypesByCategory[category]?.length > 0;
}

export { subtypesByCategory };
