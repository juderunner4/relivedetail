const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const queryToken = req.query.token;
  if (!header && !queryToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = queryToken || (header && header.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.owner = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
