const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getTemplate,
  getTimetable,
  getTeacherTimetable,
  createSlot,
  updateSlot,
  deleteSlot,
  generateDefaultTimetable
} = require('../controllers/timetableController');

const router = express.Router();

router.use(protect);

// Get the base period template and rules
router.get('/template', getTemplate);

// Logged-in teacher's personal timetable across all grades
router.get('/teacher/me', authorize('teacher', 'admin'), getTeacherTimetable);

// Class-specific timetable
router.get('/:className', getTimetable);
router.post('/:className/generate', authorize('admin', 'teacher'), generateDefaultTimetable);
router.post('/:className/slots', authorize('admin', 'teacher'), createSlot);
router.put('/:className/slots/:slotId', authorize('admin', 'teacher'), updateSlot);
router.delete('/:className/slots/:slotId', authorize('admin', 'teacher'), deleteSlot);

module.exports = router;
