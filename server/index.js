require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { setupWebSocket } = require('./ws');

// Initialise DB (runs schema + seeds)
require('./db');

const app = express();
const server = createServer(app);

setupWebSocket(server);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/v1/auth',        require('./routes/auth'));
app.use('/api/v1/work-orders', require('./routes/workOrders'));
app.use('/api/v1/operators',   require('./routes/operators'));
app.use('/api/v1/machines',    require('./routes/machines'));
app.use('/api/v1/materials',   require('./routes/materials'));
app.use('/api/v1/allocations', require('./routes/allocations'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Fallback: serve SPA for non-API routes
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler — never expose stack traces
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ detail: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n  Shop Floor API  →  http://localhost:${PORT}/api/v1`);
  console.log(`  Frontend        →  http://localhost:${PORT}`);
  console.log(`\n  Default logins:`);
  console.log(`    admin / admin123      (manager)`);
  console.log(`    supervisor / super123 (supervisor)`);
  console.log(`    viewer / viewer123    (read-only)\n`);
});
