const express = require('express');
const { loginUser, firstLoginReset, forceSetPassword } = require('../controllers/authController');

const router = express.Router();

// Login Route
router.post('/login', loginUser);

// First-login password reset (replaces public registration flow)
router.post('/first-login-reset', firstLoginReset);

// TEMPORARY: force-set a user's password and require a change on next login
router.get('/force-set-password/:email', forceSetPassword);

module.exports = router;
