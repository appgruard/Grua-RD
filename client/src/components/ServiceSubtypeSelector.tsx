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
  Bike,
  Star,
  Crown,
  Wrench,
  ArrowDown,
  XCircle,
  MapPin,
  Flame
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
  { id: 'vehiculo_electrico', label: 'Vehículo Eléctrico/Híbrido', description: 'EV o híbrido', Icon: Leaf },
];

const remolquePlataformaSubtypes: SubtypeOption[] = [
  { id: 'vehiculo_lujo', label: 'Vehículo de Lujo', description: 'BMW, Mercedes, Audi, Lexus', Icon: Gem },
  { id: 'vehiculo_deportivo', label: 'Vehículo Deportivo', description: 'Porsche, Ferrari, Corvette', Icon: Zap },
  { id: 'vehiculo_bajo', label: 'Vehículo Muy Bajo', description: 'Lowered, stance', Icon: ArrowDown },
  { id: 'vehiculo_modificado', label: 'Vehículo Modificado', description: 'Modificaciones aftermarket', Icon: Wrench },
  { id: 'traslado_especial', label: 'Traslado Especial', description: 'Eventos, exhibiciones', Icon: Star },
  { id: 'servicio_premium', label: 'Servicio Premium', description: 'Atención VIP, guantes blancos', Icon: Crown },
];

const remolqueMotocicletasSubtypes: SubtypeOption[] = [
  { id: 'moto_accidentada', label: 'Moto Accidentada', description: 'Daños por accidente', Icon: AlertTriangle },
  { id: 'moto_no_prende', label: 'Moto que No Prende', description: 'Problemas mecánicos', Icon: XCircle },
  { id: 'scooter_pasola', label: 'Scooter / Pasola', description: 'Scooters y pasolas', Icon: Bike },
  { id: 'delivery_accidentado', label: 'Delivery Accidentado', description: 'Motos de delivery', Icon: Package },
  { id: 'moto_alto_cilindraje', label: 'Moto Alto Cilindraje', description: 'Harley, BMW, Honda Gold Wing', Icon: Flame },
  { id: 'traslado_local_moto', label: 'Traslado Local', description: 'Dentro de la ciudad', Icon: MapPin },
  { id: 'reubicacion_moto', label: 'Reubicación', description: 'Cambio de ubicación', Icon: Move },
];

const vehiculosPesadosSubtypes: SubtypeOption[] = [
  { id: 'camiones_cisternas', label: 'Camiones Cisternas', description: 'Transporte de líquidos', Icon: Truck },
  { id: 'de_carga', label: 'De Carga', description: '10 ruedas', Icon: Truck },
  { id: 'patana_cabezote', label: 'Patana / Cabezote', description: 'Trailer o cabezote', Icon: Container },
  { id: 'volteo', label: 'Volteo', description: 'Camión de volteo', Icon: Truck },
  { id: 'transporte_maquinarias', label: 'Transporte Maquinarias', description: 'Maquinaria pesada', Icon: Forklift },
  { id: 'montacargas', label: 'Montacargas', description: 'Forklift / patín', Icon: Forklift },
];

const maquinariasSubtypes: SubtypeOption[] = [
  { id: 'retroexcavadora', label: 'Retroexcavadora', description: 'Excavadora', Icon: Shovel },
  { id: 'rodillo', label: 'Rodillo', description: 'Compactador', Icon: Tractor },
  { id: 'greda', label: 'Greda', description: 'Motoniveladora', Icon: Tractor },
  { id: 'tractor', label: 'Tractor', description: 'Tractor agrícola', Icon: Tractor },
  { id: 'excavadora', label: 'Excavadora', description: 'Excavadora hidráulica', Icon: Shovel },
  { id: 'pala_mecanica', label: 'Pala Mecánica', description: 'Cargador frontal', Icon: Forklift },
];

const izajeConstruccionSubtypes: SubtypeOption[] = [
  { id: 'izaje_materiales', label: 'Izaje de Materiales', description: 'Subida de materiales', Icon: Package },
  { id: 'subida_muebles', label: 'Subida de Muebles', description: 'Muebles y electrodomésticos', Icon: Sofa },
  { id: 'transporte_equipos', label: 'Transporte de Equipos', description: 'Generadores, tanques, etc.', Icon: Box },
];

const remolqueRecreativoSubtypes: SubtypeOption[] = [
  { id: 'remolque_botes', label: 'Remolque de Botes', description: 'Lanchas y botes', Icon: Ship },
  { id: 'remolque_jetski', label: 'Remolque de Jetski', description: 'Moto acuatica', Icon: Waves },
  { id: 'remolque_cuatrimoto', label: 'Remolque Cuatrimoto', description: 'ATV o side-by-side', Icon: Bike },
];

const extraccionSubtypes: SubtypeOption[] = [
  { id: 'extraccion_zanja', label: 'Vehiculo en Zanja', description: 'Caido en cuneta o zanja', Icon: ArrowDown },
  { id: 'extraccion_lodo', label: 'Atascado en Lodo', description: 'Atrapado en lodo o arena', Icon: Waves },
  { id: 'extraccion_volcado', label: 'Vehiculo Volcado', description: 'Volcado de lado o techo', Icon: AlertTriangle },
  { id: 'extraccion_accidente', label: 'Accidente Vehicular', description: 'Extraccion por accidente', Icon: AlertTriangle },
  { id: 'extraccion_dificil', label: 'Situacion Compleja', description: 'Dificil acceso o terreno', Icon: MapPin },
];

const subtypesByCategory: Record<string, SubtypeOption[]> = {
  'auxilio_vial': auxilioVialSubtypes,
  'remolque_especializado': remolqueEspecializadoSubtypes,
  'remolque_plataforma': remolquePlataformaSubtypes,
  'remolque_motocicletas': remolqueMotocicletasSubtypes,
  'vehiculos_pesados': vehiculosPesadosSubtypes,
  'maquinarias': maquinariasSubtypes,
  'izaje_construccion': izajeConstruccionSubtypes,
  'remolque_recreativo': remolqueRecreativoSubtypes,
  'extraccion': extraccionSubtypes,
};

export function ServiceSubtypeSelector({ category, value, onChange }: ServiceSubtypeSelectorProps) {
  const subtypes = subtypesByCategory[category];
  
  if (!subtypes || subtypes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 w-full overflow-hidden">
      <div className="grid grid-cols-1 gap-2 w-full">
        {subtypes.map(({ id, label, description, Icon }) => {
          const isSelected = value === id;
          return (
            <button
              key={id}
              type="button"
              data-testid={`service-subtype-${id}`}
              onClick={() => onChange(isSelected ? null : id)}
              className={`relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 text-left w-full min-w-0 overflow-hidden ${
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
              <div className="flex-1 min-w-0 overflow-hidden">
                <span
                  className={`text-sm font-semibold transition-colors block truncate ${
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
