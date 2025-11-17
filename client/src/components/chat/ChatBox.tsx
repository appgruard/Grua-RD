import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useWebSocket } from '@/lib/websocket';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { format } from 'date-fns';
import type { MensajeChat, User } from '@shared/schema';

interface MensajeChatConRemitente extends MensajeChat {
  remitente?: User;
}

interface ChatBoxProps {
  servicioId: string;
  currentUserId: string;
  currentUserNombre: string;
  currentUserApellido: string;
  otherUserName?: string;
}

export function ChatBox({ 
  servicioId, 
  currentUserId, 
  currentUserNombre, 
  currentUserApellido,
  otherUserName = 'Conductor'
}: ChatBoxProps) {
  const [mensaje, setMensaje] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: mensajes = [], isLoading } = useQuery<MensajeChatConRemitente[]>({
    queryKey: ['/api/chat', servicioId],
    refetchInterval: 2000,
  });

  const sendMutation = useMutation({
    mutationFn: async (contenido: string) => {
      return apiRequest<MensajeChat>('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify({
          servicioId,
          contenido,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', servicioId] });
      setMensaje('');
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/chat/${servicioId}/mark-read`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', servicioId] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes]);

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

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Chat con {otherUserName}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground" data-testid="loading-chat">
              Cargando mensajes...
            </div>
          ) : mensajes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground" data-testid="empty-chat">
              No hay mensajes aún. ¡Inicia la conversación!
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {mensajes.map((msg) => {
                const isOwn = msg.remitenteId === currentUserId;
                const remitente = msg.remitente;

                return (
                  <div
                    key={msg.id}
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
                        <p className="text-sm break-words">{msg.contenido}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.createdAt), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="pt-3">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
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
