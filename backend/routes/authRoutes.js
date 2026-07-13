const express = require('express');
const { loginUser, firstLoginReset } = require('../controllers/authController');

const router = express.Router();

// Login Route
router.post('/login', loginUser);

// First-login password reset (replaces public registration flow)
router.post('/first-login-reset', firstLoginReset);

module.exports = router;
