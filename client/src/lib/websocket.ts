import { useEffect, useRef, useCallback, useState } from 'react';

export interface WebSocketMessage {
  type: string;
  payload: any;
}

export function useWebSocket(
  onMessage?: (message: WebSocketMessage) => void,
  onOpen?: () => void
) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const messageQueue = useRef<WebSocketMessage[]>([]);
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const [connectionId, setConnectionId] = useState(0);

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
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      reconnectTimeout.current = setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
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

  return { send, isConnected: ws.current?.readyState === WebSocket.OPEN, connectionId };
}
