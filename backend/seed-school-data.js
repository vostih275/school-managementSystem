require('dotenv').config();
const mongoose = require('mongoose');
const SchoolSettings = require('./models/SchoolSettings');
const Teacher = require('./models/Teacher');
const Class = require('./models/Class');
const TimetableSlot = require('./models/TimetableSlot');

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

const TEACHER_ASSIGNMENTS = [
  {
    name: 'Mr. Enold Onduto',
    classTeacher: 'Grade 7',
    subjects: [
      { class: 'Grade 7', subject: 'Math' },
      { class: 'Grade 7', subject: 'Integrated Science' },
      { class: 'Grade 8', subject: 'Integrated Science' },
      { class: 'Grade 9', subject: 'Pre-Tech' },
      { class: 'Grade 9', subject: 'CAS' }
    ]
  },
  {
    name: 'Mr. Clifford Loperito',
    classTeacher: 'Grade 8',
    subjects: [
      { class: 'Grade 8', subject: 'CAS' },
      { class: 'Grade 9', subject: 'English' },
      { class: 'Grade 9', subject: 'SST' },
      { class: 'Grade 9', subject: 'CAS' }
    ]
  },
  {
    name: 'Mr. Kennedy Simiyu',
    classTeacher: 'Grade 9',
    subjects: [
      { class: 'Grade 7', subject: 'Eng' },
      { class: 'Grade 7', subject: 'Pre-Tech' },
      { class: 'Grade 7', subject: 'CRE' },
      { class: 'Grade 8', subject: 'Agric' },
      { class: 'Grade 8', subject: 'Pre-Tech' },
      { class: 'Grade 9', subject: 'Integrated Science' },
      { class: 'Grade 9', subject: 'Agric' },
      { class: 'Grade 9', subject: 'Pre-Tech' },
      { class: 'Grade 9', subject: 'CRE' }
    ]
  },
  {
    name: 'Mrs. Mercy Kiprop',
    subjects: [
      { class: 'Grade 7', subject: 'Kiswahili' },
      { class: 'Grade 8', subject: 'SST' },
      { class: 'Grade 9', subject: 'Kiswahili', isCoTeacher: true }
    ]
  },
  {
    name: 'Mr. Kavita Moses',
    subjects: [
      { class: 'Grade 7', subject: 'SST' },
      { class: 'Grade 7', subject: 'CAS' },
      { class: 'Grade 9', subject: 'Kiswahili', isCoTeacher: true }
    ]
  },
  {
    name: 'Mrs. Anorita Losidi',
    subjects: [
      { class: 'Grade 7', subject: 'Agriculture' },
      { class: 'Grade 9', subject: 'Integrated Science', isCoTeacher: true },
      { class: 'Grade 9', subject: 'Agric', isCoTeacher: true }
    ]
  },
  {
    name: 'Mrs. Daisy Nasambu',
    subjects: [
      { class: 'Grade 8', subject: 'English' },
      { class: 'Grade 8', subject: 'CRE' }
    ]
  },
  {
    name: 'Mr. Mark Ekai',
    subjects: [
      { class: 'Grade 8', subject: 'Kiswahili' }
    ]
  },
  {
    name: 'Mr. Evans Samia',
    subjects: [
      { class: 'Grade 9', subject: 'CAS', isCoTeacher: true }
    ]
  }
];

const CLASS_NAMES = ['Grade 7', 'Grade 8', 'Grade 9'];

(async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI not set');
    await mongoose.connect(uri, { dbName: process.env.MONGODB_NAME || 'school' });
    console.log('Connected to:', mongoose.connection.name);

    // 1. Seed/upsert school contact & institutional information
    const settings = await SchoolSettings.findOneAndUpdate(
      {},
      {
        schoolName: 'AIC LOKICHOGGIO GIRLS PRIMARY & JUNIOR SCHOOL',
        primaryEmail: 'aiclokichoggiogirlsprimaryscho@gmail.com',
        juniorSchoolEmail: 'juniorschoolaiclokichoggiogirl@gmail.com',
        schoolPhone: '0117554435',
        schoolAddress: 'Lokichoggio, Turkana County - P.O. Box 1, Lokichoggio',
        academicYear: '2026'
      },
      { new: true, upsert: true }
    );
    console.log('School settings seeded:', settings.primaryEmail, settings.schoolPhone);

    // 2. Seed/upsert teacher records
    for (const t of TEACHER_ASSIGNMENTS) {
      const teacher = await Teacher.findOneAndUpdate(
        { name: t.name },
        {
          name: t.name,
          classTeacher: t.classTeacher || '',
          subjects: t.subjects,
          isActive: true
        },
        { new: true, upsert: true }
      );
      console.log('Teacher seeded:', teacher.name, '| Class Teacher:', teacher.classTeacher || 'N/A', '| Subjects:', teacher.subjects.length);
    }

    // 3. Ensure Class records exist and set class teacher
    for (const className of CLASS_NAMES) {
      const classTeacher = TEACHER_ASSIGNMENTS.find(t => t.classTeacher === className)?.name || '';
      const cls = await Class.findOneAndUpdate(
        { name: className, academicYear: settings.academicYear },
        {
          name: className,
          level: 'Middle School',
          section: className,
          capacity: 30,
          academicYear: settings.academicYear,
          teacherInCharge: classTeacher
        },
        { new: true, upsert: true }
      );
      console.log('Class seeded:', cls.name, '| Teacher in charge:', cls.teacherInCharge);
    }

    // 4. Generate default timetable slots for Grade 7, 8 and 9
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    for (const className of CLASS_NAMES) {
      // Clear existing slots for this class
      await TimetableSlot.deleteMany({ class: className });

      const slots = [];
      for (const day of days) {
        for (const period of BASE_PERIODS) {
          const isFriday = day === 'Friday';
          const isPPI = isFriday && period.lessonNumber === 1;
          const isActivity = period.lessonNumber === 11;

          slots.push({
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
        }
      }
      await TimetableSlot.insertMany(slots);
      console.log(`Timetable generated for ${className}: ${slots.length} slots`);
    }

    console.log('\nAll school data seeded successfully.');
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
