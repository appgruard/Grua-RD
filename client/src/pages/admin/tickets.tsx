import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  Send, 
  Loader2,
  HelpCircle,
  FileQuestion,
  ThumbsDown,
  Lightbulb,
  CreditCard,
  MoreHorizontal,
  XCircle,
  User,
  Filter,
  Inbox,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TicketWithDetails, User as UserType } from '@shared/schema';

const messageFormSchema = z.object({
  mensaje: z.string().min(1, 'El mensaje no puede estar vacio').max(2000, 'El mensaje no puede exceder 2000 caracteres'),
});

type MessageFormValues = z.infer<typeof messageFormSchema>;

const categoriaLabels: Record<string, { label: string; icon: typeof HelpCircle }> = {
  problema_tecnico: { label: 'Problema Tecnico', icon: AlertCircle },
  consulta_servicio: { label: 'Consulta de Servicio', icon: FileQuestion },
  queja: { label: 'Queja', icon: ThumbsDown },
  sugerencia: { label: 'Sugerencia', icon: Lightbulb },
  problema_pago: { label: 'Problema de Pago', icon: CreditCard },
  otro: { label: 'Otro', icon: MoreHorizontal },
};

const prioridadColors: Record<string, string> = {
  baja: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  media: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  alta: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  urgente: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const estadoConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  abierto: { label: 'Abierto', icon: Clock, className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  en_proceso: { label: 'En Proceso', icon: Loader2, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  resuelto: { label: 'Resuelto', icon: CheckCircle, className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  cerrado: { label: 'Cerrado', icon: XCircle, className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
};

interface TicketStats {
  totalTickets: number;
  abiertos: number;
  enProceso: number;
  resueltos: number;
  cerrados: number;
  urgentes: number;
  sinAsignar: number;
}

export default function AdminTickets() {
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<TicketWithDetails | null>(null);
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [prioridadFilter, setPrioridadFilter] = useState<string>('all');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');

  const { data: currentUser } = useQuery<UserType>({
    queryKey: ['/api/auth/me'],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<TicketStats>({
    queryKey: ['/api/admin/tickets/stats'],
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery<TicketWithDetails[]>({
    queryKey: ['/api/admin/tickets'],
  });

  const { data: myTickets } = useQuery<TicketWithDetails[]>({
    queryKey: ['/api/admin/tickets/mis-asignados'],
  });

  const messageForm = useForm<MessageFormValues>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      mensaje: '',
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ ticketId, mensaje }: { ticketId: string; mensaje: string }) => {
      const res = await apiRequest('POST', `/api/tickets/${ticketId}/mensaje`, { mensaje });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al enviar mensaje');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tickets/mis-asignados'] });
      if (selectedTicket) {
        refetchTicketDetails(selectedTicket.id);
      }
      messageForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const assignTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await apiRequest('PUT', `/api/admin/tickets/${ticketId}/asignar`, {});
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al asignar ticket');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tickets/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tickets/mis-asignados'] });
      toast({
        title: 'Ticket asignado',
        description: 'El ticket ha sido asignado a ti',
      });
      if (selectedTicket) {
        refetchTicketDetails(selectedTicket.id);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: async ({ ticketId, estado }: { ticketId: string; estado: string }) => {
      const res = await apiRequest('PUT', `/api/admin/tickets/${ticketId}/estado`, { estado });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al cambiar estado');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tickets/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tickets/mis-asignados'] });
      if (selectedTicket) {
        refetchTicketDetails(selectedTicket.id);
      }
      toast({
        title: 'Estado actualizado',
        description: 'El estado del ticket ha sido actualizado',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const changePriorityMutation = useMutation({
    mutationFn: async ({ ticketId, prioridad }: { ticketId: string; prioridad: string }) => {
      const res = await apiRequest('PUT', `/api/admin/tickets/${ticketId}/prioridad`, { prioridad });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al cambiar prioridad');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tickets/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tickets/mis-asignados'] });
      if (selectedTicket) {
        refetchTicketDetails(selectedTicket.id);
      }
      toast({
        title: 'Prioridad actualizada',
        description: 'La prioridad del ticket ha sido actualizada',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const refetchTicketDetails = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, { credentials: 'include' });
      if (res.ok) {
        const ticket = await res.json();
        setSelectedTicket(ticket);
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
    }
  };

  const handleSendMessage = (data: MessageFormValues) => {
    if (selectedTicket) {
      sendMessageMutation.mutate({
        ticketId: selectedTicket.id,
        mensaje: data.mensaje,
      });
    }
  };

  const handleAssignTicket = () => {
    if (selectedTicket) {
      assignTicketMutation.mutate(selectedTicket.id);
    }
  };

  const handleChangeStatus = (estado: string) => {
    if (selectedTicket) {
      changeStatusMutation.mutate({ ticketId: selectedTicket.id, estado });
    }
  };

  const handleChangePriority = (prioridad: string) => {
    if (selectedTicket) {
      changePriorityMutation.mutate({ ticketId: selectedTicket.id, prioridad });
    }
  };

  const handleSelectTicket = (ticket: TicketWithDetails) => {
    refetchTicketDetails(ticket.id);
  };

  const filteredTickets = tickets?.filter(ticket => {
    if (estadoFilter !== 'all' && ticket.estado !== estadoFilter) return false;
    if (prioridadFilter !== 'all' && ticket.prioridad !== prioridadFilter) return false;
    if (categoriaFilter !== 'all' && ticket.categoria !== categoriaFilter) return false;
    return true;
  });

  if (selectedTicket) {
    return (
      <AdminTicketDetailView
        ticket={selectedTicket}
        currentUser={currentUser}
        onBack={() => setSelectedTicket(null)}
        onSendMessage={handleSendMessage}
        onAssign={handleAssignTicket}
        onChangeStatus={handleChangeStatus}
        onChangePriority={handleChangePriority}
        messageForm={messageForm}
        isSendingMessage={sendMessageMutation.isPending}
        isAssigning={assignTicketMutation.isPending}
        isChangingStatus={changeStatusMutation.isPending}
        isChangingPriority={changePriorityMutation.isPending}
      />
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-admin-tickets-title">Gestion de Tickets</h1>
        <p className="text-muted-foreground">Administra las solicitudes de soporte</p>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          {[...Array(7)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <StatCard 
            title="Total" 
            value={stats.totalTickets} 
            icon={Inbox}
            data-testid="stat-total"
          />
          <StatCard 
            title="Abiertos" 
            value={stats.abiertos} 
            icon={Clock}
            className="text-blue-600"
            data-testid="stat-abiertos"
          />
          <StatCard 
            title="En Proceso" 
            value={stats.enProceso} 
            icon={Loader2}
            className="text-yellow-600"
            data-testid="stat-en-proceso"
          />
          <StatCard 
            title="Resueltos" 
            value={stats.resueltos} 
            icon={CheckCircle}
            className="text-green-600"
            data-testid="stat-resueltos"
          />
          <StatCard 
            title="Cerrados" 
            value={stats.cerrados} 
            icon={XCircle}
            className="text-gray-600"
            data-testid="stat-cerrados"
          />
          <StatCard 
            title="Urgentes" 
            value={stats.urgentes} 
            icon={AlertTriangle}
            className="text-red-600"
            data-testid="stat-urgentes"
          />
          <StatCard 
            title="Sin Asignar" 
            value={stats.sinAsignar} 
            icon={User}
            className="text-orange-600"
            data-testid="stat-sin-asignar"
          />
        </div>
      )}

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">
            <Inbox className="mr-2 h-4 w-4" />
            Todos
          </TabsTrigger>
          <TabsTrigger value="mine" data-testid="tab-mine">
            <UserCheck className="mr-2 h-4 w-4" />
            Mis Asignados
            {myTickets && myTickets.length > 0 && (
              <Badge variant="secondary" className="ml-2">{myTickets.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filtros:</span>
                </div>
                <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="filter-estado">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="abierto">Abierto</SelectItem>
                    <SelectItem value="en_proceso">En Proceso</SelectItem>
                    <SelectItem value="resuelto">Resuelto</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={prioridadFilter} onValueChange={setPrioridadFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="filter-prioridad">
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="filter-categoria">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(categoriaLabels).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(estadoFilter !== 'all' || prioridadFilter !== 'all' || categoriaFilter !== 'all') && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setEstadoFilter('all');
                      setPrioridadFilter('all');
                      setCategoriaFilter('all');
                    }}
                    data-testid="button-clear-filters"
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {ticketsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTickets && filteredTickets.length > 0 ? (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <AdminTicketCard 
                  key={ticket.id} 
                  ticket={ticket} 
                  onClick={() => handleSelectTicket(ticket)} 
                />
              ))}
            </div>
          ) : (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay tickets</h3>
                <p className="text-muted-foreground">
                  {estadoFilter !== 'all' || prioridadFilter !== 'all' || categoriaFilter !== 'all' 
                    ? 'No hay tickets que coincidan con los filtros seleccionados'
                    : 'No hay tickets en el sistema'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="mine" className="space-y-4">
          {myTickets && myTickets.length > 0 ? (
            <div className="space-y-4">
              {myTickets.map((ticket) => (
                <AdminTicketCard 
                  key={ticket.id} 
                  ticket={ticket} 
                  onClick={() => handleSelectTicket(ticket)} 
                />
              ))}
            </div>
          ) : (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sin tickets asignados</h3>
                <p className="text-muted-foreground">
                  No tienes tickets asignados actualmente
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  className = '',
  ...props
}: { 
  title: string; 
  value: number; 
  icon: typeof Inbox;
  className?: string;
  'data-testid'?: string;
}) {
  return (
    <Card {...props}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${className}`} />
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminTicketCard({ ticket, onClick }: { ticket: TicketWithDetails; onClick: () => void }) {
  const estadoInfo = estadoConfig[ticket.estado] || estadoConfig.abierto;
  const categoriaInfo = categoriaLabels[ticket.categoria] || categoriaLabels.otro;
  const EstadoIcon = estadoInfo.icon;
  const CategoriaIcon = categoriaInfo.icon;

  return (
    <Card 
      className="hover-elevate cursor-pointer transition-all" 
      onClick={onClick}
      data-testid={`admin-card-ticket-${ticket.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 bg-muted rounded-md shrink-0">
              <CategoriaIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{ticket.titulo}</h3>
                {!ticket.asignadoA && (
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                    Sin asignar
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {ticket.descripcion}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className={estadoInfo.className}>
                  <EstadoIcon className={`h-3 w-3 mr-1 ${ticket.estado === 'en_proceso' ? 'animate-spin' : ''}`} />
                  {estadoInfo.label}
                </Badge>
                <Badge variant="outline" className={prioridadColors[ticket.prioridad]}>
                  {ticket.prioridad.charAt(0).toUpperCase() + ticket.prioridad.slice(1)}
                </Badge>
                <Badge variant="secondary">
                  {categoriaInfo.label}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {ticket.usuario?.nombre || 'Usuario'}
                </span>
                <span>
                  {format(new Date(ticket.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                </span>
                {ticket.asignadoAUsuario && (
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    {ticket.asignadoAUsuario.nombre}
                  </span>
                )}
              </div>
            </div>
          </div>
          {ticket.mensajeCount && ticket.mensajeCount > 0 && (
            <Badge variant="secondary" className="shrink-0">
              <MessageCircle className="h-3 w-3 mr-1" />
              {ticket.mensajeCount}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AdminTicketDetailViewProps {
  ticket: TicketWithDetails;
  currentUser?: UserType;
  onBack: () => void;
  onSendMessage: (data: MessageFormValues) => void;
  onAssign: () => void;
  onChangeStatus: (estado: string) => void;
  onChangePriority: (prioridad: string) => void;
  messageForm: ReturnType<typeof useForm<MessageFormValues>>;
  isSendingMessage: boolean;
  isAssigning: boolean;
  isChangingStatus: boolean;
  isChangingPriority: boolean;
}

function AdminTicketDetailView({ 
  ticket, 
  currentUser, 
  onBack, 
  onSendMessage, 
  onAssign,
  onChangeStatus,
  onChangePriority,
  messageForm,
  isSendingMessage,
  isAssigning,
  isChangingStatus,
  isChangingPriority,
}: AdminTicketDetailViewProps) {
  const estadoInfo = estadoConfig[ticket.estado] || estadoConfig.abierto;
  const categoriaInfo = categoriaLabels[ticket.categoria] || categoriaLabels.otro;
  const CategoriaIcon = categoriaInfo.icon;
  const canRespond = ticket.estado !== 'cerrado';
  const isAssignedToMe = ticket.asignadoA === currentUser?.id;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={onBack}
        data-testid="button-back-admin-tickets"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a tickets
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-md">
                  <CategoriaIcon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle data-testid="text-admin-ticket-title">{ticket.titulo}</CardTitle>
                  <CardDescription className="mt-1">
                    Ticket #{ticket.id.slice(0, 8)} - Creado el {format(new Date(ticket.createdAt), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap mb-4">{ticket.descripcion}</p>
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Creado por: <span className="font-medium text-foreground">{ticket.usuario?.nombre || 'Usuario'}</span>
                  {ticket.usuario?.email && (
                    <span className="ml-2 text-xs">({ticket.usuario.email})</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversacion</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px] pr-4">
                {ticket.mensajes && ticket.mensajes.length > 0 ? (
                  <div className="space-y-4">
                    {ticket.mensajes.map((mensaje) => {
                      const isCurrentUser = mensaje.usuarioId === currentUser?.id;
                      return (
                        <div 
                          key={mensaje.id}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex items-start gap-2 max-w-[80%] ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className={mensaje.esStaff ? 'bg-primary text-primary-foreground' : ''}>
                                {mensaje.usuario?.nombre?.charAt(0) || (mensaje.esStaff ? 'S' : 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`rounded-lg p-3 ${
                              isCurrentUser 
                                ? 'bg-primary text-primary-foreground' 
                                : mensaje.esStaff 
                                  ? 'bg-blue-100 dark:bg-blue-900' 
                                  : 'bg-muted'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-medium ${isCurrentUser ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                  {mensaje.usuario?.nombre || (mensaje.esStaff ? 'Soporte' : 'Usuario')}
                                  {mensaje.esStaff && <Badge variant="secondary" className="ml-1 text-[10px] py-0">Staff</Badge>}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{mensaje.mensaje}</p>
                              <span className={`text-[10px] ${isCurrentUser ? 'text-primary-foreground/60' : 'text-muted-foreground'} mt-1 block`}>
                                {format(new Date(mensaje.createdAt), "HH:mm", { locale: es })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageCircle className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No hay mensajes aun</p>
                  </div>
                )}
              </ScrollArea>

              {canRespond && (
                <>
                  <Separator className="my-4" />
                  <Form {...messageForm}>
                    <form onSubmit={messageForm.handleSubmit(onSendMessage)} className="flex gap-2">
                      <FormField
                        control={messageForm.control}
                        name="mensaje"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input 
                                placeholder="Escribe tu respuesta..." 
                                {...field}
                                data-testid="input-admin-message"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        disabled={isSendingMessage}
                        data-testid="button-send-admin-message"
                      >
                        {isSendingMessage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </form>
                  </Form>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado del Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Estado</label>
                <Select 
                  value={ticket.estado} 
                  onValueChange={onChangeStatus}
                  disabled={isChangingStatus}
                >
                  <SelectTrigger data-testid="select-admin-estado">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abierto">Abierto</SelectItem>
                    <SelectItem value="en_proceso">En Proceso</SelectItem>
                    <SelectItem value="resuelto">Resuelto</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Prioridad</label>
                <Select 
                  value={ticket.prioridad} 
                  onValueChange={onChangePriority}
                  disabled={isChangingPriority}
                >
                  <SelectTrigger data-testid="select-admin-prioridad">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium mb-2 block">Asignacion</label>
                {ticket.asignadoAUsuario ? (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {ticket.asignadoAUsuario.nombre?.charAt(0) || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{ticket.asignadoAUsuario.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {isAssignedToMe ? 'Asignado a ti' : 'Admin asignado'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={onAssign}
                    disabled={isAssigning}
                    data-testid="button-assign-to-me"
                  >
                    {isAssigning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Asignando...
                      </>
                    ) : (
                      <>
                        <UserCheck className="mr-2 h-4 w-4" />
                        Asignarme este ticket
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informacion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categoria</span>
                <Badge variant="secondary">{categoriaInfo.label}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creado</span>
                <span>{format(new Date(ticket.createdAt), "d MMM yyyy", { locale: es })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actualizado</span>
                <span>{format(new Date(ticket.updatedAt), "d MMM yyyy", { locale: es })}</span>
              </div>
              {ticket.resueltoAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resuelto</span>
                  <span>{format(new Date(ticket.resueltoAt), "d MMM yyyy", { locale: es })}</span>
                </div>
              )}
              {ticket.cerradoAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cerrado</span>
                  <span>{format(new Date(ticket.cerradoAt), "d MMM yyyy", { locale: es })}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mensajes</span>
                <span>{ticket.mensajes?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
