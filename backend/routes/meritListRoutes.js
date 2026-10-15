const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
    getMeritList,
    downloadMeritListPdf,
    downloadMeritListExcel
} = require('../controllers/meritListController');

const router = express.Router();

// All routes require authentication; merit lists are for staff only.
router.use(protect);
router.use(authorize('teacher', 'admin'));

// @route   GET /api/merit-list/:className?term=Term 1&year=2026
// @desc    Term Examination & Assessment Merit Schedule (JSON)
router.get('/:className', getMeritList);

// @route   GET /api/merit-list/:className/pdf?term=Term 1&year=2026
// @desc    Merit list PDF download
router.get('/:className/pdf', downloadMeritListPdf);

// @route   GET /api/merit-list/:className/excel?term=Term 1&year=2026
// @desc    Merit list Excel (XLSX) download
router.get('/:className/excel', downloadMeritListExcel);

module.exports = router;
