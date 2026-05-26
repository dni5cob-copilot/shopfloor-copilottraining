const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireRole } = require('../auth');
const { paginate } = require('./helpers');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const { page, page_size, offset } = paginate(req);
  const total = db.prepare(`SELECT COUNT(*) as n FROM materials WHERE deleted_at IS NULL`).get().n;
  const items = db.prepare(`SELECT * FROM materials WHERE deleted_at IS NULL ORDER BY name LIMIT ? OFFSET ?`).all(page_size, offset);
  res.json({ items, total, page, page_size });
});

router.post('/', ...requireRole('supervisor', 'manager'), (req, res) => {
  const { name, unit, qty_on_hand = 0 } = req.body;
  if (!name || !unit) return res.status(422).json({ detail: 'name and unit are required' });
  const id = uuidv4();
  db.prepare(`INSERT INTO materials (id, name, unit, qty_on_hand) VALUES (?, ?, ?, ?)`)
    .run(id, name, unit, qty_on_hand);
  res.status(201).json(db.prepare('SELECT * FROM materials WHERE id = ?').get(id));
});

router.get('/:id', authenticate, (req, res) => {
  const mat = db.prepare('SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!mat) return res.status(404).json({ detail: 'Material not found' });
  res.json(mat);
});

router.patch('/:id', ...requireRole('supervisor', 'manager'), (req, res) => {
  const mat = db.prepare('SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!mat) return res.status(404).json({ detail: 'Material not found' });
  const { name, unit, qty_on_hand } = req.body;
  db.prepare(`UPDATE materials SET name = COALESCE(?, name), unit = COALESCE(?, unit), qty_on_hand = COALESCE(?, qty_on_hand), updated_at = datetime('now') WHERE id = ?`)
    .run(name ?? null, unit ?? null, qty_on_hand ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id));
});

router.delete('/:id', ...requireRole('manager'), (req, res) => {
  const mat = db.prepare('SELECT id FROM materials WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!mat) return res.status(404).json({ detail: 'Material not found' });
  db.prepare(`UPDATE materials SET deleted_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.status(204).send();
});

module.exports = router;
