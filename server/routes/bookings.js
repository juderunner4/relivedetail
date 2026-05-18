const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// Public booking endpoint (no auth) — for optional future wiring from index.html
router.post('/public', (req, res) => {
  const { name, phone, email, address, vehicle_make, vehicle_model, vehicle_year, vehicle_size,
          service_type, add_ons, total_price, date, time, notes } = req.body;
  if (!name || !date || !service_type) {
    return res.status(400).json({ error: 'Name, date, and service are required' });
  }

  // Find or create client
  let client = db.prepare('SELECT id FROM clients WHERE phone = ? OR email = ?').get(phone || '', email || '');
  let clientId;
  if (!client) {
    clientId = db.prepare(
      'INSERT INTO clients (name, phone, email, address) VALUES (?, ?, ?, ?)'
    ).run(name, phone || '', email || '', address || '').lastInsertRowid;
  } else {
    clientId = client.id;
  }

  // Create vehicle if provided
  let vehicleId;
  if (vehicle_make) {
    vehicleId = db.prepare(
      'INSERT INTO vehicles (client_id, make, model, year, size) VALUES (?, ?, ?, ?, ?)'
    ).run(clientId, vehicle_make, vehicle_model || '', vehicle_year || null, vehicle_size || 'sedan').lastInsertRowid;
  }

  const bookingId = db.prepare(
    `INSERT INTO bookings (client_id, date, time, service_type, add_ons, total_price, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(clientId, date, time || '', service_type, JSON.stringify(add_ons || []), total_price || 0, notes || '').lastInsertRowid;

  if (vehicleId) {
    db.prepare('INSERT INTO booking_vehicles (booking_id, vehicle_id) VALUES (?, ?)').run(bookingId, vehicleId);
  }

  res.status(201).json({ id: bookingId, message: 'Booking received' });
});

router.use(requireAuth);

router.get('/', (req, res) => {
  const { status, from, to } = req.query;
  let query = `
    SELECT b.*, c.name as client_name, c.phone as client_phone,
           GROUP_CONCAT(v.make || ' ' || v.model, ', ') as vehicle_names
    FROM bookings b
    LEFT JOIN clients c ON c.id = b.client_id
    LEFT JOIN booking_vehicles bv ON bv.booking_id = b.id
    LEFT JOIN vehicles v ON v.id = bv.vehicle_id
    WHERE 1=1
  `;
  const params = [];
  if (status) { query += ' AND b.status = ?'; params.push(status); }
  if (from)   { query += ' AND b.date >= ?'; params.push(from); }
  if (to)     { query += ' AND b.date <= ?'; params.push(to); }
  query += ' GROUP BY b.id ORDER BY b.date ASC, b.time ASC';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const booking = db.prepare(`
    SELECT b.*, c.name as client_name, c.phone as client_phone, c.email as client_email, c.address as client_address
    FROM bookings b
    LEFT JOIN clients c ON c.id = b.client_id
    WHERE b.id = ?
  `).get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Not found' });
  const vehicles = db.prepare(
    'SELECT v.* FROM vehicles v JOIN booking_vehicles bv ON bv.vehicle_id = v.id WHERE bv.booking_id = ?'
  ).all(req.params.id);
  res.json({ ...booking, vehicles });
});

router.post('/', (req, res) => {
  const { client_id, date, time, service_type, add_ons, total_price, notes, vehicle_ids } = req.body;
  if (!client_id || !date) return res.status(400).json({ error: 'client_id and date required' });

  const bookingId = db.prepare(
    `INSERT INTO bookings (client_id, date, time, service_type, add_ons, total_price, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(client_id, date, time || '', service_type || '', JSON.stringify(add_ons || []), total_price || 0, notes || '').lastInsertRowid;

  if (Array.isArray(vehicle_ids)) {
    const ins = db.prepare('INSERT INTO booking_vehicles (booking_id, vehicle_id) VALUES (?, ?)');
    vehicle_ids.forEach(vid => ins.run(bookingId, vid));
  }

  res.status(201).json({ id: bookingId });
});

router.put('/:id', (req, res) => {
  const { date, time, status, service_type, add_ons, total_price, notes, vehicle_ids } = req.body;
  db.prepare(
    `UPDATE bookings SET date=?, time=?, status=?, service_type=?, add_ons=?, total_price=?, notes=? WHERE id=?`
  ).run(date, time, status, service_type, JSON.stringify(add_ons || []), total_price, notes, req.params.id);

  if (Array.isArray(vehicle_ids)) {
    db.prepare('DELETE FROM booking_vehicles WHERE booking_id = ?').run(req.params.id);
    const ins = db.prepare('INSERT INTO booking_vehicles (booking_id, vehicle_id) VALUES (?, ?)');
    vehicle_ids.forEach(vid => ins.run(req.params.id, vid));
  }

  // Auto-record revenue when marked Completed
  if (status === 'Completed') {
    const existing = db.prepare('SELECT id FROM revenue WHERE booking_id = ?').get(req.params.id);
    if (!existing) {
      const b = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
      db.prepare('INSERT INTO revenue (booking_id, amount, date, service_type) VALUES (?, ?, ?, ?)')
        .run(req.params.id, b.total_price, b.date, b.service_type);
    }
  }

  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
