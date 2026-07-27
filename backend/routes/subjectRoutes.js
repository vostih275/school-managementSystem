const express = require('express');
const { JUNIOR_SECONDARY_SUBJECTS } = require('../config/subjects');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/subjects/junior-secondary
// @desc    Get official CBC Junior Secondary (Grade 7-9) subject list
// @access  Private
router.get('/junior-secondary', protect, (req, res) => {
    res.status(200).json({
        success: true,
        data: JUNIOR_SECONDARY_SUBJECTS
    });
});

module.exports = router;
