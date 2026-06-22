const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { month, year } = req.query;
  let query = 'SELECT * FROM ad_spend';
  const params = [];
  if (month && year) {
    query += " WHERE strftime('%Y-%m', date) = ?";
    params.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  query += ' ORDER BY date DESC, id DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/summary', (req, res) => {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisYear = String(new Date().getFullYear());

  const monthTotal = db.prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM ad_spend WHERE strftime('%Y-%m', date) = ?"
  ).get(thisMonth)?.total || 0;

  const yearTotal = db.prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM ad_spend WHERE strftime('%Y', date) = ?"
  ).get(thisYear)?.total || 0;

  const byPlatform = db.prepare(`
    SELECT platform, COALESCE(SUM(amount),0) as total
    FROM ad_spend WHERE strftime('%Y-%m', date) = ?
    GROUP BY platform ORDER BY total DESC
  `).all(thisMonth);

  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', date) as month, SUM(amount) as total
    FROM ad_spend GROUP BY month ORDER BY month DESC LIMIT 6
  `).all();

  res.json({ monthTotal, yearTotal, byPlatform, monthly });
});

router.post('/', (req, res) => {
  const { platform, amount, date, notes } = req.body;
  if (!platform || amount == null || !date) return res.status(400).json({ error: 'platform, amount, and date are required' });
  const id = db.prepare('INSERT INTO ad_spend (platform, amount, date, notes) VALUES (?, ?, ?, ?)')
    .run(platform, parseFloat(amount), date, notes || '').lastInsertRowid;
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const { platform, amount, date, notes } = req.body;
  db.prepare('UPDATE ad_spend SET platform=?, amount=?, date=?, notes=? WHERE id=?')
    .run(platform, parseFloat(amount), date, notes || '', req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM ad_spend WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
