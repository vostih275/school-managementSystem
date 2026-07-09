const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
    createAssessment,
    upsertCoreCompetencies,
    getStudentSummary,
    getAssessments,
    getReportCard
} = require('../controllers/cbcController');

const router = express.Router();

// All CBC routes require authentication; writes and reads restricted to teachers/admins
router.use(protect, authorize('teacher', 'admin'));

// @route   POST /api/cbc/assessments
// @desc    Record a formative or summative assessment
router.post('/assessments', createAssessment);

// @route   GET /api/cbc/assessments
// @desc    List assessments with optional filters
router.get('/assessments', getAssessments);

// @route   POST /api/cbc/competencies
// @desc    Record/update a student's core competencies for a term
router.post('/competencies', upsertCoreCompetencies);

// @route   GET /api/cbc/student/:id/summary
// @desc    Aggregated termly summary (formative + summative + competencies)
router.get('/student/:id/summary', getStudentSummary);

// @route   GET /api/cbc/report-card/:studentId
// @desc    Generate or serve a cached PDF report card
router.get('/report-card/:studentId', getReportCard);

module.exports = router;
