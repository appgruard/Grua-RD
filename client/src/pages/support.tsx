import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient, getApiUrl } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  MessageCircle, 
  Plus, 
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
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TicketWithDetails, User } from '@shared/schema';

const ticketFormSchema = z.object({
  titulo: z.string().min(5, 'El titulo debe tener al menos 5 caracteres').max(200, 'El titulo no puede exceder 200 caracteres'),
  descripcion: z.string().min(10, 'La descripcion debe tener al menos 10 caracteres').max(2000, 'La descripcion no puede exceder 2000 caracteres'),
  categoria: z.enum(['problema_tecnico', 'consulta_servicio', 'queja', 'sugerencia', 'problema_pago', 'otro']),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).optional(),
  servicioRelacionadoId: z.string().optional(),
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

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

export default function SupportPage() {
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<TicketWithDetails | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery<TicketWithDetails[]>({
    queryKey: ['/api/tickets'],
  });

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      categoria: 'consulta_servicio',
      prioridad: 'media',
    },
  });

  const messageForm = useForm<MessageFormValues>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      mensaje: '',
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: TicketFormValues) => {
      const res = await apiRequest('POST', '/api/tickets', data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al crear ticket');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({
        title: 'Ticket creado',
        description: 'Tu solicitud de soporte ha sido enviada',
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
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
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
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

  const closeTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await apiRequest('PUT', `/api/tickets/${ticketId}/cerrar`, {});
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Error al cerrar ticket');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      setSelectedTicket(null);
      toast({
        title: 'Ticket cerrado',
        description: 'El ticket ha sido cerrado correctamente',
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
      const res = await fetch(getApiUrl(`/api/tickets/${ticketId}`), { credentials: 'include' });
      if (res.ok) {
        const ticket = await res.json();
        setSelectedTicket(ticket);
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
    }
  };

  const handleCreateTicket = (data: TicketFormValues) => {
    createTicketMutation.mutate(data);
  };

  const handleSendMessage = (data: MessageFormValues) => {
    if (selectedTicket) {
      sendMessageMutation.mutate({
        ticketId: selectedTicket.id,
        mensaje: data.mensaje,
      });
    }
  };

  const handleCloseTicket = () => {
    if (selectedTicket) {
      closeTicketMutation.mutate(selectedTicket.id);
    }
  };

  const handleSelectTicket = (ticket: TicketWithDetails) => {
    refetchTicketDetails(ticket.id);
  };

  if (selectedTicket) {
    return (
      <TicketDetailView
        ticket={selectedTicket}
        currentUser={user}
        onBack={() => setSelectedTicket(null)}
        onSendMessage={handleSendMessage}
        onCloseTicket={handleCloseTicket}
        messageForm={messageForm}
        isSendingMessage={sendMessageMutation.isPending}
        isClosingTicket={closeTicketMutation.isPending}
      />
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-support-title">Centro de Soporte</h1>
          <p className="text-muted-foreground">Gestiona tus solicitudes de ayuda</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-ticket">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Ticket</DialogTitle>
              <DialogDescription>
                Describe tu problema o consulta y te responderemos pronto
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateTicket)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="categoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-categoria">
                            <SelectValue placeholder="Selecciona una categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(categoriaLabels).map(([key, { label, icon: Icon }]) => (
                            <SelectItem key={key} value={key} data-testid={`select-item-${key}`}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="titulo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titulo</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Breve descripcion del problema" 
                          {...field} 
                          data-testid="input-titulo"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripcion</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe tu problema o consulta en detalle..."
                          className="min-h-[120px]"
                          {...field}
                          data-testid="textarea-descripcion"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prioridad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridad</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-prioridad">
                            <SelectValue placeholder="Selecciona prioridad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="baja">Baja</SelectItem>
                          <SelectItem value="media">Media</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" data-testid="button-cancel-ticket">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button 
                    type="submit" 
                    disabled={createTicketMutation.isPending}
                    data-testid="button-submit-ticket"
                  >
                    {createTicketMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      'Crear Ticket'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {ticketsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : tickets && tickets.length > 0 ? (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <TicketCard 
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
            <h3 className="text-lg font-semibold mb-2">No tienes tickets</h3>
            <p className="text-muted-foreground mb-4">
              Crea un nuevo ticket si necesitas ayuda
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-ticket">
              <Plus className="mr-2 h-4 w-4" />
              Crear primer ticket
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TicketCard({ ticket, onClick }: { ticket: TicketWithDetails; onClick: () => void }) {
  const estadoInfo = estadoConfig[ticket.estado] || estadoConfig.abierto;
  const categoriaInfo = categoriaLabels[ticket.categoria] || categoriaLabels.otro;
  const EstadoIcon = estadoInfo.icon;
  const CategoriaIcon = categoriaInfo.icon;

  return (
    <Card 
      className="hover-elevate cursor-pointer transition-all" 
      onClick={onClick}
      data-testid={`card-ticket-${ticket.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 bg-muted rounded-md shrink-0">
              <CategoriaIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold truncate" data-testid={`text-ticket-title-${ticket.id}`}>
                {ticket.titulo}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
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
                <span className="text-xs text-muted-foreground">
                  {format(new Date(ticket.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                </span>
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

interface TicketDetailViewProps {
  ticket: TicketWithDetails;
  currentUser?: User;
  onBack: () => void;
  onSendMessage: (data: MessageFormValues) => void;
  onCloseTicket: () => void;
  messageForm: ReturnType<typeof useForm<MessageFormValues>>;
  isSendingMessage: boolean;
  isClosingTicket: boolean;
}

function TicketDetailView({ 
  ticket, 
  currentUser, 
  onBack, 
  onSendMessage, 
  onCloseTicket,
  messageForm,
  isSendingMessage,
  isClosingTicket,
}: TicketDetailViewProps) {
  const estadoInfo = estadoConfig[ticket.estado] || estadoConfig.abierto;
  const categoriaInfo = categoriaLabels[ticket.categoria] || categoriaLabels.otro;
  const EstadoIcon = estadoInfo.icon;
  const CategoriaIcon = categoriaInfo.icon;
  const canRespond = ticket.estado !== 'cerrado';

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={onBack}
        data-testid="button-back-tickets"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a tickets
      </Button>

      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-muted rounded-md">
                <CategoriaIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle data-testid="text-ticket-detail-title">{ticket.titulo}</CardTitle>
                <CardDescription className="mt-1">
                  Ticket #{ticket.id.slice(0, 8)} - Creado el {format(new Date(ticket.createdAt), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className={estadoInfo.className}>
                <EstadoIcon className={`h-3 w-3 mr-1 ${ticket.estado === 'en_proceso' ? 'animate-spin' : ''}`} />
                {estadoInfo.label}
              </Badge>
              <Badge variant="outline" className={prioridadColors[ticket.prioridad]}>
                {ticket.prioridad.charAt(0).toUpperCase() + ticket.prioridad.slice(1)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{ticket.descripcion}</p>
          
          {ticket.asignadoAUsuario && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Asignado a: <span className="font-medium text-foreground">{ticket.asignadoAUsuario.nombre}</span>
              </p>
            </div>
          )}

          {canRespond && (
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                onClick={onCloseTicket}
                disabled={isClosingTicket}
                data-testid="button-close-ticket"
              >
                {isClosingTicket ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cerrando...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Cerrar Ticket
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conversacion</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
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
                <p className="text-sm text-muted-foreground">
                  Nuestro equipo revisara tu ticket pronto
                </p>
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
                            placeholder="Escribe tu mensaje..." 
                            {...field}
                            data-testid="input-message"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    disabled={isSendingMessage}
                    data-testid="button-send-message"
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

          {!canRespond && (
            <div className="mt-4 p-4 bg-muted rounded-lg text-center">
              <p className="text-muted-foreground">
                Este ticket esta cerrado y no acepta nuevos mensajes
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
