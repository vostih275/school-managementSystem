const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { createAnnouncement, getAnnouncements, deleteAnnouncement } = require('../controllers/announcementController');

const router = express.Router();

// 📝 Create a new announcement (teacher only)
router.post('/', protect, authorize('teacher'), createAnnouncement);

// 📄 Get all announcements (any logged-in user)
router.get('/', protect, getAnnouncements);

// 🗑️ Delete an announcement (teacher only)
router.delete('/:id', protect, authorize('teacher'), deleteAnnouncement);

module.exports = router;
