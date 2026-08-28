import { useEffect, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

const WS_URL = (process.env.EXPO_PUBLIC_BACKEND_URL ?? '')
  .replace(/\/+$/, '')
  .replace(/^http/, 'ws');

type EventHandler = (data: unknown) => void;

interface Subscription { resource: string; id: string; handler: EventHandler }

let socket: WebSocket | null = null;
let subscriptions: Subscription[] = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
let isConnecting = false;

function clearTimer() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

async function connect() {
  if (isConnecting || socket?.readyState === WebSocket.OPEN) return;
  isConnecting = true;
  const token = await SecureStore.getItemAsync('jwt');
  if (!token) { isConnecting = false; return; }

  socket = new WebSocket(`${WS_URL}/ws?token=${encodeURIComponent(token)}`);

  socket.onopen = () => {
    reconnectDelay = 1000;
    isConnecting = false;
    subscriptions.forEach(({ resource, id }) => {
      socket?.send(JSON.stringify({ type: 'subscribe', resource, id }));
    });
  };

  socket.onmessage = (e) => {
    let msg: any;
    try { msg = JSON.parse(e.data); } catch { return; }
    if (msg.type !== 'event') return;
    subscriptions.forEach(({ resource, id, handler }) => {
      if (resource === msg.resource && id === msg.id) handler(msg.data);
    });
  };

  socket.onclose = () => {
    isConnecting = false;
    clearTimer();
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      connect();
    }, reconnectDelay);
  };

  socket.onerror = () => { isConnecting = false; };
}

export function disconnect() {
  clearTimer();
  subscriptions = [];
  socket?.close();
  socket = null;
  reconnectDelay = 1000;
}

function subscribe(resource: string, id: string, handler: EventHandler): () => void {
  if (!subscriptions.some(s => s.resource === resource && s.id === id && s.handler === handler)) {
    subscriptions.push({ resource, id, handler });
  }
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'subscribe', resource, id }));
  } else {
    connect();
  }
  return () => {
    subscriptions = subscriptions.filter(
      s => !(s.resource === resource && s.id === id && s.handler === handler)
    );
    if (!subscriptions.some(s => s.resource === resource && s.id === id) &&
        socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'unsubscribe', resource, id }));
    }
  };
}

export function useWebSocket(resource: string, id: string, handler: EventHandler, enabled = true) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const stableHandler = useCallback((data: unknown) => { handlerRef.current(data); }, []);

  useEffect(() => {
    if (!enabled || !resource || !id) return;
    return subscribe(resource, id, stableHandler);
  }, [resource, id, enabled, stableHandler]);
}
