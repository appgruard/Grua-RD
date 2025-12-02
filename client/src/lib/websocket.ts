import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface WebSocketMessage {
  type: string;
  payload: any;
}

export function useWebSocket(
  onMessage?: (message: WebSocketMessage) => void,
  onOpen?: () => void
) {
  const { toast } = useToast();
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const messageQueue = useRef<WebSocketMessage[]>([]);
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const [connectionId, setConnectionId] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const hasShownDisconnectToast = useRef(false);
  const isIntentionalClose = useRef(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setConnectionId(prev => prev + 1);
      setIsConnected(true);
      
      if (reconnectAttempts.current > 0) {
        toast({
          title: "Conexión restablecida",
          description: "La conexión en tiempo real se ha restablecido correctamente.",
          variant: "default",
        });
        hasShownDisconnectToast.current = false;
      }
      reconnectAttempts.current = 0;
      
      while (messageQueue.current.length > 0) {
        const message = messageQueue.current.shift();
        if (message && ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify(message));
        }
      }
      
      onOpenRef.current?.();
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'ping') {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'pong' }));
          }
          return;
        }
        
        onMessageRef.current?.(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      
      if (isIntentionalClose.current) {
        console.log('WebSocket closed intentionally');
        return;
      }
      
      console.log('WebSocket disconnected, reconnecting...');
      
      if (!hasShownDisconnectToast.current) {
        toast({
          title: "Conexión perdida",
          description: "Intentando reconectar en tiempo real...",
          variant: "destructive",
        });
        hasShownDisconnectToast.current = true;
      }
      
      reconnectAttempts.current += 1;
      reconnectTimeout.current = setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      isIntentionalClose.current = true;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      messageQueue.current.push(message);
    }
  }, []);

  return { send, isConnected, connectionId };
}
