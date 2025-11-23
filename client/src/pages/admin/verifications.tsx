import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Phone, IdCard, Search, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  cedula: string | null;
  cedulaVerificada: boolean;
  telefono: string | null;
  telefonoVerificado: boolean;
  userType: string;
  createdAt: string;
}

interface VerificationStats {
  totalUsers: number;
  fullyVerified: number;
  pendingPhone: number;
  pendingCedula: number;
}

interface VerificationStatusResponse {
  users: User[];
  total: number;
  stats: VerificationStats;
  page: number;
  limit: number;
}

interface VerificationHistoryItem {
  id: string;
  userId: string;
  verificationType: string;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  errorMessage: string | null;
  metadata: string | null;
  createdAt: string;
}

type StatusFilter = 'all' | 'verified' | 'pending-phone' | 'pending-cedula' | 'unverified';

export default function AdminVerifications() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const queryParams = new URLSearchParams();
  if (searchTerm) queryParams.set('search', searchTerm);
  if (statusFilter !== 'all') queryParams.set('status', statusFilter);
  queryParams.set('page', page.toString());
  queryParams.set('limit', limit.toString());

  const { data, isLoading, isError } = useQuery<VerificationStatusResponse>({
    queryKey: ['/api/admin/verification-status', queryParams.toString()],
    queryFn: async () => {
      const url = `/api/admin/verification-status${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch verification status');
      return res.json();
    },
  });

  useEffect(() => {
    if (isError) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el estado de verificación',
        variant: 'destructive',
      });
    }
  }, [isError, toast]);

  const { data: historyData, isLoading: isHistoryLoading } = useQuery<VerificationHistoryItem[]>({
    queryKey: ['/api/admin/users', selectedUserId, 'verification-history'],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const res = await fetch(`/api/admin/users/${selectedUserId}/verification-history`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch verification history');
      return res.json();
    },
    enabled: !!selectedUserId,
  });

  const handleViewHistory = (userId: string) => {
    setSelectedUserId(userId);
    setIsHistoryOpen(true);
  };

  const getVerificationBadge = (verified: boolean, type: 'cedula' | 'phone') => {
    if (verified) {
      return (
        <Badge variant="default" className="gap-1" data-testid={`badge-${type}-verified`}>
          <CheckCircle className="w-3 h-3" />
          Verificado
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1" data-testid={`badge-${type}-pending`}>
        <Clock className="w-3 h-3" />
        Pendiente
      </Badge>
    );
  };

  const getVerificationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cedula: 'Cédula',
      phone_otp: 'Teléfono (OTP)',
      email: 'Email',
    };
    return labels[type] || type;
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-verifications">
          Verificación de Identidad
        </h1>
        <p className="text-muted-foreground">
          Gestiona el estado de verificación de cédula y teléfono de los usuarios
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="p-6" data-testid="card-total-users">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Usuarios</p>
                <p className="text-3xl font-bold">{data?.stats.totalUsers || 0}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-fully-verified">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Verificados</p>
                <p className="text-3xl font-bold text-green-600">{data?.stats.fullyVerified || 0}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-pending-phone">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pendiente Teléfono</p>
                <p className="text-3xl font-bold text-yellow-600">{data?.stats.pendingPhone || 0}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Phone className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-pending-cedula">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pendiente Cédula</p>
                <p className="text-3xl font-bold text-orange-600">{data?.stats.pendingCedula || 0}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <IdCard className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            data-testid="filter-all"
          >
            Todos
          </Button>
          <Button
            variant={statusFilter === 'verified' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('verified')}
            data-testid="filter-verified"
          >
            Verificados
          </Button>
          <Button
            variant={statusFilter === 'pending-phone' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('pending-phone')}
            data-testid="filter-pending-phone"
          >
            Pendiente Teléfono
          </Button>
          <Button
            variant={statusFilter === 'pending-cedula' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('pending-cedula')}
            data-testid="filter-pending-cedula"
          >
            Pendiente Cédula
          </Button>
          <Button
            variant={statusFilter === 'unverified' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('unverified')}
            data-testid="filter-unverified"
          >
            Sin Verificar
          </Button>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.users.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state">
              <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay usuarios</h3>
              <p className="text-muted-foreground">
                No se encontraron usuarios con los filtros seleccionados
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <IdCard className="w-4 h-4" />
                      Cédula
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Phone className="w-4 h-4" />
                      Teléfono
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-medium">
                      {user.nombre} {user.apellido}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.userType}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {getVerificationBadge(user.cedulaVerificada, 'cedula')}
                      {user.cedula && (
                        <div className="text-xs text-muted-foreground mt-1">{user.cedula}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {getVerificationBadge(user.telefonoVerificado, 'phone')}
                      {user.telefono && (
                        <div className="text-xs text-muted-foreground mt-1">{user.telefono}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewHistory(user.id)}
                        data-testid={`button-view-history-${user.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Historial
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {!isLoading && data && data.users.length > 0 && totalPages > 1 && (
          <div className="mt-6">
            <Pagination data-testid="pagination-controls">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(page - 1)}
                    className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    data-testid="button-previous-page"
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= page - 1 && pageNum <= page + 1)
                  ) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => handlePageChange(pageNum)}
                          isActive={pageNum === page}
                          className="cursor-pointer"
                          data-testid={`button-page-${pageNum}`}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (pageNum === page - 2 || pageNum === page + 2) {
                    return (
                      <PaginationItem key={pageNum}>
                        <span className="px-4">...</span>
                      </PaginationItem>
                    );
                  }
                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(page + 1)}
                    className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    data-testid="button-next-page"
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            <div className="text-center mt-4 text-sm text-muted-foreground" data-testid="text-pagination-info">
              Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, data.total)} de {data.total} usuarios
            </div>
          </div>
        )}
      </Card>

      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" data-testid="sheet-history">
          <SheetHeader>
            <SheetTitle>Historial de Verificación</SheetTitle>
            <SheetDescription>
              Todos los intentos de verificación para este usuario
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {isHistoryLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : historyData?.length === 0 ? (
              <div className="text-center py-8" data-testid="empty-history">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay intentos de verificación registrados</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyData?.map((item) => (
                  <Card key={item.id} className="p-4" data-testid={`history-item-${item.id}`}>
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {item.success ? (
                          <div className="bg-green-100 p-2 rounded-full">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                        ) : (
                          <div className="bg-red-100 p-2 rounded-full">
                            <XCircle className="w-5 h-5 text-red-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">
                            {getVerificationTypeLabel(item.verificationType)}
                          </span>
                          <Badge variant={item.success ? 'default' : 'destructive'}>
                            {item.success ? 'Exitoso' : 'Fallido'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {format(new Date(item.createdAt), "PPpp", { locale: es })}
                        </p>
                        {item.errorMessage && (
                          <p className="text-sm text-red-600 mb-2">{item.errorMessage}</p>
                        )}
                        <div className="text-xs text-muted-foreground space-y-1">
                          {item.ipAddress && (
                            <div>
                              <span className="font-medium">IP:</span> {item.ipAddress}
                            </div>
                          )}
                          {item.userAgent && (
                            <div className="truncate">
                              <span className="font-medium">User Agent:</span> {item.userAgent}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
