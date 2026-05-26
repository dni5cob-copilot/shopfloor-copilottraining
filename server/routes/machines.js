const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireRole } = require('../auth');
const { broadcast } = require('../ws');
const { paginate } = require('./helpers');

const router = express.Router();

router.get('/idle', authenticate, (_req, res) => {
  res.json(db.prepare(`SELECT * FROM machines WHERE status = 'idle' AND deleted_at IS NULL`).all());
});

router.get('/', authenticate, (req, res) => {
  const { page, page_size, offset } = paginate(req);
  const statusFilter = req.query.status;
  const where = statusFilter ? `AND status = '${statusFilter}'` : '';
  const total = db.prepare(`SELECT COUNT(*) as n FROM machines WHERE deleted_at IS NULL ${where}`).get().n;
  const items = db.prepare(`SELECT * FROM machines WHERE deleted_at IS NULL ${where} ORDER BY name LIMIT ? OFFSET ?`).all(page_size, offset);
  res.json({ items, total, page, page_size });
});

router.post('/', ...requireRole('supervisor', 'manager'), (req, res) => {
  const { name, type, capacity, idle_threshold_minutes = 5 } = req.body;
  if (!name || !type || !capacity) return res.status(422).json({ detail: 'name, type and capacity are required' });
  const id = uuidv4();
  db.prepare(`INSERT INTO machines (id, name, type, capacity, idle_threshold_minutes) VALUES (?, ?, ?, ?, ?)`)
    .run(id, name, type, capacity, idle_threshold_minutes);
  res.status(201).json(db.prepare('SELECT * FROM machines WHERE id = ?').get(id));
});

router.get('/:id', authenticate, (req, res) => {
  const m = db.prepare('SELECT * FROM machines WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!m) return res.status(404).json({ detail: 'Machine not found' });
  res.json(m);
});

router.patch('/:id', ...requireRole('supervisor', 'manager'), (req, res) => {
  const m = db.prepare('SELECT * FROM machines WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!m) return res.status(404).json({ detail: 'Machine not found' });
  const { name, type, capacity, status, idle_threshold_minutes } = req.body;

  // If status changed to idle, record timestamp and broadcast alert
  if (status === 'idle' && m.status !== 'idle') {
    db.prepare(`UPDATE machines SET status = 'idle', last_idle_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
    broadcast({ type: 'idle_alert', resource_type: 'machine', resource_id: req.params.id, idle_since: new Date().toISOString() });
  } else {
    db.prepare(`UPDATE machines SET name = COALESCE(?, name), type = COALESCE(?, type), capacity = COALESCE(?, capacity), status = COALESCE(?, status), idle_threshold_minutes = COALESCE(?, idle_threshold_minutes), updated_at = datetime('now') WHERE id = ?`)
      .run(name ?? null, type ?? null, capacity ?? null, status ?? null, idle_threshold_minutes ?? null, req.params.id);
  }
  res.json(db.prepare('SELECT * FROM machines WHERE id = ?').get(req.params.id));
});

router.delete('/:id', ...requireRole('manager'), (req, res) => {
  const m = db.prepare('SELECT id FROM machines WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!m) return res.status(404).json({ detail: 'Machine not found' });
  db.prepare(`UPDATE machines SET deleted_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.status(204).send();
});

module.exports = router;
