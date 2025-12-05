import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Tarifa } from '@shared/schema';
import { serviceCategories } from '@/components/ServiceCategorySelector';
import { subtypesByCategory } from '@/components/ServiceSubtypeSelector';

const categoryLabels: Record<string, string> = {
  remolque_estandar: 'Remolque Estándar',
  remolque_motocicletas: 'Remolque Motocicletas',
  remolque_plataforma: 'Plataforma / Flatbed',
  auxilio_vial: 'Auxilio Vial',
  remolque_especializado: 'Remolque Especializado',
  camiones_pesados: 'Camiones Pesados',
  vehiculos_pesados: 'Vehículos Pesados',
  maquinarias: 'Maquinarias',
  izaje_construccion: 'Izaje y Construcción',
  remolque_recreativo: 'Remolque Recreativo',
  extraccion: 'Extracción',
};

const subtypeLabels: Record<string, string> = {};
Object.values(subtypesByCategory).forEach(subtypes => {
  subtypes.forEach(subtype => {
    subtypeLabels[subtype.id] = subtype.label;
  });
});

export default function AdminPricing() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingTarifa, setEditingTarifa] = useState<Tarifa | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['general']));
  const [formData, setFormData] = useState({
    nombre: '',
    servicioCategoria: '' as string | null,
    servicioSubtipo: '' as string | null,
    precioBase: '',
    tarifaPorKm: '',
    zona: '',
  });

  const { data: pricing, isLoading } = useQuery<Tarifa[]>({
    queryKey: ['/api/admin/pricing'],
  });

  const availableSubtypes = useMemo(() => {
    if (!formData.servicioCategoria) return [];
    return subtypesByCategory[formData.servicioCategoria] || [];
  }, [formData.servicioCategoria]);

  const resetForm = () => {
    setFormData({
      nombre: '',
      servicioCategoria: null,
      servicioSubtipo: null,
      precioBase: '',
      tarifaPorKm: '',
      zona: '',
    });
    setEditingTarifa(null);
  };

  const createPricing = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        precioBase: parseFloat(data.precioBase),
        tarifaPorKm: parseFloat(data.tarifaPorKm),
        servicioCategoria: data.servicioCategoria || null,
        servicioSubtipo: data.servicioSubtipo || null,
      };
      const res = await apiRequest('POST', '/api/admin/pricing', payload);
      if (!res.ok) throw new Error('Failed to create pricing');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing'] });
      toast({
        title: 'Tarifa creada',
        description: 'La nueva tarifa ha sido agregada',
      });
      setOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo crear la tarifa',
        variant: 'destructive',
      });
    },
  });

  const updatePricing = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const payload: any = { ...data };
      if (data.precioBase) payload.precioBase = parseFloat(data.precioBase);
      if (data.tarifaPorKm) payload.tarifaPorKm = parseFloat(data.tarifaPorKm);
      if (data.servicioCategoria !== undefined) payload.servicioCategoria = data.servicioCategoria || null;
      if (data.servicioSubtipo !== undefined) payload.servicioSubtipo = data.servicioSubtipo || null;
      const res = await apiRequest('PUT', `/api/admin/pricing/${id}`, payload);
      if (!res.ok) throw new Error('Failed to update pricing');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing'] });
      toast({
        title: 'Tarifa actualizada',
        description: 'Los cambios han sido guardados',
      });
      setOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la tarifa',
        variant: 'destructive',
      });
    },
  });

  const togglePricing = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const res = await apiRequest('PUT', `/api/admin/pricing/${id}`, { activo });
      if (!res.ok) throw new Error('Failed to update pricing');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTarifa) {
      updatePricing.mutate({ id: editingTarifa.id, data: formData });
    } else {
      createPricing.mutate(formData);
    }
  };

  const handleEdit = (tarifa: Tarifa) => {
    setEditingTarifa(tarifa);
    setFormData({
      nombre: tarifa.nombre,
      servicioCategoria: tarifa.servicioCategoria || null,
      servicioSubtipo: (tarifa as any).servicioSubtipo || null,
      precioBase: String(tarifa.precioBase),
      tarifaPorKm: String(tarifa.tarifaPorKm),
      zona: tarifa.zona || '',
    });
    setOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  const handleCategoryChange = (value: string) => {
    setFormData({ 
      ...formData, 
      servicioCategoria: value === 'general' ? null : value,
      servicioSubtipo: null
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const groupedPricing = useMemo(() => {
    if (!pricing) return {};
    
    return pricing.reduce((acc, tarifa) => {
      const category = tarifa.servicioCategoria || 'general';
      if (!acc[category]) acc[category] = [];
      acc[category].push(tarifa);
      return acc;
    }, {} as Record<string, Tarifa[]>);
  }, [pricing]);

  const getCategoryTarifaCount = (category: string) => {
    return groupedPricing[category]?.length || 0;
  };

  const isOnsiteService = formData.servicioCategoria === 'auxilio_vial' && 
    formData.servicioSubtipo && 
    ['cambio_goma', 'inflado_neumatico', 'paso_corriente', 'cerrajero_automotriz', 
     'suministro_combustible', 'envio_bateria', 'diagnostico_obd'].includes(formData.servicioSubtipo);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Configuración de Tarifas</h1>
          <p className="text-muted-foreground mt-1">
            Administra las tarifas por categoría y subcategoría de servicio
          </p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-pricing">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Tarifa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTarifa ? 'Editar Tarifa' : 'Crear Nueva Tarifa'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Tarifa Estándar"
                  required
                  data-testid="input-nombre"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="servicioCategoria">Categoría de Servicio</Label>
                <Select
                  value={formData.servicioCategoria || 'general'}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger data-testid="select-categoria">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General (Todas las categorías)</SelectItem>
                    {serviceCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Asigna esta tarifa a una categoría específica o déjala como general
                </p>
              </div>

              {availableSubtypes.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="servicioSubtipo">Subcategoría de Servicio (Opcional)</Label>
                  <Select
                    value={formData.servicioSubtipo || 'all_subtypes'}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      servicioSubtipo: value === 'all_subtypes' ? null : value 
                    })}
                  >
                    <SelectTrigger data-testid="select-subtipo">
                      <SelectValue placeholder="Selecciona una subcategoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_subtypes">Todas las subcategorías</SelectItem>
                      {availableSubtypes.map((subtype) => (
                        <SelectItem key={subtype.id} value={subtype.id}>
                          {subtype.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Las tarifas específicas por subcategoría tienen prioridad sobre las tarifas de categoría
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precioBase">
                    {isOnsiteService ? 'Precio Fijo (RD$)' : 'Precio Base (RD$)'}
                  </Label>
                  <Input
                    id="precioBase"
                    type="number"
                    step="0.01"
                    value={formData.precioBase}
                    onChange={(e) => setFormData({ ...formData, precioBase: e.target.value })}
                    placeholder={isOnsiteService ? "500.00" : "100.00"}
                    required
                    data-testid="input-precio-base"
                  />
                  {isOnsiteService && (
                    <p className="text-xs text-muted-foreground">
                      Para servicios en sitio, este es el precio total
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tarifaPorKm">Tarifa por KM (RD$)</Label>
                  <Input
                    id="tarifaPorKm"
                    type="number"
                    step="0.01"
                    value={formData.tarifaPorKm}
                    onChange={(e) => setFormData({ ...formData, tarifaPorKm: e.target.value })}
                    placeholder={isOnsiteService ? "0.00" : "15.00"}
                    required
                    data-testid="input-tarifa-km"
                  />
                  {isOnsiteService && (
                    <p className="text-xs text-muted-foreground">
                      Normalmente 0 para servicios en sitio
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zona">Zona (Opcional)</Label>
                <Input
                  id="zona"
                  value={formData.zona}
                  onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
                  placeholder="Ej: Santo Domingo"
                  data-testid="input-zona"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createPricing.isPending || updatePricing.isPending}
                data-testid="button-submit"
              >
                {(createPricing.isPending || updatePricing.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingTarifa ? 'Guardando...' : 'Creando...'}
                  </>
                ) : (
                  editingTarifa ? 'Guardar Cambios' : 'Crear Tarifa'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-20 bg-muted rounded" />
            </Card>
          ))
        ) : groupedPricing && Object.keys(groupedPricing).length > 0 ? (
          <>
            {groupedPricing['general'] && (
              <div className="mb-6">
                <button
                  onClick={() => toggleCategory('general')}
                  className="flex items-center gap-2 mb-3 w-full text-left hover-elevate p-2 rounded-lg"
                  data-testid="toggle-category-general"
                >
                  {expandedCategories.has('general') ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                  <h2 className="text-lg font-semibold">Tarifas Generales</h2>
                  <Badge variant="secondary">{getCategoryTarifaCount('general')}</Badge>
                </button>
                {expandedCategories.has('general') && (
                  <div className="grid gap-4 ml-7">
                    {groupedPricing['general'].map((tarifa) => (
                      <TarifaCard 
                        key={tarifa.id} 
                        tarifa={tarifa} 
                        onEdit={handleEdit}
                        onToggle={(id, activo) => togglePricing.mutate({ id, activo })}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {Object.entries(groupedPricing)
              .filter(([category]) => category !== 'general')
              .map(([category, tarifas]) => (
                <div key={category}>
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center gap-2 mb-3 w-full text-left hover-elevate p-2 rounded-lg"
                    data-testid={`toggle-category-${category}`}
                  >
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                    <h2 className="text-lg font-semibold">
                      {categoryLabels[category] || category}
                    </h2>
                    <Badge variant="secondary">{tarifas.length}</Badge>
                  </button>
                  {expandedCategories.has(category) && (
                    <div className="grid gap-4 ml-7">
                      {tarifas.map((tarifa) => (
                        <TarifaCard 
                          key={tarifa.id} 
                          tarifa={tarifa} 
                          onEdit={handleEdit}
                          onToggle={(id, activo) => togglePricing.mutate({ id, activo })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No hay tarifas configuradas</p>
            <p className="text-sm text-muted-foreground mt-2">
              Crea tarifas para cada categoría y subcategoría de servicio
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

interface TarifaCardProps {
  tarifa: Tarifa;
  onEdit: (tarifa: Tarifa) => void;
  onToggle: (id: string, activo: boolean) => void;
}

function TarifaCard({ tarifa, onEdit, onToggle }: TarifaCardProps) {
  const tarifaSubtipo = (tarifa as any).servicioSubtipo;
  
  return (
    <Card className="p-6" data-testid={`pricing-card-${tarifa.id}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-lg font-semibold">{tarifa.nombre}</h3>
            {tarifa.servicioCategoria && (
              <Badge variant="outline">
                {categoryLabels[tarifa.servicioCategoria] || tarifa.servicioCategoria}
              </Badge>
            )}
            {tarifaSubtipo && (
              <Badge variant="secondary">
                {subtypeLabels[tarifaSubtipo] || tarifaSubtipo}
              </Badge>
            )}
            {tarifa.activo ? (
              <Badge variant="default">Activo</Badge>
            ) : (
              <Badge variant="secondary">Inactivo</Badge>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-sm text-muted-foreground">Precio Base</p>
              <p className="text-lg font-bold">
                RD$ {parseFloat(tarifa.precioBase as string).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Por Kilómetro</p>
              <p className="text-lg font-bold">
                RD$ {parseFloat(tarifa.tarifaPorKm as string).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tarifa Nocturna</p>
              <p className="text-lg font-bold">
                {parseFloat(tarifa.tarifaNocturnaMultiplicador as string).toFixed(1)}x
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Zona</p>
              <p className="text-lg font-bold">{tarifa.zona || 'General'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(tarifa)}
            data-testid={`button-edit-${tarifa.id}`}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Switch
            checked={tarifa.activo}
            onCheckedChange={(checked) => onToggle(tarifa.id, checked)}
            data-testid={`switch-active-${tarifa.id}`}
          />
        </div>
      </div>
    </Card>
  );
}
