const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const IRS_RATE = 0.70; // 2024 IRS standard mileage rate

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { month, year } = req.query;
  let query = `
    SELECT m.*, b.service_type as booking_service, c.name as client_name
    FROM mileage_log m
    LEFT JOIN bookings b ON b.id = m.booking_id
    LEFT JOIN clients c ON c.id = b.client_id
  `;
  const params = [];
  if (month && year) {
    query += " WHERE strftime('%Y-%m', m.date) = ?";
    params.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  query += ' ORDER BY m.date DESC, m.id DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/summary', (req, res) => {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisYear = String(new Date().getFullYear());

  const monthMiles = db.prepare(
    "SELECT COALESCE(SUM(miles),0) as total FROM mileage_log WHERE strftime('%Y-%m', date) = ?"
  ).get(thisMonth)?.total || 0;

  const yearMiles = db.prepare(
    "SELECT COALESCE(SUM(miles),0) as total FROM mileage_log WHERE strftime('%Y', date) = ?"
  ).get(thisYear)?.total || 0;

  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', date) as month, SUM(miles) as miles
    FROM mileage_log GROUP BY month ORDER BY month DESC LIMIT 12
  `).all();

  res.json({
    monthMiles,
    yearMiles,
    yearDeduction: +(yearMiles * IRS_RATE).toFixed(2),
    monthDeduction: +(monthMiles * IRS_RATE).toFixed(2),
    irsRate: IRS_RATE,
    monthly,
  });
});

router.post('/', (req, res) => {
  const { date, miles, from_address, to_address, booking_id, notes } = req.body;
  if (!date || miles == null) return res.status(400).json({ error: 'date and miles are required' });
  const id = db.prepare(
    'INSERT INTO mileage_log (date, miles, from_address, to_address, booking_id, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(date, parseFloat(miles), from_address || '', to_address || '', booking_id || null, notes || '').lastInsertRowid;
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const { date, miles, from_address, to_address, booking_id, notes } = req.body;
  db.prepare('UPDATE mileage_log SET date=?, miles=?, from_address=?, to_address=?, booking_id=?, notes=? WHERE id=?')
    .run(date, parseFloat(miles), from_address || '', to_address || '', booking_id || null, notes || '', req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM mileage_log WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
