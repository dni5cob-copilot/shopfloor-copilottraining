const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const EXPIRES = `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 60}m`;

function createToken(userId, role) {
  return jwt.sign({ sub: userId, role }, SECRET, { expiresIn: EXPIRES });
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Missing or invalid authorization header' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], SECRET);
    next();
  } catch {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return [
    authenticate,
    (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ detail: 'Insufficient permissions' });
      }
      next();
    },
  ];
}

module.exports = { createToken, authenticate, requireRole };
