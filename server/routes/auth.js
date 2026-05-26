const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { createToken } = require('../auth');

const router = express.Router();

router.post('/token', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(422).json({ detail: 'username and password are required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ detail: 'Invalid username or password' });
  }
  res.json({ access_token: createToken(user.id, user.role), token_type: 'bearer', role: user.role });
});

module.exports = router;
