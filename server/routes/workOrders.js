const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireRole } = require('../auth');
const { paginate } = require('./helpers');

const router = express.Router();
const VALID_STATUS = ['pending', 'in_progress', 'complete', 'on_hold'];

router.get('/', authenticate, (req, res) => {
  const { page, page_size, offset } = paginate(req);
  const statusFilter = req.query.status;
  const where = statusFilter ? `AND status = '${statusFilter}'` : '';
  const total = db.prepare(`SELECT COUNT(*) as n FROM work_orders WHERE deleted_at IS NULL ${where}`).get().n;
  const items = db.prepare(`SELECT * FROM work_orders WHERE deleted_at IS NULL ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(page_size, offset);
  res.json({ items, total, page, page_size });
});

router.post('/', ...requireRole('supervisor', 'manager'), (req, res) => {
  const { product, quantity, priority = 5, status = 'pending', start_at, end_at } = req.body;
  if (!product || !quantity) return res.status(422).json({ detail: 'product and quantity are required' });
  if (!VALID_STATUS.includes(status)) return res.status(422).json({ detail: 'Invalid status' });
  const id = uuidv4();
  db.prepare(`INSERT INTO work_orders (id, product, quantity, priority, status, start_at, end_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, product, quantity, priority, status, start_at || null, end_at || null);
  res.status(201).json(db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id));
});

router.get('/:id', authenticate, (req, res) => {
  const wo = db.prepare('SELECT * FROM work_orders WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!wo) return res.status(404).json({ detail: 'Work order not found' });
  res.json(wo);
});

router.patch('/:id', ...requireRole('supervisor', 'manager'), (req, res) => {
  const wo = db.prepare('SELECT * FROM work_orders WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!wo) return res.status(404).json({ detail: 'Work order not found' });
  const { product, quantity, priority, status, start_at, end_at } = req.body;
  db.prepare(`UPDATE work_orders SET
    product = COALESCE(?, product), quantity = COALESCE(?, quantity),
    priority = COALESCE(?, priority), status = COALESCE(?, status),
    start_at = COALESCE(?, start_at), end_at = COALESCE(?, end_at),
    updated_at = datetime('now') WHERE id = ?`)
    .run(product ?? null, quantity ?? null, priority ?? null, status ?? null, start_at ?? null, end_at ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM work_orders WHERE id = ?').get(req.params.id));
});

router.delete('/:id', ...requireRole('manager'), (req, res) => {
  const wo = db.prepare('SELECT id FROM work_orders WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!wo) return res.status(404).json({ detail: 'Work order not found' });
  db.prepare(`UPDATE work_orders SET deleted_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.status(204).send();
});

module.exports = router;
