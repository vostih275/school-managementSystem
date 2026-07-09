const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { addGrade, getStudentGrades, updateGrade, deleteGrade } = require('../controllers/gradesController');

const gradesRouter = express.Router();

// Add Grade (Only for Teachers)
gradesRouter.post('/', protect, authorize('Teacher'), addGrade);

// Get Student Grades (For Students & Teachers)
gradesRouter.get('/', protect, authorize('Student', 'Teacher'), getStudentGrades);

// Update Grade (Only for Teachers)
gradesRouter.put('/:id', protect, authorize('Teacher'), updateGrade);

// Delete Grade (Only for Teachers)
gradesRouter.delete('/:id', protect, authorize('Teacher'), deleteGrade);

module.exports = gradesRouter;
