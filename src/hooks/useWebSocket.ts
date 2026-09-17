import { useEffect, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

const RESOURCE_ALIASES: Record<string, string[]> = {
  chat: ['chats', 'messages', 'chat_deleted', 'chat_cleared', 'message_reaction', 'message_receipt'],
  chats: ['chat', 'messages', 'chat_deleted', 'chat_cleared', 'message_reaction', 'message_receipt'],
  messages: ['chat', 'chats', 'message_reaction', 'message_receipt'],
  call: ['calls', 'incoming_call', 'call_status', 'call_signal'],
  calls: ['call'],
  song: ['songs', 'praise_night_song', 'active_song'],
  schedule: ['schedules'],
  schedules: ['schedule'],
};
const eventCursors = new Map<string, number>();

function matchesResource(subscribedResource: string, incomingResource: string): boolean {
  return subscribedResource === incomingResource ||
    (RESOURCE_ALIASES[subscribedResource] || []).includes(incomingResource);
}

const WS_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || 'https://rehearsalhub-api-production-6a17.up.railway.app')
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
      socket?.send(JSON.stringify({
        type: 'subscribe', resource, id,
        since: eventCursors.get(`${resource}:${id}`) || 0,
      }));
      (RESOURCE_ALIASES[resource] || []).forEach(alias => {
        socket?.send(JSON.stringify({
          type: 'subscribe', resource: alias, id,
          since: eventCursors.get(`${alias}:${id}`) || 0,
        }));
      });
    });
  };

  socket.onmessage = (e) => {
    let msg: any;
    try { msg = JSON.parse(e.data); } catch { return; }
    if (msg.type !== 'event') return;
    if (Number.isFinite(msg.sequence)) {
      eventCursors.set(`${msg.resource}:${msg.id}`, Number(msg.sequence));
    }
    subscriptions.forEach(({ resource, id, handler }) => {
      if (matchesResource(resource, msg.resource) && (id === msg.id || id === 'all' || msg.id === 'all')) {
        try {
          handler(msg.data);
        } catch (err) {
          console.warn(`[useWebSocket] Handler error for ${resource}:${id}:`, err);
        }
      }
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
    socket.send(JSON.stringify({ type: 'subscribe', resource, id, since: eventCursors.get(`${resource}:${id}`) || 0 }));
    (RESOURCE_ALIASES[resource] || []).forEach(alias => {
      socket?.send(JSON.stringify({ type: 'subscribe', resource: alias, id, since: eventCursors.get(`${alias}:${id}`) || 0 }));
    });
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
      (RESOURCE_ALIASES[resource] || []).forEach(alias => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'unsubscribe', resource: alias, id }));
        }
      });
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
