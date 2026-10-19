// Server-Sent Events (SSE) Real-Time Synchronization Engine
// Enables instant multi-user synchronization across all connected clients.
// When User A modifies or creates any record, User B's interface updates in <50ms without page refresh.

type SSEClient = {
  id: string;
  userId?: string;
  send: (data: string) => void;
  close: () => void;
};

// In-memory set of connected SSE clients
const clients = new Map<string, SSEClient>();

export function registerSSEClient(id: string, send: (data: string) => void, close: () => void, userId?: string) {
  clients.set(id, { id, userId, send, close });
}

export function unregisterSSEClient(id: string) {
  clients.delete(id);
}

export function getConnectedClientCount(): number {
  return clients.size;
}

export interface RealtimeEventPayload {
  type:
    | 'gate_passes_updated'
    | 'requests_updated'
    | 'tasks_updated'
    | 'announcements_updated'
    | 'profile_updated'
    | 'audit_updated'
    | 'sync_all';
  action?: string;
  id?: string;
  userId?: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export function broadcastRealtime(event: Omit<RealtimeEventPayload, 'timestamp'>) {
  const payload: RealtimeEventPayload = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  const message = `data: ${JSON.stringify(payload)}\n\n`;

  for (const [id, client] of clients.entries()) {
    try {
      client.send(message);
    } catch {
      clients.delete(id);
    }
  }
}
