const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const Homework = require('../models/Homework');
const uploadCloudinary = require('../config/cloudinary');
const cloudinary = require('cloudinary').v2;

const router = express.Router();

// Create Homework (Only for Teachers)
router.post(
  '/',
  protect,
  authorize('teacher'),
  uploadCloudinary.single('homework-file'),
  async (req, res) => {
    try {
      const { title, description, dueDate, classAssigned } = req.body;

      // Validate required fields
      if (!title || !dueDate || !classAssigned) {
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'Please provide title, due date, and class assigned'
        });
      }

      // Cloudinary/CloudinaryStorage sets req.file.path to the full Cloudinary URL
      // and req.file.filename/public_id to the Cloudinary public_id
      const cloudinaryUrl = req.file ? req.file.path : null;
      const publicId = req.file ? (req.file.filename || req.file.public_id) : null;

      const homework = new Homework({
        title,
        description,
        dueDate: new Date(dueDate),
        classAssigned,
        teacher: req.user.id,
        file: cloudinaryUrl,
        cloudinaryPublicId: publicId
      });

      await homework.save();

      res.json({
        msg: "Homework created successfully!",
        homework
      });
    } catch (err) {
      console.error('Homework creation error:', err);
      res.status(500).json({
        error: 'Failed to create homework',
        details: err.message
      });
    }
  }
);

// Get All Homeworks (Accessible to students + teachers)
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'student') {
      const studentClass = req.user.profile?.class || req.user.class;
      if (studentClass) {
        query = { classAssigned: studentClass };
      } else {
        return res.json([]);
      }
    } else {
      // For teachers, show all homeworks they've created
      query = { teacher: req.user.id };
    }

    const homeworks = await Homework.find(query)
      .populate('teacher', 'name')
      .populate('submissions.student', 'name')
      .sort({ dueDate: 1 });
    
    res.json(homeworks);
  } catch (err) {
    console.error('Error fetching homeworks:', err);
    res.status(500).json({ 
      error: 'Failed to fetch homeworks',
      details: err.message 
    });
  }
});

// Submit Homework (Only for Students)
router.post(
  '/submit/:homeworkId',
  protect,
  authorize('student'),
  uploadCloudinary.single('submission-file'),
  async (req, res) => {
    try {
      const homework = await Homework.findById(req.params.homeworkId);
      if (!homework) {
        return res.status(404).json({ error: 'Homework not found' });
      }

      // Check if student has already submitted
      const existingSubmission = homework.submissions.find(
        sub => sub.student.toString() === req.user.id
      );

      if (existingSubmission) {
        return res.status(400).json({
          error: 'You have already submitted this homework'
        });
      }

      // Cloudinary/CloudinaryStorage sets req.file.path to the full Cloudinary URL
      // and req.file.filename/public_id to the Cloudinary public_id
      const cloudinaryUrl = req.file ? req.file.path : null;
      const publicId = req.file ? (req.file.filename || req.file.public_id) : null;

      homework.submissions.push({
        student: req.user.id,
        file: cloudinaryUrl,
        cloudinaryPublicId: publicId,
        submittedAt: new Date()
      });

      await homework.save();

      res.json({
        msg: 'Homework submitted successfully!',
        submission: homework.submissions[homework.submissions.length - 1]
      });
    } catch (err) {
      console.error('Homework submission error:', err);
      res.status(500).json({
        error: 'Failed to submit homework',
        details: err.message
      });
    }
  }
);

// Get a single homework with submissions
router.get('/:id', protect, async (req, res) => {
  try {
    const homework = await Homework.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('submissions.student', 'name email');
      
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }

    // Check if the user is the teacher who created the homework or a student who submitted it
    const isTeacher = req.user.role === 'teacher' && homework.teacher._id.toString() === req.user.id;
    const isStudent = req.user.role === 'student' && 
      homework.submissions.some(sub => sub.student._id.toString() === req.user.id);
    
    if (!isTeacher && !isStudent) {
      return res.status(403).json({ error: 'Not authorized to view this homework' });
    }

    // If student, only show their own submission
    if (req.user.role === 'student') {
      homework.submissions = homework.submissions.filter(
        sub => sub.student._id.toString() === req.user.id
      );
    }

    res.json(homework);
  } catch (err) {
    console.error('Error fetching homework:', err);
    res.status(500).json({ 
      error: 'Failed to fetch homework',
      details: err.message 
    });
  }
});

// Grade Homework (Only for Teachers)
router.put(
  '/grade/:homeworkId/:submissionId',
  protect,
  authorize('teacher'),
  async (req, res) => {
    try {
      const { grade, comments } = req.body;
      const homework = await Homework.findById(req.params.homeworkId);
      
      if (!homework) {
        return res.status(404).json({ error: 'Homework not found' });
      }

      const submission = homework.submissions.id(req.params.submissionId);
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      submission.grade = grade;
      submission.comments = comments;
      
      await homework.save();
      
      res.json({
        msg: 'Homework graded successfully!',
        submission
      });
    } catch (err) {
      console.error('Homework grading error:', err);
      res.status(500).json({
        error: 'Failed to grade homework',
        details: err.message
      });
    }
  }
);

// Delete Homework (Only for Teachers)
router.delete(
  '/:id',
  protect,
  authorize('teacher'),
  async (req, res) => {
    try {
      const homework = await Homework.findById(req.params.id);

      if (!homework) {
        return res.status(404).json({ error: 'Homework not found' });
      }

      // Delete the homework file from Cloudinary
      if (homework.cloudinaryPublicId) {
        try {
          await cloudinary.uploader.destroy(homework.cloudinaryPublicId, {
            resource_type: 'auto',
            invalidate: true
          });
        } catch (cloudinaryErr) {
          console.error('Error deleting homework file from Cloudinary:', cloudinaryErr);
        }
      }

      // Delete submission files from Cloudinary
      for (const submission of homework.submissions) {
        if (submission.cloudinaryPublicId) {
          try {
            await cloudinary.uploader.destroy(submission.cloudinaryPublicId, {
              resource_type: 'auto',
              invalidate: true
            });
          } catch (cloudinaryErr) {
            console.error('Error deleting submission file from Cloudinary:', cloudinaryErr);
          }
        }
      }

      await Homework.findByIdAndDelete(req.params.id);

      res.json({
        msg: 'Homework deleted successfully!'
      });
    } catch (err) {
      console.error('Homework deletion error:', err);
      res.status(500).json({
        error: 'Failed to delete homework',
        details: err.message
      });
    }
  }
);

module.exports = router;
