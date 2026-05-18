const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const SECRET = () => process.env.JWT_SECRET || 'dev-secret';

router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  const row = db.prepare("SELECT value FROM settings WHERE key = 'owner_password_hash'").get();
  if (!row) return res.status(500).json({ error: 'No password configured' });

  const valid = bcrypt.compareSync(password, row.value);
  if (!valid) return res.status(401).json({ error: 'Incorrect password' });

  const token = jwt.sign({ owner: true }, SECRET(), { expiresIn: '30d' });
  res.json({ token });
});

router.post('/logout', (_req, res) => res.json({ ok: true }));

module.exports = router;
