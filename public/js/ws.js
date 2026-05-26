import { setState, getState } from './store.js';

const WS_URL = `ws://${location.host}/ws`;
let socket = null;
let retryTimer = null;

export function connectWS() {
  if (socket && socket.readyState < 2) return;
  socket = new WebSocket(WS_URL);

  socket.addEventListener('message', (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'idle_alert') {
        const alerts = [...getState().idleAlerts.filter(a => a.resource_id !== msg.resource_id), msg];
        setState({ idleAlerts: alerts });
      }
    } catch { /* ignore malformed frames */ }
  });

  socket.addEventListener('close', () => {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(connectWS, 10_000); // fallback reconnect
  });
}

export function disconnectWS() {
  clearTimeout(retryTimer);
  if (socket) socket.close();
  socket = null;
}
