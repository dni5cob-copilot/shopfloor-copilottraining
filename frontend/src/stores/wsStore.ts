import { create } from "zustand";

export interface IdleAlert {
  resource_id: string;
  resource_type: "machine" | "operator";
  idle_since: string;
}

interface WsState {
  socket: WebSocket | null;
  connected: boolean;
  idleAlerts: IdleAlert[];
  connect: (token: string) => void;
  disconnect: () => void;
  dismissAlert: (resourceId: string) => void;
}

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000";
const RECONNECT_DELAY_MS = 10_000;

export const useWsStore = create<WsState>((set, get) => ({
  socket: null,
  connected: false,
  idleAlerts: [],

  connect: (token) => {
    const ws = new WebSocket(`${WS_URL}/api/v1/ws?token=${encodeURIComponent(token)}`);

    ws.onopen = () => set({ connected: true });

    ws.onmessage = (event) => {
      try {
        const alert: IdleAlert = JSON.parse(event.data as string);
        set((s) => ({ idleAlerts: [...s.idleAlerts, alert] }));
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      set({ connected: false, socket: null });
      setTimeout(() => get().connect(token), RECONNECT_DELAY_MS);
    };

    ws.onerror = () => ws.close();

    set({ socket: ws });
  },

  disconnect: () => {
    get().socket?.close();
    set({ socket: null, connected: false });
  },

  dismissAlert: (resourceId) =>
    set((s) => ({ idleAlerts: s.idleAlerts.filter((a) => a.resource_id !== resourceId) })),
}));
