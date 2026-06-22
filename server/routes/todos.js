const express = require('express');
const db = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM todos ORDER BY done ASC, position ASC, id ASC').all());
});

router.post('/', (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' });
  const maxPos = db.prepare('SELECT COALESCE(MAX(position),0) as m FROM todos').get()?.m || 0;
  const id = db.prepare('INSERT INTO todos (text, position) VALUES (?, ?)').run(text.trim(), maxPos + 1).lastInsertRowid;
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const { text, done, position } = req.body;
  const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE todos SET text=?, done=?, position=? WHERE id=?')
    .run(
      text ?? existing.text,
      done !== undefined ? (done ? 1 : 0) : existing.done,
      position ?? existing.position,
      req.params.id
    );
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
