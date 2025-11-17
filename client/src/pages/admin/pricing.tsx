import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Tarifa } from '@shared/schema';

export default function AdminPricing() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    precioBase: '',
    tarifaPorKm: '',
    zona: '',
  });

  const { data: pricing, isLoading } = useQuery<Tarifa[]>({
    queryKey: ['/api/admin/pricing'],
  });

  const createPricing = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/admin/pricing', {
        ...data,
        precioBase: parseFloat(data.precioBase),
        tarifaPorKm: parseFloat(data.tarifaPorKm),
      });
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
      setFormData({ nombre: '', precioBase: '', tarifaPorKm: '', zona: '' });
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
    createPricing.mutate(formData);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Configuración de Tarifas</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-pricing">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Tarifa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Tarifa</DialogTitle>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precioBase">Precio Base (RD$)</Label>
                  <Input
                    id="precioBase"
                    type="number"
                    step="0.01"
                    value={formData.precioBase}
                    onChange={(e) => setFormData({ ...formData, precioBase: e.target.value })}
                    placeholder="100.00"
                    required
                    data-testid="input-precio-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tarifaPorKm">Tarifa por KM (RD$)</Label>
                  <Input
                    id="tarifaPorKm"
                    type="number"
                    step="0.01"
                    value={formData.tarifaPorKm}
                    onChange={(e) => setFormData({ ...formData, tarifaPorKm: e.target.value })}
                    placeholder="15.00"
                    required
                    data-testid="input-tarifa-km"
                  />
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
                disabled={createPricing.isPending}
                data-testid="button-submit"
              >
                {createPricing.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Tarifa'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-20 bg-muted rounded" />
            </Card>
          ))
        ) : pricing && pricing.length > 0 ? (
          pricing.map((tarifa) => (
            <Card key={tarifa.id} className="p-6" data-testid={`pricing-card-${tarifa.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{tarifa.nombre}</h3>
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

                <div className="flex items-center gap-2">
                  <Switch
                    checked={tarifa.activo}
                    onCheckedChange={(checked) =>
                      togglePricing.mutate({ id: tarifa.id, activo: checked })
                    }
                    data-testid={`switch-active-${tarifa.id}`}
                  />
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No hay tarifas configuradas</p>
          </Card>
        )}
      </div>
    </div>
  );
}
