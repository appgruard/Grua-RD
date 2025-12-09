import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Truck, ShieldCheck, ShieldAlert, Wrench, ChevronDown, ChevronUp, CreditCard, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { SERVICE_CATEGORIES } from '@/components/ServiceCategoryMultiSelect';
import type { Conductor, User } from '@shared/schema';

interface ServiceSelection {
  categoria: string;
  subtipos: string[];
}

interface DriverVerification {
  cedulaVerificada: boolean;
  validationScore?: number;
  validatedAt?: string;
}

type ConductorWithUser = Conductor & { 
  user: User;
  servicios?: ServiceSelection[];
  verification?: DriverVerification;
};

export default function AdminDrivers() {
  const [search, setSearch] = useState('');
  const [expandedDrivers, setExpandedDrivers] = useState<Set<number>>(new Set());
  
  const { data: drivers, isLoading } = useQuery<ConductorWithUser[]>({
    queryKey: ['/api/admin/drivers'],
  });

  const toggleExpanded = (driverId: number) => {
    setExpandedDrivers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(driverId)) {
        newSet.delete(driverId);
      } else {
        newSet.add(driverId);
      }
      return newSet;
    });
  };

  const filteredDrivers = drivers?.filter(driver =>
    driver.user.email.toLowerCase().includes(search.toLowerCase()) ||
    driver.user.nombre.toLowerCase().includes(search.toLowerCase()) ||
    driver.placaGrua.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryLabel = (categoryId: string) => {
    const category = SERVICE_CATEGORIES.find(c => c.id === categoryId);
    return category?.label || categoryId;
  };

  const getSubtipoLabel = (categoryId: string, subtipoId: string) => {
    const category = SERVICE_CATEGORIES.find(c => c.id === categoryId);
    const subtipo = category?.subtipos.find(s => s.id === subtipoId);
    return subtipo?.label || subtipoId;
  };

  const getVerificationBadge = (driver: ConductorWithUser) => {
    if (!driver.verification) {
      return (
        <Badge variant="secondary" className="gap-1" data-testid={`badge-verifik-unknown-${driver.id}`}>
          <ShieldAlert className="w-3 h-3" />
          Sin datos
        </Badge>
      );
    }

    if (!driver.verification.cedulaVerificada) {
      return (
        <Badge variant="secondary" className="gap-1" data-testid={`badge-verifik-pending-${driver.id}`}>
          <ShieldAlert className="w-3 h-3" />
          Pendiente
        </Badge>
      );
    }

    const score = driver.verification.validationScore;
    if (score === undefined) {
      return (
        <Badge variant="default" className="gap-1" data-testid={`badge-verifik-verified-${driver.id}`}>
          <ShieldCheck className="w-3 h-3" />
          Verificado
        </Badge>
      );
    }

    const scorePercent = Math.round(score * 100);
    const isValid = score >= 0.6;
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isValid ? "default" : "destructive"} 
            className="gap-1 cursor-help"
            data-testid={`badge-verifik-score-${driver.id}`}
          >
            <ShieldCheck className="w-3 h-3" />
            {scorePercent}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Puntuación de validación: {scorePercent}%</p>
          <p className="text-xs text-muted-foreground">
            {isValid ? 'Validación aprobada (≥60%)' : 'Validación insuficiente (<60%)'}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
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
              <TableHead>Categoría</TableHead>
              <TableHead>Grúa</TableHead>
              <TableHead>Servicios</TableHead>
              <TableHead>Verificación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Calificación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <div className="h-6 bg-muted rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredDrivers && filteredDrivers.length > 0 ? (
              filteredDrivers.map((driver) => {
                const isExpanded = expandedDrivers.has(driver.id);
                const hasServices = driver.servicios && driver.servicios.length > 0;
                
                return (
                  <TableRow key={driver.id} data-testid={`driver-row-${driver.id}`}>
                    <TableCell className="font-medium">
                      <div>
                        <p>{driver.user.nombre} {driver.user.apellido}</p>
                        <p className="text-sm text-muted-foreground">{driver.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{driver.licencia}</TableCell>
                    <TableCell>
                      {driver.licenciaCategoria ? (
                        <div className="space-y-1">
                          <Badge variant="default" className="gap-1" data-testid={`badge-license-category-${driver.id}`}>
                            <CreditCard className="w-3 h-3" />
                            {driver.licenciaCategoria}
                          </Badge>
                          {driver.licenciaRestricciones && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="gap-1 cursor-help text-xs" data-testid={`badge-license-restrictions-${driver.id}`}>
                                  <AlertTriangle className="w-3 h-3" />
                                  Restricciones
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{driver.licenciaRestricciones}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin verificar</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <span>{driver.marcaGrua} {driver.modeloGrua}</span>
                          <p className="text-xs text-muted-foreground font-mono">{driver.placaGrua}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {hasServices ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            {driver.servicios!.slice(0, isExpanded ? undefined : 2).map((service) => (
                              <Tooltip key={service.categoria}>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    variant="secondary" 
                                    className="gap-1 cursor-help text-xs"
                                    data-testid={`badge-service-${driver.id}-${service.categoria}`}
                                  >
                                    <Wrench className="w-3 h-3" />
                                    {getCategoryLabel(service.categoria)}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {service.subtipos.length > 0 ? (
                                    <div className="space-y-1">
                                      <p className="font-medium">{getCategoryLabel(service.categoria)}</p>
                                      <ul className="text-xs text-muted-foreground">
                                        {service.subtipos.map(subtipo => (
                                          <li key={subtipo}>• {getSubtipoLabel(service.categoria, subtipo)}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : (
                                    <p>{getCategoryLabel(service.categoria)}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            ))}
                            {!isExpanded && driver.servicios!.length > 2 && (
                              <Badge 
                                variant="outline" 
                                className="cursor-pointer gap-1 text-xs"
                                onClick={() => toggleExpanded(driver.id)}
                                data-testid={`badge-more-services-${driver.id}`}
                              >
                                +{driver.servicios!.length - 2}
                                <ChevronDown className="w-3 h-3" />
                              </Badge>
                            )}
                            {isExpanded && driver.servicios!.length > 2 && (
                              <Badge 
                                variant="outline" 
                                className="cursor-pointer gap-1 text-xs"
                                onClick={() => toggleExpanded(driver.id)}
                                data-testid={`badge-collapse-services-${driver.id}`}
                              >
                                <ChevronUp className="w-3 h-3" />
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin servicios</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getVerificationBadge(driver)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={driver.disponible ? 'default' : 'secondary'}>
                        {driver.disponible ? 'Disponible' : 'No disponible'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {driver.user.calificacionPromedio ? (
                        <span className="font-medium" data-testid={`text-rating-${driver.id}`}>
                          <span className="text-yellow-500">★</span> {parseFloat(driver.user.calificacionPromedio as string).toFixed(1)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
