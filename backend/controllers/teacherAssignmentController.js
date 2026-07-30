const Teacher = require('../models/Teacher');
const User = require('../models/User');

// GET /api/teachers
exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().sort({ name: 1 });
    res.json({ success: true, teachers });
  } catch (err) {
    console.error('Error fetching teachers:', err);
    res.status(500).json({ success: false, message: 'Server error fetching teachers' });
  }
};

// GET /api/teachers/assignments/me
exports.getMyAssignments = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user.id });
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher record not found' });
    }
    res.json({
      success: true,
      classTeacher: teacher.classTeacher,
      subjects: teacher.subjects
    });
  } catch (err) {
    console.error('Error fetching teacher assignments:', err);
    res.status(500).json({ success: false, message: 'Server error fetching assignments' });
  }
};

// GET /api/teachers/class/:className
exports.getTeachersByClass = async (req, res) => {
  try {
    const { className } = req.params;
    const classTeacher = await Teacher.findOne({ classTeacher: className });
    const subjectTeachers = await Teacher.find({ 'subjects.class': className });
    res.json({
      success: true,
      classTeacher,
      subjectTeachers
    });
  } catch (err) {
    console.error('Error fetching class teachers:', err);
    res.status(500).json({ success: false, message: 'Server error fetching class teachers' });
  }
};

// POST /api/teachers
exports.createTeacher = async (req, res) => {
  try {
    const { name, email, phone, classTeacher, subjects, user } = req.body;
    const teacher = new Teacher({
      name,
      email,
      phone,
      classTeacher,
      subjects: subjects || [],
      user
    });
    await teacher.save();
    res.status(201).json({ success: true, teacher });
  } catch (err) {
    console.error('Error creating teacher:', err);
    res.status(500).json({ success: false, message: 'Server error creating teacher' });
  }
};

// PUT /api/teachers/:id
exports.updateTeacher = async (req, res) => {
  try {
    const { name, email, phone, classTeacher, subjects, user, isActive } = req.body;
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, classTeacher, subjects, user, isActive },
      { new: true, runValidators: true }
    );
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    res.json({ success: true, teacher });
  } catch (err) {
    console.error('Error updating teacher:', err);
    res.status(500).json({ success: false, message: 'Server error updating teacher' });
  }
};

// DELETE /api/teachers/:id
exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    res.json({ success: true, message: 'Teacher removed' });
  } catch (err) {
    console.error('Error deleting teacher:', err);
    res.status(500).json({ success: false, message: 'Server error deleting teacher' });
  }
};
