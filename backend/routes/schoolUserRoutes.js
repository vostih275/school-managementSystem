const express = require('express');
const mongoose = require('mongoose');
const User = mongoose.models.User || require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(protect);
const schoolUserController = require('../controllers/schoolUserController');

// Get All Users (admin or teacher)
router.get('/', authorize('admin', 'teacher'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single User by ID (admin only)
router.get('/:id', authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Create User (admin only)
router.post('/', authorize('admin'), schoolUserController.createUser);

// ✅ Delete User (admin only)
router.delete('/:id', authorize('admin'), schoolUserController.deleteUser);

module.exports = router;
