// Client-Side Realtime Subscription Service
// Listens to Server-Sent Events (SSE) and local BroadcastChannel for zero-latency multi-user sync.

export interface RealtimeMessage {
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

type Listener = (msg: RealtimeMessage) => void;

class RealtimeService {
  private eventSource: EventSource | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<Listener>> = new Map();
  private isConnecting = false;
  private reconnectTimer: any = null;
  private reconnectDelay = 1000;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.broadcastChannel = new BroadcastChannel('docworm_realtime_channel');
          this.broadcastChannel.onmessage = (event) => {
            if (event.data && event.data.type) {
              this.dispatch(event.data);
            }
          };
        }
      } catch {
        // BroadcastChannel unavailable
      }
    }
  }

  public connect() {
    if (typeof window === 'undefined' || this.eventSource || this.isConnecting) return;
    this.isConnecting = true;

    try {
      this.eventSource = new EventSource('/api/realtime');

      this.eventSource.onopen = () => {
        this.isConnecting = false;
        this.reconnectDelay = 1000;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data: RealtimeMessage = JSON.parse(event.data);
          this.dispatch(data);
          // Also broadcast locally across open tabs
          if (this.broadcastChannel) {
            this.broadcastChannel.postMessage(data);
          }
        } catch (e) {
          console.debug('SSE parse error:', e);
        }
      };

      this.eventSource.onerror = () => {
        this.disconnect();
        this.scheduleReconnect();
      };
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  public broadcastLocal(msg: RealtimeMessage) {
    this.dispatch(msg);
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(msg);
    }
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnecting = false;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 15000);
      this.connect();
    }, this.reconnectDelay);
  }

  public on(type: string, listener: Listener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    // Auto-connect if first listener
    if (!this.eventSource && !this.isConnecting) {
      this.connect();
    }

    return () => {
      this.listeners.get(type)?.delete(listener);
      if (this.listeners.get(type)?.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  private dispatch(msg: RealtimeMessage) {
    // Specific type listeners
    const specific = this.listeners.get(msg.type);
    if (specific) {
      for (const listener of specific) {
        try {
          listener(msg);
        } catch (e) {
          console.error('Realtime listener error:', e);
        }
      }
    }

    // Wildcard listeners ('*')
    const all = this.listeners.get('*');
    if (all) {
      for (const listener of all) {
        try {
          listener(msg);
        } catch (e) {
          console.error('Realtime wildcard listener error:', e);
        }
      }
    }

    // Also dispatch a DOM CustomEvent for loose coupling
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`docworm_realtime_${msg.type}`, { detail: msg }));
      window.dispatchEvent(new CustomEvent('docworm_realtime', { detail: msg }));
    }
  }
}

export const realtime = new RealtimeService();
