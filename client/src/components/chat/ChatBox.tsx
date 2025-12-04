import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useWebSocket } from '@/lib/websocket';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Image as ImageIcon, Video, DollarSign, CheckCircle, XCircle, Info, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import type { MensajeChat, User } from '@shared/schema';

function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    console.log('Audio notification not available');
  }
}

function vibrate() {
  if ('vibrate' in navigator) {
    navigator.vibrate([100, 50, 100]);
  }
}

interface MensajeChatConRemitente extends MensajeChat {
  remitente?: User;
}

interface ChatBoxProps {
  servicioId: string;
  currentUserId: string;
  currentUserNombre: string;
  currentUserApellido: string;
  otherUserName?: string;
  userType: 'cliente' | 'conductor';
  showQuickMessages?: boolean;
}

const QUICK_MESSAGES_CLIENTE = [
  "¿Cuánto falta para que llegues?",
  "¿Dónde estás?",
  "Necesito más tiempo",
  "Gracias"
];

const QUICK_MESSAGES_CONDUCTOR = [
  "Voy en camino, llego en 5 minutos",
  "Estoy cerca",
  "He llegado al punto",
  "Necesito que salgas del vehículo",
  "Todo listo, nos vamos"
];

function sanitizeTestId(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!,]/g, '')
    .replace(/\s+/g, '-');
}

function formatAmount(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return 'RD$ 0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `RD$ ${num.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getMessageTypeIcon(tipo: string | null | undefined) {
  switch (tipo) {
    case 'imagen':
      return <ImageIcon className="h-4 w-4" />;
    case 'video':
      return <Video className="h-4 w-4" />;
    case 'monto_propuesto':
      return <DollarSign className="h-4 w-4" />;
    case 'monto_confirmado':
      return <CheckCircle className="h-4 w-4" />;
    case 'monto_aceptado':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'monto_rechazado':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'sistema':
      return <Info className="h-4 w-4" />;
    default:
      return null;
  }
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 py-2" data-testid="typing-indicator">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs text-muted-foreground">Escribiendo...</span>
    </div>
  );
}

interface MessageBubbleProps {
  msg: MensajeChatConRemitente;
  isOwn: boolean;
  getInitials: (nombre: string, apellido: string) => string;
}

function MessageBubble({ msg, isOwn, getInitials }: MessageBubbleProps) {
  const remitente = msg.remitente;
  const tipoMensaje = msg.tipoMensaje || 'texto';
  
  const isSystemMessage = tipoMensaje === 'sistema';
  const isAmountMessage = ['monto_propuesto', 'monto_confirmado', 'monto_aceptado', 'monto_rechazado'].includes(tipoMensaje);
  const isMediaMessage = ['imagen', 'video'].includes(tipoMensaje);

  if (isSystemMessage) {
    return (
      <div className="flex justify-center my-2" data-testid={`message-${msg.id}`}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full">
          <Info className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{msg.contenido}</span>
        </div>
      </div>
    );
  }

  if (isAmountMessage) {
    return (
      <div className="flex justify-center my-3" data-testid={`message-${msg.id}`}>
        <div className={`w-full max-w-[85%] rounded-lg border p-3 ${
          tipoMensaje === 'monto_aceptado' ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' :
          tipoMensaje === 'monto_rechazado' ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' :
          'bg-accent/10 border-accent/30'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {getMessageTypeIcon(tipoMensaje)}
            <span className="text-sm font-medium">
              {tipoMensaje === 'monto_propuesto' && 'Monto Propuesto'}
              {tipoMensaje === 'monto_confirmado' && 'Monto Confirmado'}
              {tipoMensaje === 'monto_aceptado' && 'Monto Aceptado'}
              {tipoMensaje === 'monto_rechazado' && 'Monto Rechazado'}
            </span>
          </div>
          {msg.montoAsociado && (
            <div className="text-xl font-bold text-center mb-2">
              {formatAmount(msg.montoAsociado)}
            </div>
          )}
          {msg.contenido && (
            <p className="text-sm text-muted-foreground">{msg.contenido}</p>
          )}
          <div className="text-xs text-muted-foreground mt-2 text-right">
            {format(new Date(msg.createdAt), 'HH:mm')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      data-testid={`message-${msg.id}`}
    >
      <Avatar className="w-8 h-8">
        <AvatarFallback className={isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
          {remitente 
            ? getInitials(remitente.nombre, remitente.apellido)
            : '?'}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col gap-1 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-lg px-3 py-2 ${
            isOwn
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}
        >
          {isMediaMessage && msg.urlArchivo && (
            <div className="mb-2">
              {tipoMensaje === 'imagen' ? (
                <img 
                  src={msg.urlArchivo} 
                  alt={msg.nombreArchivo || 'Imagen'} 
                  className="max-w-full rounded-md max-h-48 object-cover"
                  data-testid={`image-${msg.id}`}
                />
              ) : (
                <video 
                  src={msg.urlArchivo} 
                  controls 
                  className="max-w-full rounded-md max-h-48"
                  data-testid={`video-${msg.id}`}
                />
              )}
              {msg.nombreArchivo && (
                <span className="text-xs opacity-70 mt-1 block">{msg.nombreArchivo}</span>
              )}
            </div>
          )}
          {msg.contenido && (
            <p className="text-sm break-words">{msg.contenido}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {format(new Date(msg.createdAt), 'HH:mm')}
          </span>
          {isOwn && (
            <span className="text-muted-foreground">
              {msg.leido ? (
                <CheckCheck className="h-3 w-3 text-accent" data-testid={`read-indicator-${msg.id}`} />
              ) : (
                <Check className="h-3 w-3" data-testid={`sent-indicator-${msg.id}`} />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatBox({ 
  servicioId, 
  currentUserId, 
  currentUserNombre, 
  currentUserApellido,
  otherUserName = 'Operador',
  userType,
  showQuickMessages = true
}: ChatBoxProps) {
  const [mensaje, setMensaje] = useState('');
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTypingSentRef = useRef<number>(0);

  const { data: mensajes = [], isLoading } = useQuery<MensajeChatConRemitente[]>({
    queryKey: ['/api/chat', servicioId],
    refetchInterval: 5000,
  });

  const { send, connectionId, isConnected } = useWebSocket(
    (message) => {
      if (message.type === 'new_chat_message') {
        queryClient.invalidateQueries({ queryKey: ['/api/chat', servicioId] });
        setIsOtherTyping(false);
        
        if (message.payload?.remitenteId !== currentUserId) {
          playNotificationSound();
          vibrate();
        }
      }
      if (message.type === 'typing' && message.payload?.userId !== currentUserId) {
        setIsOtherTyping(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsOtherTyping(false);
        }, 3000);
      }
    }
  );

  useEffect(() => {
    if (connectionId > 0) {
      send({
        type: 'join_service',
        payload: { serviceId: servicioId }
      });
    }
  }, [connectionId, servicioId, send]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const sendTypingIndicator = () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2000 && isConnected) {
      send({
        type: 'typing',
        payload: { serviceId: servicioId, userId: currentUserId }
      });
      lastTypingSentRef.current = now;
    }
  };

  const sendMutation = useMutation({
    mutationFn: async (contenido: string) => {
      const response = await apiRequest('POST', '/api/chat/send', {
        servicioId,
        contenido,
      });
      return response.json() as Promise<MensajeChat>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', servicioId] });
      setMensaje('');
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/chat/${servicioId}/mark-read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', servicioId] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes, isOtherTyping]);

  useEffect(() => {
    if (mensajes.length > 0) {
      markReadMutation.mutate();
    }
  }, [mensajes.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim()) return;

    sendMutation.mutate(mensaje.trim());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMensaje(e.target.value);
    sendTypingIndicator();
  };

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  };

  const unreadCount = mensajes.filter(m => !m.leido && m.remitenteId !== currentUserId).length;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg">Chat con {otherUserName}</CardTitle>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs" data-testid="unread-badge">
              {unreadCount} nuevos
            </Badge>
          )}
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
               title={isConnected ? 'Conectado' : 'Desconectado'}
               data-testid="connection-indicator" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground" data-testid="loading-chat">
              Cargando mensajes...
            </div>
          ) : mensajes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground" data-testid="empty-chat">
              No hay mensajes aun. Inicia la conversacion!
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {mensajes.map((msg) => {
                const isOwn = msg.remitenteId === currentUserId;
                return (
                  <MessageBubble 
                    key={msg.id} 
                    msg={msg} 
                    isOwn={isOwn} 
                    getInitials={getInitials} 
                  />
                );
              })}
              {isOtherTyping && <TypingIndicator />}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="pt-3 flex flex-col gap-2">
        {showQuickMessages && (
          <div className="flex flex-wrap gap-2 w-full">
            {(userType === 'conductor' ? QUICK_MESSAGES_CONDUCTOR : QUICK_MESSAGES_CLIENTE).map((quickMsg) => (
              <Button
                key={quickMsg}
                variant="outline"
                size="sm"
                onClick={() => setMensaje(quickMsg)}
                disabled={sendMutation.isPending}
                data-testid={`button-quick-${sanitizeTestId(quickMsg)}`}
              >
                {quickMsg}
              </Button>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            value={mensaje}
            onChange={handleInputChange}
            placeholder="Escribe un mensaje..."
            disabled={sendMutation.isPending}
            data-testid="input-message"
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!mensaje.trim() || sendMutation.isPending}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
