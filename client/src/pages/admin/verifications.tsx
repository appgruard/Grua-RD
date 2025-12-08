import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { 
  ShieldCheck, Phone, IdCard, Search, Eye, CheckCircle, XCircle, Clock, 
  UserCircle, Camera, Loader2, ImageIcon 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
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

interface PendingPhotoUser {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  cedula: string | null;
  phone: string | null;
  photoUrl: string | null;
  cedulaVerificada: boolean;
  telefonoVerificado: boolean;
  fotoVerificada: boolean;
  fotoVerificadaScore: string | null;
  createdAt: string;
}

interface PendingPhotoStats {
  totalPending: number;
  totalDrivers: number;
  totalWithPhoto: number;
  totalVerified: number;
}

interface PendingPhotoResponse {
  pendingPhotos: PendingPhotoUser[];
  stats: PendingPhotoStats;
}

interface PendingCedulaUser {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  cedula: string | null;
  cedulaImageUrl: string | null;
  phone: string | null;
  photoUrl: string | null;
  userType: string;
  cedulaVerificada: boolean;
  telefonoVerificado: boolean;
  createdAt: string;
}

interface PendingCedulaStats {
  totalPending: number;
  totalDrivers: number;
  totalClients: number;
  totalVerified: number;
}

interface PendingCedulaResponse {
  pendingCedulas: PendingCedulaUser[];
  stats: PendingCedulaStats;
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
  const [activeTab, setActiveTab] = useState('identity');
  const [selectedPhotoUser, setSelectedPhotoUser] = useState<PendingPhotoUser | null>(null);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedCedulaUser, setSelectedCedulaUser] = useState<PendingCedulaUser | null>(null);
  const [isCedulaDialogOpen, setIsCedulaDialogOpen] = useState(false);
  const [isCedulaRejectDialogOpen, setIsCedulaRejectDialogOpen] = useState(false);
  const [cedulaRejectReason, setCedulaRejectReason] = useState('');
  const [cedulaInput, setCedulaInput] = useState('');

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

  const { data: pendingPhotosData, isLoading: isPendingPhotosLoading } = useQuery<PendingPhotoResponse>({
    queryKey: ['/api/admin/pending-photo-verifications'],
    queryFn: async () => {
      const res = await fetch('/api/admin/pending-photo-verifications', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch pending photos');
      return res.json();
    },
  });

  const { data: pendingCedulasData, isLoading: isPendingCedulasLoading } = useQuery<PendingCedulaResponse>({
    queryKey: ['/api/admin/pending-cedula-verifications'],
    queryFn: async () => {
      const res = await fetch('/api/admin/pending-cedula-verifications', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch pending cédulas');
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

  const approvePhotoMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/approve-photo`, {});
      if (!res.ok) throw new Error('Failed to approve photo');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Foto aprobada', description: 'La foto de perfil ha sido aprobada exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-photo-verifications'] });
      setIsPhotoDialogOpen(false);
      setSelectedPhotoUser(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const rejectPhotoMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason: string }) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/reject-photo`, { reason });
      if (!res.ok) throw new Error('Failed to reject photo');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Foto rechazada', description: 'El usuario deberá subir una nueva foto' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-photo-verifications'] });
      setIsRejectDialogOpen(false);
      setIsPhotoDialogOpen(false);
      setSelectedPhotoUser(null);
      setRejectReason('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const approveCedulaMutation = useMutation({
    mutationFn: async ({ userId, cedula }: { userId: string; cedula?: string }) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/approve-cedula`, { cedula });
      if (!res.ok) throw new Error('Failed to approve cédula');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Cédula aprobada', description: 'La cédula ha sido verificada manualmente' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-cedula-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/verification-status'] });
      setIsCedulaDialogOpen(false);
      setSelectedCedulaUser(null);
      setCedulaInput('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const rejectCedulaMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/reject-cedula`, { reason });
      if (!res.ok) throw new Error('Failed to reject cédula');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Cédula rechazada', description: 'El usuario deberá verificar su cédula nuevamente' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-cedula-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/verification-status'] });
      setIsCedulaRejectDialogOpen(false);
      setIsCedulaDialogOpen(false);
      setSelectedCedulaUser(null);
      setCedulaRejectReason('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleViewHistory = (userId: string) => {
    setSelectedUserId(userId);
    setIsHistoryOpen(true);
  };

  const handleViewPhoto = (user: PendingPhotoUser) => {
    setSelectedPhotoUser(user);
    setIsPhotoDialogOpen(true);
  };

  const handleApprovePhoto = () => {
    if (selectedPhotoUser) {
      approvePhotoMutation.mutate(selectedPhotoUser.id);
    }
  };

  const handleRejectPhoto = () => {
    if (selectedPhotoUser) {
      rejectPhotoMutation.mutate({ userId: selectedPhotoUser.id, reason: rejectReason });
    }
  };

  const handleViewCedula = (user: PendingCedulaUser) => {
    setSelectedCedulaUser(user);
    setCedulaInput(user.cedula || '');
    setIsCedulaDialogOpen(true);
  };

  const handleApproveCedula = () => {
    if (selectedCedulaUser) {
      approveCedulaMutation.mutate({ userId: selectedCedulaUser.id, cedula: cedulaInput || undefined });
    }
  };

  const handleRejectCedula = () => {
    if (selectedCedulaUser) {
      rejectCedulaMutation.mutate({ userId: selectedCedulaUser.id, reason: cedulaRejectReason });
    }
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
          Gestiona el estado de verificación de cédula, teléfono y fotos de perfil de los usuarios
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <Card className="p-6" data-testid="card-total-users">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Usuarios</p>
                <p className="text-3xl font-bold">{data?.stats.totalUsers || 0}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg flex-shrink-0">
                <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-fully-verified">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Verificados</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{data?.stats.fullyVerified || 0}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-pending-phone">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pendiente Teléfono</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{data?.stats.pendingPhone || 0}</p>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg flex-shrink-0">
                <Phone className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-pending-cedula">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pendiente Cédula</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{data?.stats.pendingCedula || 0}</p>
              </div>
              <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg flex-shrink-0">
                <IdCard className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-pending-photos">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Fotos Pendientes</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {pendingPhotosData?.stats.totalPending || 0}
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg flex-shrink-0">
                <Camera className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList data-testid="tabs-verification">
          <TabsTrigger value="identity" data-testid="tab-identity">
            <IdCard className="w-4 h-4 mr-2" />
            Verificación de Identidad
          </TabsTrigger>
          <TabsTrigger value="photos" data-testid="tab-photos">
            <Camera className="w-4 h-4 mr-2" />
            Fotos de Perfil
            {pendingPhotosData?.stats.totalPending ? (
              <Badge variant="destructive" className="ml-2">
                {pendingPhotosData.stats.totalPending}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="cedulas" data-testid="tab-cedulas">
            <IdCard className="w-4 h-4 mr-2" />
            Cédulas Pendientes
            {pendingCedulasData?.stats.totalPending ? (
              <Badge variant="destructive" className="ml-2">
                {pendingCedulasData.stats.totalPending}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identity">
          <Card className="p-6">
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
        </TabsContent>

        <TabsContent value="photos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Fotos de Perfil Pendientes de Revisión
              </CardTitle>
              <CardDescription>
                Conductores que han subido una foto pero requiere revisión manual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPendingPhotosLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-16 h-16 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : pendingPhotosData?.pendingPhotos.length === 0 ? (
                <div className="text-center py-12" data-testid="empty-photos-state">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Todo al día</h3>
                  <p className="text-muted-foreground">
                    No hay fotos de perfil pendientes de revisión
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingPhotosData?.pendingPhotos.map((user) => (
                    <Card 
                      key={user.id} 
                      className="p-4 hover-elevate cursor-pointer transition-all"
                      onClick={() => handleViewPhoto(user)}
                      data-testid={`card-pending-photo-${user.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16 border-2 border-muted">
                          <AvatarImage src={user.photoUrl || ''} alt={`${user.nombre} ${user.apellido}`} />
                          <AvatarFallback className="text-lg">
                            {user.nombre?.[0]}{user.apellido?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{user.nombre} {user.apellido}</h4>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {user.cedulaVerificada ? 'Cédula' : 'Sin Cédula'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {user.telefonoVerificado ? 'Teléfono' : 'Sin Teléfono'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="w-3 h-3" />
                          Pendiente revisión
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {pendingPhotosData && pendingPhotosData.stats.totalPending > 0 && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Estadísticas de Fotos</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Conductores</p>
                      <p className="font-semibold">{pendingPhotosData.stats.totalDrivers}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Con Foto</p>
                      <p className="font-semibold">{pendingPhotosData.stats.totalWithPhoto}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fotos Verificadas</p>
                      <p className="font-semibold text-green-600 dark:text-green-400">{pendingPhotosData.stats.totalVerified}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pendientes</p>
                      <p className="font-semibold text-orange-600 dark:text-orange-400">{pendingPhotosData.stats.totalPending}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cedulas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IdCard className="w-5 h-5" />
                Cédulas Pendientes de Verificación Manual
              </CardTitle>
              <CardDescription>
                Usuarios que requieren verificación manual de su cédula
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPendingCedulasLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : pendingCedulasData?.pendingCedulas.length === 0 ? (
                <div className="text-center py-12" data-testid="empty-cedulas-state">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Todo al día</h3>
                  <p className="text-muted-foreground">
                    No hay cédulas pendientes de verificación manual
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingCedulasData?.pendingCedulas.map((user) => (
                    <Card 
                      key={user.id} 
                      className="p-4 hover-elevate cursor-pointer transition-all"
                      onClick={() => handleViewCedula(user)}
                      data-testid={`card-pending-cedula-${user.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12 border-2 border-muted">
                          <AvatarImage src={user.photoUrl || ''} alt={`${user.nombre} ${user.apellido}`} />
                          <AvatarFallback className="text-sm">
                            {user.nombre?.[0]}{user.apellido?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{user.nombre} {user.apellido}</h4>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {user.userType}
                            </Badge>
                            {user.cedula && (
                              <span className="text-xs text-muted-foreground">{user.cedula}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="w-3 h-3" />
                          Pendiente verificación
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {pendingCedulasData && pendingCedulasData.stats.totalPending > 0 && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Estadísticas de Cédulas</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Conductores</p>
                      <p className="font-semibold">{pendingCedulasData.stats.totalDrivers}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Clientes</p>
                      <p className="font-semibold">{pendingCedulasData.stats.totalClients}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cédulas Verificadas</p>
                      <p className="font-semibold text-green-600 dark:text-green-400">{pendingCedulasData.stats.totalVerified}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pendientes</p>
                      <p className="font-semibold text-orange-600 dark:text-orange-400">{pendingCedulasData.stats.totalPending}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Revisar Foto de Perfil</DialogTitle>
            <DialogDescription>
              Verifica que la foto muestre claramente el rostro del conductor
            </DialogDescription>
          </DialogHeader>
          
          {selectedPhotoUser && (
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <div className="w-48 h-48 rounded-lg overflow-hidden bg-muted mb-4">
                  {selectedPhotoUser.photoUrl ? (
                    <img 
                      src={selectedPhotoUser.photoUrl} 
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-lg">{selectedPhotoUser.nombre} {selectedPhotoUser.apellido}</h3>
                <p className="text-sm text-muted-foreground">{selectedPhotoUser.email}</p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cédula</p>
                  <p className="font-medium">{selectedPhotoUser.cedula || 'No disponible'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{selectedPhotoUser.phone || 'No disponible'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cédula Verificada</p>
                  <Badge variant={selectedPhotoUser.cedulaVerificada ? "default" : "secondary"}>
                    {selectedPhotoUser.cedulaVerificada ? 'Sí' : 'No'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Teléfono Verificado</p>
                  <Badge variant={selectedPhotoUser.telefonoVerificado ? "default" : "secondary"}>
                    {selectedPhotoUser.telefonoVerificado ? 'Sí' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(true);
              }}
              disabled={rejectPhotoMutation.isPending}
              className="gap-2"
              data-testid="button-reject-photo"
            >
              <XCircle className="w-4 h-4" />
              Rechazar
            </Button>
            <Button
              onClick={handleApprovePhoto}
              disabled={approvePhotoMutation.isPending}
              className="gap-2"
              data-testid="button-approve-photo"
            >
              {approvePhotoMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Aprobar Foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar Foto</DialogTitle>
            <DialogDescription>
              Proporciona una razón para rechazar la foto. El usuario deberá subir una nueva.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              placeholder="Razón del rechazo (opcional)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px]"
              data-testid="input-reject-reason"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={rejectPhotoMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectPhoto}
              disabled={rejectPhotoMutation.isPending}
              className="gap-2"
              data-testid="button-confirm-reject"
            >
              {rejectPhotoMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCedulaDialogOpen} onOpenChange={setIsCedulaDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verificar Cédula Manualmente</DialogTitle>
            <DialogDescription>
              Revisa la imagen de la cédula y confirma el número para verificar al usuario
            </DialogDescription>
          </DialogHeader>
          
          {selectedCedulaUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-muted">
                  <AvatarImage src={selectedCedulaUser.photoUrl || ''} alt={`${selectedCedulaUser.nombre} ${selectedCedulaUser.apellido}`} />
                  <AvatarFallback className="text-lg">
                    {selectedCedulaUser.nombre?.[0]}{selectedCedulaUser.apellido?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedCedulaUser.nombre} {selectedCedulaUser.apellido}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCedulaUser.email}</p>
                  <Badge variant="outline" className="mt-1">{selectedCedulaUser.userType}</Badge>
                </div>
              </div>

              <Separator />

              {selectedCedulaUser.cedulaImageUrl ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Imagen de Cédula
                  </label>
                  <div className="border rounded-lg overflow-hidden bg-muted/30">
                    <img 
                      src={`/api/documents/view/${encodeURIComponent(selectedCedulaUser.cedulaImageUrl)}`}
                      alt="Cédula del usuario"
                      className="w-full max-h-[400px] object-contain"
                      data-testid="img-cedula-preview"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 border rounded-lg bg-muted/30">
                  <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No hay imagen de cédula disponible</p>
                  <p className="text-xs text-muted-foreground mt-1">El usuario no ha subido una imagen de su cédula</p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{selectedCedulaUser.phone || 'No disponible'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Teléfono Verificado</p>
                  <Badge variant={selectedCedulaUser.telefonoVerificado ? "default" : "secondary"}>
                    {selectedCedulaUser.telefonoVerificado ? 'Sí' : 'No'}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <label className="text-sm font-medium">Número de Cédula</label>
                <Input
                  value={cedulaInput}
                  onChange={(e) => setCedulaInput(e.target.value)}
                  placeholder="Ingresa el número de cédula..."
                  data-testid="input-cedula-number"
                />
                <p className="text-xs text-muted-foreground">
                  {selectedCedulaUser.cedula 
                    ? "Número detectado automáticamente. Puedes modificarlo si es incorrecto."
                    : "Ingresa el número de cédula que aparece en la imagen"}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsCedulaRejectDialogOpen(true);
              }}
              disabled={rejectCedulaMutation.isPending}
              className="gap-2"
              data-testid="button-reject-cedula"
            >
              <XCircle className="w-4 h-4" />
              Rechazar
            </Button>
            <Button
              onClick={handleApproveCedula}
              disabled={approveCedulaMutation.isPending || !cedulaInput.trim()}
              className="gap-2"
              data-testid="button-approve-cedula"
            >
              {approveCedulaMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Aprobar Cédula
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCedulaRejectDialogOpen} onOpenChange={setIsCedulaRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar Cédula</DialogTitle>
            <DialogDescription>
              Proporciona una razón para rechazar la verificación. El usuario deberá verificar su cédula nuevamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              placeholder="Razón del rechazo (opcional)..."
              value={cedulaRejectReason}
              onChange={(e) => setCedulaRejectReason(e.target.value)}
              className="min-h-[100px]"
              data-testid="input-cedula-reject-reason"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsCedulaRejectDialogOpen(false)}
              disabled={rejectCedulaMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectCedula}
              disabled={rejectCedulaMutation.isPending}
              className="gap-2"
              data-testid="button-confirm-cedula-reject"
            >
              {rejectCedulaMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                          <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                        ) : (
                          <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
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
                          <p className="text-sm text-red-600 dark:text-red-400 mb-2">{item.errorMessage}</p>
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
