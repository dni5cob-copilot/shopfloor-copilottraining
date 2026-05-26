const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireRole } = require('../auth');
const { broadcast } = require('../ws');
const { paginate } = require('./helpers');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const { page, page_size, offset } = paginate(req);
  const woFilter = req.query.work_order_id;
  const where = woFilter ? `WHERE work_order_id = '${woFilter}'` : '';
  const total = db.prepare(`SELECT COUNT(*) as n FROM allocations ${where}`).get().n;
  const items = db.prepare(`SELECT * FROM allocations ${where} ORDER BY allocated_at DESC LIMIT ? OFFSET ?`).all(page_size, offset);
  res.json({ items, total, page, page_size });
});

router.post('/', ...requireRole('supervisor', 'manager'), (req, res) => {
  const { work_order_id, operator_id, machine_id, material_id, quantity_used } = req.body;
  if (!work_order_id) return res.status(422).json({ detail: 'work_order_id is required' });
  if (!operator_id && !machine_id && !material_id) return res.status(422).json({ detail: 'At least one resource must be specified' });
  if (material_id && !quantity_used) return res.status(422).json({ detail: 'quantity_used is required when allocating a material' });

  // Double-booking guard: machine
  if (machine_id) {
    const conflict = db.prepare(`SELECT id FROM allocations WHERE machine_id = ? AND deallocated_at IS NULL`).get(machine_id);
    if (conflict) return res.status(409).json({ detail: 'Machine is already allocated to an active work order' });
  }

  // Double-booking guard: operator
  if (operator_id) {
    const conflict = db.prepare(`SELECT id FROM allocations WHERE operator_id = ? AND deallocated_at IS NULL`).get(operator_id);
    if (conflict) return res.status(409).json({ detail: 'Operator is already allocated to an active work order' });
  }

  // Stock reservation guard: material
  if (material_id && quantity_used) {
    const mat = db.prepare('SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL').get(material_id);
    if (!mat) return res.status(404).json({ detail: 'Material not found' });
    const available = mat.qty_on_hand - mat.qty_reserved;
    if (available < quantity_used) return res.status(409).json({ detail: `Insufficient stock. Available: ${available} ${mat.unit}` });
    db.prepare(`UPDATE materials SET qty_reserved = qty_reserved + ?, updated_at = datetime('now') WHERE id = ?`).run(quantity_used, material_id);
  }

  const id = uuidv4();
  db.prepare(`INSERT INTO allocations (id, work_order_id, operator_id, machine_id, material_id, quantity_used, allocated_by) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, work_order_id, operator_id || null, machine_id || null, material_id || null, quantity_used || null, req.user.sub);

  // Update machine/operator status to 'running'
  if (machine_id) db.prepare(`UPDATE machines SET status = 'running', updated_at = datetime('now') WHERE id = ?`).run(machine_id);

  res.status(201).json(db.prepare('SELECT * FROM allocations WHERE id = ?').get(id));
});

router.get('/:id', authenticate, (req, res) => {
  const alloc = db.prepare('SELECT * FROM allocations WHERE id = ?').get(req.params.id);
  if (!alloc) return res.status(404).json({ detail: 'Allocation not found' });
  res.json(alloc);
});

router.delete('/:id/deallocate', ...requireRole('supervisor', 'manager'), (req, res) => {
  const alloc = db.prepare('SELECT * FROM allocations WHERE id = ?').get(req.params.id);
  if (!alloc) return res.status(404).json({ detail: 'Allocation not found' });
  if (alloc.deallocated_at) return res.status(409).json({ detail: 'Allocation is already deallocated' });

  db.prepare(`UPDATE allocations SET deallocated_at = datetime('now') WHERE id = ?`).run(req.params.id);

  // Release material reservation
  if (alloc.material_id && alloc.quantity_used) {
    db.prepare(`UPDATE materials SET qty_reserved = MAX(0, qty_reserved - ?), updated_at = datetime('now') WHERE id = ?`)
      .run(alloc.quantity_used, alloc.material_id);
  }

  // Set machine/operator back to idle and broadcast
  if (alloc.machine_id) {
    db.prepare(`UPDATE machines SET status = 'idle', last_idle_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(alloc.machine_id);
    broadcast({ type: 'idle_alert', resource_type: 'machine', resource_id: alloc.machine_id, idle_since: new Date().toISOString() });
  }
  if (alloc.operator_id) {
    broadcast({ type: 'idle_alert', resource_type: 'operator', resource_id: alloc.operator_id, idle_since: new Date().toISOString() });
  }

  res.json(db.prepare('SELECT * FROM allocations WHERE id = ?').get(req.params.id));
});

module.exports = router;
