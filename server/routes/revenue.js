const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  // Monthly totals for last 12 months
  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', date) as month, SUM(amount) as total
    FROM revenue
    WHERE date >= date('now', '-12 months')
    GROUP BY month
    ORDER BY month ASC
  `).all();

  // By service type
  const byService = db.prepare(`
    SELECT service_type, SUM(amount) as total
    FROM revenue
    GROUP BY service_type
    ORDER BY total DESC
  `).all();

  // This month vs last month
  const thisMonth = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM revenue
    WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
  `).get();
  const lastMonth = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM revenue
    WHERE strftime('%Y-%m', date) = strftime('%Y-%m', date('now', '-1 month'))
  `).get();

  // Total clients, jobs this month
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM clients) as total_clients,
      (SELECT COUNT(*) FROM bookings WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now') AND status = 'Completed') as jobs_this_month,
      (SELECT COUNT(*) FROM bookings WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')) as bookings_this_month
  `).get();

  res.json({ monthly, byService, thisMonth: thisMonth.total, lastMonth: lastMonth.total, ...stats });
});

router.get('/export', (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, c.name as client_name
    FROM revenue r
    LEFT JOIN bookings b ON b.id = r.booking_id
    LEFT JOIN clients c ON c.id = b.client_id
    ORDER BY r.date DESC
  `).all();

  const header = 'Date,Client,Service,Amount,Notes\n';
  const csv = rows.map(r =>
    `${r.date},"${r.client_name || ''}","${r.service_type || ''}",${r.amount},"${r.notes || ''}"`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="revenue.csv"');
  res.send(header + csv);
});

module.exports = router;
