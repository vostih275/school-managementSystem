const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getTeacherProfile, updateTeacherProfile } = require('../controllers/teacherController');
const Class = require('../models/Class');
const User = require('../models/User');

const router = express.Router();

// Get Teacher Profile
router.get('/profile', protect, authorize('Teacher'), getTeacherProfile);

// Update Teacher Profile
router.put('/profile', protect, authorize('Teacher'), updateTeacherProfile);

// @route   GET /api/teachers/:id/classes
// @desc    Return the list of class names assigned to a teacher.
//          First tries the Class collection (teacherInCharge); falls back to
//          distinct class values on student User documents if no Class records exist.
// @access  Private (Teacher / Admin)
router.get('/:id/classes', protect, authorize('Teacher', 'admin'), async (req, res) => {
    try {
        const teacherId = req.params.id;

        // Query Class collection for classes where this teacher is in charge
        let classNames = await Class.find({ teacherInCharge: teacherId })
            .distinct('name');

        // Fallback: query by teacher name string match if no ObjectId match found
        if (!classNames.length) {
            const teacher = await User.findById(teacherId).select('name');
            if (teacher) {
                classNames = await Class.find({ teacherInCharge: teacher.name })
                    .distinct('name');
            }
        }

        // Second fallback: return all distinct classes that have enrolled students
        // (useful when Class collection is empty / not yet seeded)
        if (!classNames.length) {
            classNames = await User.find({ role: 'student' }).distinct('class');
            classNames = classNames.filter(Boolean).sort();
        }

        res.json({ success: true, classes: classNames });
    } catch (error) {
        console.error('Error fetching teacher classes:', error);
        res.status(500).json({ success: false, message: 'Server error fetching classes' });
    }
});

module.exports = router;
