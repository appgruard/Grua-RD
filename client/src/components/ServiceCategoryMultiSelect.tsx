import { 
  Truck, 
  Wrench, 
  Sparkles,
  HardHat
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { subtypesByCategory } from './ServiceSubtypeSelector';

interface ServiceCategoryMultiSelectProps {
  value: Array<{ categoria: string; subtipos: string[] }>;
  onChange: (value: Array<{ categoria: string; subtipos: string[] }>) => void;
  disabled?: boolean;
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

export interface ServiceSelection {
  categoria: string;
  subtipos: string[];
}

export interface ServiceCategory {
  id: string;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  subtipos: Array<{ id: string; label: string }>;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { 
    id: 'remolque_estandar', 
    label: 'Remolque Estándar', 
    description: 'Servicio de grúa estándar',
    Icon: TowTruckIcon,
    subtipos: []
  },
  { 
    id: 'auxilio_vial', 
    label: 'Auxilio Vial', 
    description: 'Asistencia sin grúa',
    Icon: Wrench,
    subtipos: subtypesByCategory['auxilio_vial'] || []
  },
  { 
    id: 'remolque_especializado', 
    label: 'Remolque Especializado', 
    description: 'Vehículos especiales',
    Icon: Sparkles,
    subtipos: subtypesByCategory['remolque_especializado'] || []
  },
  { 
    id: 'vehiculos_pesados', 
    label: 'Vehículos Pesados', 
    description: 'Vehículos de carga',
    Icon: Truck,
    subtipos: subtypesByCategory['vehiculos_pesados'] || []
  },
  { 
    id: 'maquinarias', 
    label: 'Maquinarias', 
    description: 'Greda, rodillo, retro y más',
    Icon: HardHat,
    subtipos: subtypesByCategory['maquinarias'] || []
  },
  { 
    id: 'izaje_construccion', 
    label: 'Izaje y Construcción', 
    description: 'Materiales y equipos',
    Icon: CraneIcon,
    subtipos: subtypesByCategory['izaje_construccion'] || []
  },
  { 
    id: 'remolque_recreativo', 
    label: 'Remolque Recreativo', 
    description: 'Botes, jetski y más',
    Icon: BoatTrailerIcon,
    subtipos: subtypesByCategory['remolque_recreativo'] || []
  },
];

const serviceCategories = SERVICE_CATEGORIES;

export function ServiceCategoryMultiSelect({ 
  value, 
  onChange, 
  disabled = false 
}: ServiceCategoryMultiSelectProps) {

  const isCategorySelected = (categoryId: string) => {
    return value.some(item => item.categoria === categoryId);
  };

  const getSelectedSubtypes = (categoryId: string): string[] => {
    const category = value.find(item => item.categoria === categoryId);
    return category?.subtipos || [];
  };

  const handleCategoryToggle = (categoryId: string) => {
    if (disabled) return;

    if (isCategorySelected(categoryId)) {
      onChange(value.filter(item => item.categoria !== categoryId));
    } else {
      onChange([...value, { categoria: categoryId, subtipos: [] }]);
    }
  };

  const handleSubtypeToggle = (categoryId: string, subtypeId: string) => {
    if (disabled) return;

    const currentSubtypes = getSelectedSubtypes(categoryId);
    let newSubtypes: string[];

    if (currentSubtypes.includes(subtypeId)) {
      newSubtypes = currentSubtypes.filter(s => s !== subtypeId);
    } else {
      newSubtypes = [...currentSubtypes, subtypeId];
    }

    onChange(
      value.map(item => 
        item.categoria === categoryId 
          ? { ...item, subtipos: newSubtypes }
          : item
      )
    );
  };

  const hasSubtypes = (categoryId: string): boolean => {
    return categoryId !== 'remolque_estandar' && !!subtypesByCategory[categoryId]?.length;
  };

  return (
    <div className="space-y-4" data-testid="service-category-multi-select">
      {serviceCategories.map(({ id, label, description, Icon }) => {
        const isSelected = isCategorySelected(id);
        const subtypes = subtypesByCategory[id] || [];
        const selectedSubtypes = getSelectedSubtypes(id);
        const showSubtypes = isSelected && hasSubtypes(id);

        return (
          <Card 
            key={id} 
            className={`transition-all duration-200 ${
              isSelected 
                ? 'border-primary shadow-md' 
                : 'hover-elevate'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            data-testid={`category-card-${id}`}
          >
            <CardHeader className="p-4 pb-2">
              <label 
                className={`flex items-center gap-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                data-testid={`category-label-${id}`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleCategoryToggle(id)}
                  disabled={disabled}
                  data-testid={`checkbox-category-${id}`}
                />
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
                  <span className="text-xs text-muted-foreground">
                    {description}
                  </span>
                </div>
              </label>
            </CardHeader>

            {showSubtypes && (
              <CardContent className="p-4 pt-2">
                <div className="ml-9 border-l-2 border-primary/20 pl-4">
                  <p className="text-xs text-muted-foreground mb-3">
                    Selecciona los subtipos de servicio:
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedSubtypes.length > 0 ? (
                      selectedSubtypes.map(subtypeId => {
                        const subtype = subtypes.find(s => s.id === subtypeId);
                        return subtype ? (
                          <Badge 
                            key={subtypeId} 
                            variant="default"
                            className="gap-1"
                            data-testid={`badge-subtype-${subtypeId}`}
                          >
                            {subtype.label}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubtypeToggle(id, subtypeId);
                              }}
                              className="ml-1 hover:bg-primary-foreground/20 rounded-full"
                              disabled={disabled}
                              data-testid={`remove-subtype-${subtypeId}`}
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </Badge>
                        ) : null;
                      })
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Ningún subtipo seleccionado
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {subtypes.map(({ id: subtypeId, label: subtypeLabel, Icon: SubtypeIcon }) => {
                      const isSubtypeSelected = selectedSubtypes.includes(subtypeId);
                      return (
                        <label
                          key={subtypeId}
                          className={`flex items-center gap-3 p-2 rounded-lg border transition-all duration-200 ${
                            isSubtypeSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover-elevate'
                          } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          data-testid={`subtype-label-${subtypeId}`}
                        >
                          <Checkbox
                            checked={isSubtypeSelected}
                            onCheckedChange={() => handleSubtypeToggle(id, subtypeId)}
                            disabled={disabled}
                            data-testid={`checkbox-subtype-${subtypeId}`}
                          />
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSubtypeSelected ? 'bg-primary/10' : 'bg-muted'
                          }`}>
                            <SubtypeIcon
                              className={`w-4 h-4 transition-colors ${
                                isSubtypeSelected ? 'text-primary' : 'text-muted-foreground'
                              }`}
                            />
                          </div>
                          <span
                            className={`text-sm transition-colors ${
                              isSubtypeSelected ? 'text-primary font-medium' : 'text-foreground'
                            }`}
                          >
                            {subtypeLabel}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {value.length === 0 && (
        <p 
          className="text-sm text-destructive text-center py-2"
          data-testid="validation-message"
        >
          Debes seleccionar al menos una categoría de servicio
        </p>
      )}
    </div>
  );
}

export { serviceCategories };
