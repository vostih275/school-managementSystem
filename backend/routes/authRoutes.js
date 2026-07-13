const express = require('express');
const { loginUser, firstLoginReset } = require('../controllers/authController');
const User = require('../models/User');

const router = express.Router();

// Login Route
router.post('/login', loginUser);

// First-login password reset (replaces public registration flow)
router.post('/first-login-reset', firstLoginReset);

// Temporary admin seeder endpoint
router.get('/seed-admin', async (req, res) => {
  try {
    let admin = await User.findOne({ email: 'admin@example.com' });
    if (!admin) {
      admin = await User.create({
        name: 'Admin',
        email: 'admin@example.com',
        password: 'Admin123!',
        role: 'admin',
      });
    }
    res.send('Admin seeded successfully');
  } catch (error) {
    console.error('Seed admin error:', error.message);
    res.status(500).send('Error seeding admin');
  }
});

module.exports = router;
