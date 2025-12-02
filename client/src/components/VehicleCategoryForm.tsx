import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Car, Check, AlertCircle } from 'lucide-react';
import { SERVICE_CATEGORIES } from '@/components/ServiceCategoryMultiSelect';

export interface VehicleData {
  categoria: string;
  placa: string;
  color: string;
  capacidad: string;
  marca: string;
  modelo: string;
  anio: string;
  detalles: string;
  fotoUrl?: string;
}

interface VehicleCategoryFormProps {
  selectedCategories: string[];
  vehicles: VehicleData[];
  onChange: (vehicles: VehicleData[]) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
}

export function VehicleCategoryForm({
  selectedCategories,
  vehicles,
  onChange,
  disabled = false,
  errors = {},
}: VehicleCategoryFormProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(selectedCategories));

  const getVehicleForCategory = (categoria: string): VehicleData => {
    const existing = vehicles.find(v => v.categoria === categoria);
    return existing || {
      categoria,
      placa: '',
      color: '',
      capacidad: '',
      marca: '',
      modelo: '',
      anio: '',
      detalles: '',
    };
  };

  const updateVehicle = (categoria: string, field: keyof VehicleData, value: string) => {
    const existingIndex = vehicles.findIndex(v => v.categoria === categoria);
    const vehicleData = getVehicleForCategory(categoria);
    const updatedVehicle = { ...vehicleData, [field]: value };

    if (existingIndex >= 0) {
      const newVehicles = [...vehicles];
      newVehicles[existingIndex] = updatedVehicle;
      onChange(newVehicles);
    } else {
      onChange([...vehicles, updatedVehicle]);
    }
  };

  const toggleCategory = (categoria: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoria)) {
      newExpanded.delete(categoria);
    } else {
      newExpanded.add(categoria);
    }
    setExpandedCategories(newExpanded);
  };

  const isVehicleComplete = (vehicle: VehicleData): boolean => {
    return Boolean(vehicle.placa && vehicle.color);
  };

  const getCategoryLabel = (categoryId: string): string => {
    const category = SERVICE_CATEGORIES.find(c => c.id === categoryId);
    return category?.label || categoryId;
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = SERVICE_CATEGORIES.find(c => c.id === categoryId);
    return category?.Icon || Car;
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <Car className="w-10 h-10 mx-auto text-primary mb-2" />
        <p className="text-sm text-muted-foreground">
          Configura los datos del vehículo para cada categoría de servicio que seleccionaste.
          Cada categoría requiere su propio vehículo.
        </p>
      </div>

      {selectedCategories.map((categoria) => {
        const vehicle = getVehicleForCategory(categoria);
        const isExpanded = expandedCategories.has(categoria);
        const isComplete = isVehicleComplete(vehicle);
        const CategoryIcon = getCategoryIcon(categoria);
        const hasError = errors[`vehicle_${categoria}`];

        return (
          <Card key={categoria} className={`transition-all ${hasError ? 'border-destructive' : ''}`}>
            <CardHeader className="p-4">
              <button
                type="button"
                onClick={() => toggleCategory(categoria)}
                className="flex items-center justify-between w-full text-left"
                disabled={disabled}
                data-testid={`button-toggle-vehicle-${categoria}`}
              >
                <div className="flex items-center gap-3">
                  <CategoryIcon className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">{getCategoryLabel(categoria)}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {isComplete ? (
                    <Badge variant="default" className="gap-1">
                      <Check className="w-3 h-3" />
                      Configurado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Pendiente
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </button>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 space-y-4">
                {hasError && (
                  <p className="text-sm text-destructive">{hasError}</p>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`placa-${categoria}`}>Placa *</Label>
                    <Input
                      id={`placa-${categoria}`}
                      placeholder="A123456"
                      value={vehicle.placa}
                      onChange={(e) => updateVehicle(categoria, 'placa', e.target.value.toUpperCase())}
                      disabled={disabled}
                      data-testid={`input-placa-${categoria}`}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`color-${categoria}`}>Color *</Label>
                    <Input
                      id={`color-${categoria}`}
                      placeholder="Blanco"
                      value={vehicle.color}
                      onChange={(e) => updateVehicle(categoria, 'color', e.target.value)}
                      disabled={disabled}
                      data-testid={`input-color-${categoria}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`marca-${categoria}`}>Marca</Label>
                    <Input
                      id={`marca-${categoria}`}
                      placeholder="Ford"
                      value={vehicle.marca}
                      onChange={(e) => updateVehicle(categoria, 'marca', e.target.value)}
                      disabled={disabled}
                      data-testid={`input-marca-${categoria}`}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`modelo-${categoria}`}>Modelo</Label>
                    <Input
                      id={`modelo-${categoria}`}
                      placeholder="F-450"
                      value={vehicle.modelo}
                      onChange={(e) => updateVehicle(categoria, 'modelo', e.target.value)}
                      disabled={disabled}
                      data-testid={`input-modelo-${categoria}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`anio-${categoria}`}>Año</Label>
                    <Input
                      id={`anio-${categoria}`}
                      placeholder="2023"
                      value={vehicle.anio}
                      onChange={(e) => updateVehicle(categoria, 'anio', e.target.value.replace(/\D/g, ''))}
                      maxLength={4}
                      disabled={disabled}
                      data-testid={`input-anio-${categoria}`}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`capacidad-${categoria}`}>Capacidad</Label>
                    <Input
                      id={`capacidad-${categoria}`}
                      placeholder="5 toneladas"
                      value={vehicle.capacidad}
                      onChange={(e) => updateVehicle(categoria, 'capacidad', e.target.value)}
                      disabled={disabled}
                      data-testid={`input-capacidad-${categoria}`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`detalles-${categoria}`}>Detalles adicionales</Label>
                  <Textarea
                    id={`detalles-${categoria}`}
                    placeholder="Características especiales del vehículo..."
                    value={vehicle.detalles}
                    onChange={(e) => updateVehicle(categoria, 'detalles', e.target.value)}
                    disabled={disabled}
                    rows={2}
                    data-testid={`input-detalles-${categoria}`}
                  />
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
