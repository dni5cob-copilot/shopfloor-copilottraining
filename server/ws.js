const { WebSocketServer } = require('ws');

const clients = new Set();
let wss;

function setupWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });
  console.log('WebSocket server ready on /ws');
}

function broadcast(event) {
  const message = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === 1) client.send(message);
  }
}

module.exports = { setupWebSocket, broadcast };
