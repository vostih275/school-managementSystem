const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getSettings, getContact, updateSettings } = require('../controllers/schoolSettingsController');

const router = express.Router();

// Public/partially public contact info can be exposed here for the frontend
router.get('/contact', getContact);
router.get('/', protect, getSettings);
router.put('/', protect, authorize('admin'), updateSettings);

module.exports = router;
