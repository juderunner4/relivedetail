const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { month, year } = req.query;
  let query = 'SELECT * FROM expenses';
  const params = [];
  if (month && year) {
    query += " WHERE strftime('%Y-%m', date) = ?";
    params.push(`${year}-${String(month).padStart(2, '0')}`);
  } else if (month) {
    const now = new Date();
    query += " WHERE strftime('%Y-%m', date) = ?";
    params.push(`${now.getFullYear()}-${String(month).padStart(2, '0')}`);
  }
  query += ' ORDER BY date DESC, id DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/summary', (req, res) => {
  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', date) as month, SUM(amount) as total, category
    FROM expenses
    GROUP BY month, category
    ORDER BY month DESC
  `).all();

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthTotal = db.prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE strftime('%Y-%m', date) = ?"
  ).get(thisMonth)?.total || 0;

  const yearTotal = db.prepare(
    "SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE strftime('%Y', date) = ?"
  ).get(String(new Date().getFullYear()))?.total || 0;

  const byCategory = db.prepare(`
    SELECT category, COALESCE(SUM(amount),0) as total
    FROM expenses
    WHERE strftime('%Y-%m', date) = ?
    GROUP BY category
  `).all(thisMonth);

  res.json({ monthly, thisMonthTotal, yearTotal, byCategory });
});

router.post('/', (req, res) => {
  const { date, category, amount, description, notes } = req.body;
  if (!date || !category || amount == null) return res.status(400).json({ error: 'date, category, and amount are required' });
  const id = db.prepare(
    'INSERT INTO expenses (date, category, amount, description, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(date, category, parseFloat(amount), description || '', notes || '').lastInsertRowid;
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const { date, category, amount, description, notes } = req.body;
  db.prepare('UPDATE expenses SET date=?, category=?, amount=?, description=?, notes=? WHERE id=?')
    .run(date, category, parseFloat(amount), description || '', notes || '', req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
