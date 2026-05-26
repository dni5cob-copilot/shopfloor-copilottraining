# Frontend Feature Reference

## Zustand Store Template

```typescript
// frontend/src/stores/allocationStore.ts
import { create } from "zustand";
import { apiClient } from "../api/client";
import type { Allocation, AllocationCreate } from "../types/allocation";

interface AllocationStore {
  allocations: Allocation[];
  isLoading: boolean;
  error: string | null;
  fetchAllocations: (workOrderId: string) => Promise<void>;
  createAllocation: (payload: AllocationCreate) => Promise<void>;
  deallocate: (allocationId: string) => Promise<void>;
}

export const useAllocationStore = create<AllocationStore>((set, get) => ({
  allocations: [],
  isLoading: false,
  error: null,

  fetchAllocations: async (workOrderId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.get(`/api/v1/allocations?work_order_id=${workOrderId}`);
      set({ allocations: data.items });
    } catch (e) {
      set({ error: "Failed to load allocations" });
    } finally {
      set({ isLoading: false });
    }
  },

  createAllocation: async (payload) => {
    const { data } = await apiClient.post("/api/v1/allocations", payload);
    set((s) => ({ allocations: [...s.allocations, data] }));
  },

  deallocate: async (allocationId) => {
    await apiClient.delete(`/api/v1/allocations/${allocationId}`);
    set((s) => ({ allocations: s.allocations.filter((a) => a.id !== allocationId) }));
  },
}));
```

## WebSocket Store (shared singleton)

```typescript
// frontend/src/stores/wsStore.ts
import { create } from "zustand";

type IdleEvent = { resource_id: string; resource_type: string; idle_since: string };

interface WsStore {
  socket: WebSocket | null;
  idleAlerts: IdleEvent[];
  connect: (token: string) => void;
  dismiss: (resourceId: string) => void;
}

export const useWsStore = create<WsStore>((set, get) => ({
  socket: null,
  idleAlerts: [],

  connect: (token) => {
    const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}/api/v1/ws?token=${token}`);

    ws.onmessage = (event) => {
      const msg: IdleEvent = JSON.parse(event.data);
      set((s) => ({ idleAlerts: [...s.idleAlerts, msg] }));
    };

    ws.onclose = () => {
      // Fallback: reconnect or start polling every 10 s
      setTimeout(() => get().connect(token), 10_000);
    };

    set({ socket: ws });
  },

  dismiss: (resourceId) =>
    set((s) => ({ idleAlerts: s.idleAlerts.filter((a) => a.resource_id !== resourceId) })),
}));
```

## apiClient Wrapper

```typescript
// frontend/src/api/client.ts
import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach JWT on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Structured error handling — never expose raw errors to components
apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    const message = err.response?.data?.detail ?? "An unexpected error occurred";
    return Promise.reject(new Error(message));
  }
);
```

## Idle Alert Banner Component

```tsx
// frontend/src/components/IdleAlertBanner/IdleAlertBanner.tsx
import { useWsStore } from "../../stores/wsStore";
import { useAllocationStore } from "../../stores/allocationStore";
import { apiClient } from "../../api/client";

export function IdleAlertBanner() {
  const { idleAlerts, dismiss } = useWsStore();

  const handleSuggest = async (resourceId: string) => {
    const { data } = await apiClient.get(`/api/v1/suggestions?resource_id=${resourceId}`);
    // Open suggestion modal with data.items
    console.log("Suggestions:", data.items);
  };

  if (!idleAlerts.length) return null;

  return (
    <div role="alert" aria-live="polite">
      {idleAlerts.map((alert) => (
        <div key={alert.resource_id}>
          <span>{alert.resource_type} idle since {new Date(alert.idle_since).toLocaleTimeString()}</span>
          <button onClick={() => handleSuggest(alert.resource_id)}>Suggest Reallocation</button>
          <button onClick={() => dismiss(alert.resource_id)}>Dismiss</button>
        </div>
      ))}
    </div>
  );
}
```
