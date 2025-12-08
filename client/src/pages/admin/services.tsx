import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search } from 'lucide-react';
import { useState } from 'react';
import type { ServicioWithDetails } from '@shared/schema';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminServices() {
  const [search, setSearch] = useState('');
  
  const { data: services, isLoading } = useQuery<ServicioWithDetails[]>({
    queryKey: ['/api/admin/services'],
  });

  const filteredServices = services?.filter(service =>
    service.cliente?.email.toLowerCase().includes(search.toLowerCase()) ||
    service.conductor?.email.toLowerCase().includes(search.toLowerCase()) ||
    service.id.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors: Record<string, "secondary" | "default" | "destructive"> = {
    pendiente: 'secondary',
    aceptado: 'default',
    conductor_en_sitio: 'default',
    cargando: 'default',
    en_progreso: 'default',
    completado: 'default',
    cancelado: 'destructive',
  };

  const statusLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    aceptado: 'Aceptado',
    conductor_en_sitio: 'En Sitio',
    cargando: 'Cargando',
    en_progreso: 'En Progreso',
    completado: 'Completado',
    cancelado: 'Cancelado',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Servicios</h1>
      </div>

      <Card className="mb-6 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Conductor</TableHead>
              <TableHead>Distancia</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <div className="h-6 bg-muted rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredServices && filteredServices.length > 0 ? (
              filteredServices.map((service) => (
                <TableRow key={service.id} data-testid={`service-row-${service.id}`}>
                  <TableCell className="text-sm">
                    {format(new Date(service.createdAt), 'PP p', { locale: es })}
                  </TableCell>
                  <TableCell>
                    {service.cliente ? (
                      <div>
                        <p className="font-medium">{service.cliente.nombre} {service.cliente.apellido}</p>
                        <p className="text-sm text-muted-foreground">{service.cliente.email}</p>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {service.conductor ? (
                      <div>
                        <p className="font-medium">{service.conductor.nombre} {service.conductor.apellido}</p>
                        <p className="text-sm text-muted-foreground">{service.conductor.email}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell>{parseFloat(service.distanciaKm as string).toFixed(1)} km</TableCell>
                  <TableCell className="font-medium">
                    RD$ {parseFloat(service.costoTotal as string).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[service.estado]}>
                      {statusLabels[service.estado]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No se encontraron servicios
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
