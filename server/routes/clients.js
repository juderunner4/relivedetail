const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { q } = req.query;
  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = db.prepare(
      'SELECT * FROM clients WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY name'
    ).all(like, like, like);
  } else {
    rows = db.prepare('SELECT * FROM clients ORDER BY name').all();
  }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });

  const vehicles = db.prepare('SELECT * FROM vehicles WHERE client_id = ?').all(client.id);
  const bookings = db.prepare(
    `SELECT b.*, GROUP_CONCAT(v.make || ' ' || v.model, ', ') as vehicle_names
     FROM bookings b
     LEFT JOIN booking_vehicles bv ON bv.booking_id = b.id
     LEFT JOIN vehicles v ON v.id = bv.vehicle_id
     WHERE b.client_id = ?
     GROUP BY b.id
     ORDER BY b.date DESC`
  ).all(client.id);
  const plan = db.prepare('SELECT * FROM maintenance_plans WHERE client_id = ? AND active = 1').get(client.id);
  const lifetime = db.prepare('SELECT COALESCE(SUM(total_price),0) as total FROM bookings WHERE client_id = ? AND status = "Completed"').get(client.id);
  const invoices = db.prepare('SELECT * FROM invoices WHERE client_id = ? ORDER BY created_at DESC').all(client.id);

  res.json({ ...client, vehicles, bookings, plan, lifetime_spent: lifetime.total, invoices });
});

router.post('/', (req, res) => {
  const { name, phone, email, address, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const result = db.prepare(
    'INSERT INTO clients (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(name, phone || '', email || '', address || '', notes || '');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { name, phone, email, address, notes } = req.body;
  db.prepare(
    'UPDATE clients SET name=?, phone=?, email=?, address=?, notes=? WHERE id=?'
  ).run(name, phone, email, address, notes, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Vehicles sub-resource
router.get('/:id/vehicles', (req, res) => {
  res.json(db.prepare('SELECT * FROM vehicles WHERE client_id = ?').all(req.params.id));
});

router.post('/:id/vehicles', (req, res) => {
  const { make, model, year, size, color, notes } = req.body;
  const result = db.prepare(
    'INSERT INTO vehicles (client_id, make, model, year, size, color, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(req.params.id, make, model, year || null, size, color || '', notes || '');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id/vehicles/:vid', (req, res) => {
  const { make, model, year, size, color, notes } = req.body;
  db.prepare(
    'UPDATE vehicles SET make=?, model=?, year=?, size=?, color=?, notes=? WHERE id=? AND client_id=?'
  ).run(make, model, year || null, size, color, notes, req.params.vid, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id/vehicles/:vid', (req, res) => {
  db.prepare('DELETE FROM vehicles WHERE id = ? AND client_id = ?').run(req.params.vid, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
