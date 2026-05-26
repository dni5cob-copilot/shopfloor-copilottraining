const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireRole } = require('../auth');
const { paginate } = require('./helpers');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const { page, page_size, offset } = paginate(req);
  const total = db.prepare(`SELECT COUNT(*) as n FROM operators WHERE deleted_at IS NULL`).get().n;
  const items = db.prepare(`SELECT * FROM operators WHERE deleted_at IS NULL ORDER BY name LIMIT ? OFFSET ?`).all(page_size, offset);
  items.forEach(op => { try { op.skill_set = JSON.parse(op.skill_set); } catch { op.skill_set = []; } });
  res.json({ items, total, page, page_size });
});

router.post('/', ...requireRole('supervisor', 'manager'), (req, res) => {
  const { name, skill_set = [], shift } = req.body;
  if (!name || !shift) return res.status(422).json({ detail: 'name and shift are required' });
  const id = uuidv4();
  db.prepare(`INSERT INTO operators (id, name, skill_set, shift) VALUES (?, ?, ?, ?)`)
    .run(id, name, JSON.stringify(skill_set), shift);
  const op = db.prepare('SELECT * FROM operators WHERE id = ?').get(id);
  op.skill_set = JSON.parse(op.skill_set);
  res.status(201).json(op);
});

router.get('/:id', authenticate, (req, res) => {
  const op = db.prepare('SELECT * FROM operators WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!op) return res.status(404).json({ detail: 'Operator not found' });
  op.skill_set = JSON.parse(op.skill_set);
  res.json(op);
});

router.patch('/:id', ...requireRole('supervisor', 'manager'), (req, res) => {
  const op = db.prepare('SELECT * FROM operators WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!op) return res.status(404).json({ detail: 'Operator not found' });
  const { name, skill_set, shift } = req.body;
  db.prepare(`UPDATE operators SET name = COALESCE(?, name), skill_set = COALESCE(?, skill_set), shift = COALESCE(?, shift), updated_at = datetime('now') WHERE id = ?`)
    .run(name ?? null, skill_set ? JSON.stringify(skill_set) : null, shift ?? null, req.params.id);
  const updated = db.prepare('SELECT * FROM operators WHERE id = ?').get(req.params.id);
  updated.skill_set = JSON.parse(updated.skill_set);
  res.json(updated);
});

router.delete('/:id', ...requireRole('manager'), (req, res) => {
  const op = db.prepare('SELECT id FROM operators WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!op) return res.status(404).json({ detail: 'Operator not found' });
  db.prepare(`UPDATE operators SET deleted_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.status(204).send();
});

module.exports = router;
