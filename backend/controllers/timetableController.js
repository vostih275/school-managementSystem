const TimetableSlot = require('../models/TimetableSlot');
const Teacher = require('../models/Teacher');

// 40-minute lessons: Lesson 1 7:30-8:10, ... Lesson 9 14:40-15:20
// Remedial: 15:20-16:00 (lessonNumber 10)
// Daily activity: 16:00-17:00 (lessonNumber 11)
const BASE_PERIODS = [
  { lessonNumber: 1, startTime: '07:30', endTime: '08:10' },
  { lessonNumber: 2, startTime: '08:10', endTime: '08:50' },
  { lessonNumber: 3, startTime: '08:50', endTime: '09:30' },
  { lessonNumber: 4, startTime: '09:30', endTime: '10:10' },
  { lessonNumber: 5, startTime: '10:10', endTime: '10:50' },
  { lessonNumber: 6, startTime: '12:00', endTime: '12:40' },
  { lessonNumber: 7, startTime: '12:40', endTime: '13:20' },
  { lessonNumber: 8, startTime: '13:20', endTime: '14:00' },
  { lessonNumber: 9, startTime: '14:40', endTime: '15:20' },
  { lessonNumber: 10, startTime: '15:20', endTime: '16:00' },
  { lessonNumber: 11, startTime: '16:00', endTime: '17:00' }
];

const DAILY_ACTIVITIES = {
  Monday: 'Games',
  Tuesday: 'Clubs & Societies',
  Wednesday: 'C.U. Service',
  Thursday: 'Guidance & Counseling',
  Friday: 'Games'
};

// GET /api/timetable/template
exports.getTemplate = (req, res) => {
  res.json({
    success: true,
    periods: BASE_PERIODS,
    fridayRule: 'Lesson 1 is reserved for PPI (Program of Pastoral Instruction); regular timetable starts from Lesson 2.',
    dailyActivities: DAILY_ACTIVITIES,
    remedial: { startTime: '15:20', endTime: '16:00' }
  });
};

// GET /api/timetable/:className
exports.getTimetable = async (req, res) => {
  try {
    const slots = await TimetableSlot.find({ class: req.params.className }).sort({ day: 1, lessonNumber: 1 });
    res.json({ success: true, class: req.params.className, slots });
  } catch (err) {
    console.error('Error fetching timetable:', err);
    res.status(500).json({ success: false, message: 'Server error fetching timetable' });
  }
};

// POST /api/timetable/:className/slots
exports.createSlot = async (req, res) => {
  try {
    const { day, lessonNumber, periodType, subject, teacher, activity, notes } = req.body;
    const period = BASE_PERIODS.find(p => p.lessonNumber === lessonNumber) || {};
    const isFriday = day === 'Friday';
    const isPPI = isFriday && lessonNumber === 1 && periodType === 'ppi';

    const slot = await TimetableSlot.create({
      class: req.params.className,
      day,
      lessonNumber,
      periodType: periodType || 'lesson',
      startTime: period.startTime || '07:30',
      endTime: period.endTime || '08:10',
      subject: isPPI ? '' : (subject || ''),
      teacher: isPPI ? null : (teacher || null),
      activity: activity || (lessonNumber === 11 ? DAILY_ACTIVITIES[day] : ''),
      isLocked: isPPI,
      notes: notes || ''
    });

    res.status(201).json({ success: true, slot });
  } catch (err) {
    console.error('Error creating timetable slot:', err);
    res.status(500).json({ success: false, message: 'Server error creating slot' });
  }
};

// PUT /api/timetable/:className/slots/:slotId
exports.updateSlot = async (req, res) => {
  try {
    const slot = await TimetableSlot.findByIdAndUpdate(req.params.slotId, req.body, { new: true, runValidators: true });
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Timetable slot not found' });
    }
    res.json({ success: true, slot });
  } catch (err) {
    console.error('Error updating timetable slot:', err);
    res.status(500).json({ success: false, message: 'Server error updating slot' });
  }
};

// DELETE /api/timetable/:className/slots/:slotId
exports.deleteSlot = async (req, res) => {
  try {
    const slot = await TimetableSlot.findByIdAndDelete(req.params.slotId);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Timetable slot not found' });
    }
    res.json({ success: true, message: 'Slot removed' });
  } catch (err) {
    console.error('Error deleting timetable slot:', err);
    res.status(500).json({ success: false, message: 'Server error deleting slot' });
  }
};

// GET /api/timetable/teacher/me
exports.getTeacherTimetable = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const teacher = await Teacher.findOne({ user: userId }).lean();
    const subjectSet = new Set();
    const classSet = new Set();
    if (teacher) {
      (teacher.subjects || []).forEach(s => {
        if (s.subject) subjectSet.add(s.subject.toLowerCase());
        if (s.class) classSet.add(s.class);
      });
    }

    const classList = Array.from(classSet);
    const query = { teacher: userId };
    if (classList.length > 0) {
      query.$or = [
        { teacher: userId },
        { class: { $in: classList } }
      ];
    }

    const rawSlots = await TimetableSlot.find(query)
      .populate('teacher', 'name')
      .sort({ day: 1, lessonNumber: 1 })
      .lean();

    const slots = rawSlots.filter(slot =>
      String(slot.teacher?._id || slot.teacher) === String(userId) ||
      (subjectSet.size > 0 && subjectSet.has((slot.subject || '').toLowerCase()))
    );

    res.json({
      success: true,
      teacher: teacher?.name || req.user?.name,
      slots
    });
  } catch (err) {
    console.error('Error fetching teacher timetable:', err);
    res.status(500).json({ success: false, message: 'Server error fetching teacher timetable' });
  }
};

// POST /api/timetable/:className/generate
exports.generateDefaultTimetable = async (req, res) => {
  try {
    const { className } = req.params;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const created = [];

    await TimetableSlot.deleteMany({ class: className });

    for (const day of days) {
      for (const period of BASE_PERIODS) {
        const isFriday = day === 'Friday';
        const isPPI = isFriday && period.lessonNumber === 1;
        const isActivity = period.lessonNumber === 11;

        const slot = await TimetableSlot.create({
          class: className,
          day,
          lessonNumber: period.lessonNumber,
          startTime: period.startTime,
          endTime: period.endTime,
          periodType: isPPI ? 'ppi' : (isActivity ? 'activity' : (period.lessonNumber === 10 ? 'remedial' : 'lesson')),
          subject: '',
          teacher: null,
          activity: isActivity ? DAILY_ACTIVITIES[day] : (isPPI ? 'PPI' : ''),
          isLocked: isPPI,
          notes: isPPI ? 'Program of Pastoral Instruction' : ''
        });

        created.push(slot);
      }
    }

    res.json({ success: true, class: className, slots: created });
  } catch (err) {
    console.error('Error generating default timetable:', err);
    res.status(500).json({ success: false, message: 'Server error generating timetable' });
  }
};
