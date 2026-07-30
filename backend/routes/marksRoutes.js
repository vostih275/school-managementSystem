const express = require('express');
const { 
    saveMarks, 
    saveStudentMarks,
    getStudentMarks, 
    getClassMarks, 
    getSubjectMarks, 
    finalizeMarks, 
    getStudentReportCard,
    deleteStudentMarks,
    deleteStudentMarksByQuery
} = require('../controllers/marksController');
const {
    getMySubjectAssignments,
    getSubjectMarks: getWorkflowSubjectMarks,
    submitSubjectMarks,
    lockSubjectMarks,
    getClassSubmissionsOverview,
    getClassMarksOverview
} = require('../controllers/marksWorkflowController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected and require authentication
router.use(protect);

// Teacher routes
router.post('/', authorize('Teacher'), saveMarks);
router.post('/students/:studentId/marks', authorize('Teacher'), saveStudentMarks);
router.get('/class/:className', authorize('Teacher'), getClassMarks);
router.get('/subject/:subject', authorize('Teacher'), getSubjectMarks);
// Subject-teacher workflow routes
router.get('/workflow/teacher/assignments', authorize('Teacher', 'admin'), getMySubjectAssignments);
router.get('/workflow/subject/:className/:subject', authorize('Teacher', 'admin'), getWorkflowSubjectMarks);
router.post('/workflow/submit', authorize('Teacher', 'admin'), submitSubjectMarks);
router.post('/workflow/lock', authorize('Teacher', 'admin'), lockSubjectMarks);

// Class-teacher dashboard routes
router.get('/workflow/class/:className/overview', authorize('Teacher', 'admin'), getClassSubmissionsOverview);
router.get('/workflow/class/:className/marks', authorize('Teacher', 'admin'), getClassMarksOverview);

router.put('/finalize/:id', authorize('Teacher'), finalizeMarks);

// Student and Teacher routes
router.get('/student/:studentId', authorize('Student', 'Teacher'), getStudentMarks);
router.get('/report-card/:studentId', authorize('Student', 'Teacher'), getStudentReportCard);
router.delete('/:studentId/term/:term', authorize('Teacher'), deleteStudentMarks);
router.delete('/students/:studentId/marks', authorize('Teacher'), deleteStudentMarksByQuery);

module.exports = router;
