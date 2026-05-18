const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT mp.*, c.name as client_name, c.phone as client_phone, c.email as client_email
    FROM maintenance_plans mp
    LEFT JOIN clients c ON c.id = mp.client_id
    WHERE mp.active = 1
    ORDER BY mp.next_service_date ASC
  `).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const plan = db.prepare(`
    SELECT mp.*, c.name as client_name
    FROM maintenance_plans mp
    LEFT JOIN clients c ON c.id = mp.client_id
    WHERE mp.id = ?
  `).get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Not found' });
  res.json(plan);
});

router.post('/', (req, res) => {
  const { client_id, plan_tier, frequency_weeks, price_per_visit, start_date, last_service_date, next_service_date } = req.body;
  if (!client_id || !plan_tier) return res.status(400).json({ error: 'client_id and plan_tier required' });
  const result = db.prepare(
    `INSERT INTO maintenance_plans (client_id, plan_tier, frequency_weeks, price_per_visit, start_date, last_service_date, next_service_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(client_id, plan_tier, frequency_weeks, price_per_visit, start_date || null, last_service_date || null, next_service_date || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { plan_tier, frequency_weeks, price_per_visit, start_date, last_service_date, next_service_date, active } = req.body;
  db.prepare(
    `UPDATE maintenance_plans SET plan_tier=?, frequency_weeks=?, price_per_visit=?, start_date=?, last_service_date=?, next_service_date=?, active=? WHERE id=?`
  ).run(plan_tier, frequency_weeks, price_per_visit, start_date, last_service_date, next_service_date, active ?? 1, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('UPDATE maintenance_plans SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
