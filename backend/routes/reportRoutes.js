const express = require('express');
const { protect } = require('../middleware/auth');
const { generateComprehensiveReport } = require('../controllers/reportCardController');

const router = express.Router();

// @route   GET /api/reports/generate/:studentId/:term/:year
// @desc    Generate comprehensive report card data with averages, positions, and improvement
// @access  Private
router.get('/generate/:studentId/:term/:year', protect, generateComprehensiveReport);

module.exports = router;
