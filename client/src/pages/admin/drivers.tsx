import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Truck } from 'lucide-react';
import { useState } from 'react';
import type { Conductor, User } from '@shared/schema';

type ConductorWithUser = Conductor & { user: User };

export default function AdminDrivers() {
  const [search, setSearch] = useState('');
  
  const { data: drivers, isLoading } = useQuery<ConductorWithUser[]>({
    queryKey: ['/api/admin/drivers'],
  });

  const filteredDrivers = drivers?.filter(driver =>
    driver.user.email.toLowerCase().includes(search.toLowerCase()) ||
    driver.user.nombre.toLowerCase().includes(search.toLowerCase()) ||
    driver.placaGrua.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Conductores</h1>
      </div>

      <Card className="mb-6 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, correo o placa..."
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
              <TableHead>Conductor</TableHead>
              <TableHead>Licencia</TableHead>
              <TableHead>Grúa</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Calificación</TableHead>
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
            ) : filteredDrivers && filteredDrivers.length > 0 ? (
              filteredDrivers.map((driver) => (
                <TableRow key={driver.id} data-testid={`driver-row-${driver.id}`}>
                  <TableCell className="font-medium">
                    <div>
                      <p>{driver.user.nombre} {driver.user.apellido}</p>
                      <p className="text-sm text-muted-foreground">{driver.user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{driver.licencia}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <span>{driver.marcaGrua} {driver.modeloGrua}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{driver.placaGrua}</TableCell>
                  <TableCell>
                    <Badge variant={driver.disponible ? 'default' : 'secondary'}>
                      {driver.disponible ? 'Disponible' : 'No disponible'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {driver.user.calificacionPromedio ? (
                      <span className="font-medium">
                        ⭐ {parseFloat(driver.user.calificacionPromedio as string).toFixed(1)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No se encontraron conductores
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
