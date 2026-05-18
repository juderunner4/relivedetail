const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key != 'owner_password_hash'").all();
  const out = {};
  rows.forEach(r => {
    out[r.key] = r.key === 'pricing' ? JSON.parse(r.value) : r.value;
  });
  res.json(out);
});

router.put('/', (req, res) => {
  const { business_name, business_phone, business_email, business_address, owner_email, pricing } = req.body;
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  if (business_name    !== undefined) upsert.run('business_name', business_name);
  if (business_phone   !== undefined) upsert.run('business_phone', business_phone);
  if (business_email   !== undefined) upsert.run('business_email', business_email);
  if (business_address !== undefined) upsert.run('business_address', business_address);
  if (owner_email      !== undefined) upsert.run('owner_email', owner_email);
  if (pricing          !== undefined) upsert.run('pricing', JSON.stringify(pricing));
  res.json({ ok: true });
});

router.post('/change-password', (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Both passwords required' });
  }
  const row = db.prepare("SELECT value FROM settings WHERE key = 'owner_password_hash'").get();
  if (!bcrypt.compareSync(current_password, row.value)) {
    return res.status(401).json({ error: 'Current password incorrect' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare("UPDATE settings SET value = ? WHERE key = 'owner_password_hash'").run(hash);
  res.json({ ok: true });
});

module.exports = router;
