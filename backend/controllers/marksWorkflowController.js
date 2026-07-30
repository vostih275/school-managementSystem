const Grade = require('../models/Grade');
const SubjectSubmission = require('../models/SubjectSubmission');
const Teacher = require('../models/Teacher');

// GET /api/marks/workflow/teacher/assignments
exports.getMySubjectAssignments = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.user.id });
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher record not found' });
    }
    res.json({
      success: true,
      assignments: teacher.subjects.map(s => ({
        class: s.class,
        subject: s.subject,
        isCoTeacher: s.isCoTeacher
      }))
    });
  } catch (err) {
    console.error('Error fetching subject assignments:', err);
    res.status(500).json({ success: false, message: 'Server error fetching assignments' });
  }
};

// GET /api/marks/workflow/subject/:className/:subject
exports.getSubjectMarks = async (req, res) => {
  try {
    const { className, subject } = req.params;
    const { term, year } = req.query;

    const filter = {
      class: className,
      subject,
      term: term || 'Term 1',
      year: Number(year) || new Date().getFullYear()
    };

    const marks = await Grade.find(filter).populate('student', 'name admissionNumber').sort({ studentName: 1 });
    const submission = await SubjectSubmission.findOne(filter).populate('teacher', 'name');

    res.json({
      success: true,
      class: className,
      subject,
      submission,
      marks
    });
  } catch (err) {
    console.error('Error fetching subject marks:', err);
    res.status(500).json({ success: false, message: 'Server error fetching subject marks' });
  }
};

// POST /api/marks/workflow/submit
exports.submitSubjectMarks = async (req, res) => {
  try {
    const { class: className, subject, term, year } = req.body;
    const recordYear = Number(year) || new Date().getFullYear();

    // Verify the teacher is assigned to this class/subject
    const teacher = await Teacher.findOne({ user: req.user.id });
    if (!teacher) {
      return res.status(403).json({ success: false, message: 'Teacher record not found' });
    }

    const isAssigned = teacher.subjects.some(s =>
      s.class === className && s.subject === subject
    );
    if (!isAssigned && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not assigned to this subject/class' });
    }

    // Upsert the subject submission record
    const submission = await SubjectSubmission.findOneAndUpdate(
      { class: className, subject, term: term || 'Term 1', year: recordYear },
      {
        $set: {
          status: 'submitted',
          submittedAt: new Date(),
          teacher: req.user.id,
          isFinalized: true
        }
      },
      { new: true, upsert: true }
    );

    // Finalize the grade records for this subject/class/term/year
    await Grade.updateMany(
      { class: className, subject, term: term || 'Term 1', year: recordYear },
      { $set: { isFinalized: true } }
    );

    res.json({ success: true, submission });
  } catch (err) {
    console.error('Error submitting subject marks:', err);
    res.status(500).json({ success: false, message: 'Server error submitting marks' });
  }
};

// POST /api/marks/workflow/lock
exports.lockSubjectMarks = async (req, res) => {
  try {
    const { class: className, subject, term, year } = req.body;
    const recordYear = Number(year) || new Date().getFullYear();

    const submission = await SubjectSubmission.findOneAndUpdate(
      { class: className, subject, term: term || 'Term 1', year: recordYear },
      {
        $set: {
          status: 'locked',
          lockedAt: new Date()
        }
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, submission });
  } catch (err) {
    console.error('Error locking subject marks:', err);
    res.status(500).json({ success: false, message: 'Server error locking marks' });
  }
};

// GET /api/marks/workflow/class/:className/overview
exports.getClassSubmissionsOverview = async (req, res) => {
  try {
    const { className } = req.params;
    const { term, year } = req.query;
    const recordYear = Number(year) || new Date().getFullYear();

    const filter = {
      class: className,
      term: term || 'Term 1',
      year: recordYear
    };

    const submissions = await SubjectSubmission.find(filter).populate('teacher', 'name').sort({ subject: 1 });
    const total = submissions.length;
    const submitted = submissions.filter(s => s.status === 'submitted').length;
    const locked = submissions.filter(s => s.status === 'locked').length;
    const draft = submissions.filter(s => s.status === 'draft').length;

    res.json({
      success: true,
      class: className,
      term: term || 'Term 1',
      year: recordYear,
      summary: { total, submitted, locked, draft },
      subjects: submissions
    });
  } catch (err) {
    console.error('Error fetching class submissions overview:', err);
    res.status(500).json({ success: false, message: 'Server error fetching overview' });
  }
};

// GET /api/marks/workflow/class/:className/marks
exports.getClassMarksOverview = async (req, res) => {
  try {
    const { className } = req.params;
    const { term, year } = req.query;
    const recordYear = Number(year) || new Date().getFullYear();

    const filter = {
      class: className,
      term: term || 'Term 1',
      year: recordYear,
      isFinalized: true
    };

    const marks = await Grade.find(filter).populate('student', 'name admissionNumber').sort({ subject: 1, studentName: 1 });

    res.json({
      success: true,
      class: className,
      term: term || 'Term 1',
      year: recordYear,
      marks
    });
  } catch (err) {
    console.error('Error fetching class marks overview:', err);
    res.status(500).json({ success: false, message: 'Server error fetching class marks' });
  }
};
