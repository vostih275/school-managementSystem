const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getClassAnalytics, getStudentTrends } = require('../controllers/analyticsController');

const router = express.Router();

// Class-level analytics: positions, averages, improvement, subject summaries
router.get('/class/:className', protect, authorize('admin', 'teacher'), getClassAnalytics);

// Student improvement trends across all terms in a year
router.get('/student/:studentId/trends', protect, getStudentTrends);

module.exports = router;
