const Teacher = require('../models/Teacher');
const User = require('../models/User');
const { generateTeacherCredentials } = require('../utils/teacherCredentials');

// GET /api/teachers/count
exports.getTeacherCount = async (req, res) => {
  try {
    const count = await User.countDocuments({ role: 'teacher' });
    res.json({ success: true, count });
  } catch (err) {
    console.error('Error in getTeacherCount:', err);
    res.status(500).json({ success: false, message: 'Failed to count teachers' });
  }
};

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
    const { name, phone, classTeacher, subjects } = req.body;
    const { email, password } = generateTeacherCredentials(name);

    // Prevent duplicate teacher accounts
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(409).json({ success: false, message: `Teacher with email ${email} already exists` });
    }

    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: `A User with email ${email} already exists` });
    }

    // Create the linked User authentication account (plain password is hashed by User.pre('save'))
    const user = new User({
      name,
      email,
      password,
      role: 'teacher',
      class: classTeacher || ''
    });
    await user.save();

    const teacher = new Teacher({
      name,
      email,
      phone,
      classTeacher: classTeacher || '',
      subjects: subjects || [],
      user: user._id
    });
    await teacher.save();

    res.status(201).json({
      success: true,
      teacher,
      credentials: { email, password }
    });
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
