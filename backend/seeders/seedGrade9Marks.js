require('dotenv').config();
const mongoose = require('mongoose');
const Grade = require('../models/Grade');
const User = require('../models/User');

const CLASS_NAME = 'Grade 9';
const YEAR = 2026;
const SUBJECTS = [
  'English',
  'Kiswahili',
  'Maths',
  'Science',
  'Social Studies',
  'CRE',
  'Agriculture',
  'Business Studies',
  'Computer Studies'
];

function randomScore(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getStudentProfile() {
  const r = Math.random();
  if (r < 0.25) return 'low';     // weak overall
  if (r < 0.70) return 'average'; // middle
  return 'high';                  // excellent
}

function makeAssessments(profile, term) {
  const ranges = {
    low: { term1: [20, 55], term2: [25, 60] },
    average: { term1: [40, 75], term2: [45, 80] },
    high: { term1: [60, 95], term2: [65, 100] }
  };
  const key = term === 'Term 1' ? 'term1' : 'term2';
  const [min, max] = ranges[profile][key];
  return {
    ass1: randomScore(min, max),
    ass2: randomScore(min, max),
    ass3: randomScore(min, max),
    ass4: randomScore(min, max)
  };
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'school' });
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    }
    console.log('Connected to MongoDB');

    // Find students and a teacher
    const students = await User.find({ role: 'student', class: CLASS_NAME }).lean();
    if (students.length === 0) {
      console.log(`No students found for ${CLASS_NAME}`);
      await mongoose.disconnect();
      process.exit(0);
    }

    let teacher = await User.findOne({ role: { $in: ['teacher', 'admin'] } }).lean();
    if (!teacher) {
      console.log('No teacher/admin found. Cannot create grades.');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Clear old Grade 9 2026 marks so we can reseed cleanly
    const deleteRes = await Grade.deleteMany({ class: CLASS_NAME, year: YEAR });
    console.log(`Cleared ${deleteRes.deletedCount} old Grade 9 2026 marks`);

    const docs = [];
    for (const student of students) {
      const profile = getStudentProfile();
      for (const subject of SUBJECTS) {
        for (const term of ['Term 1', 'Term 2']) {
          docs.push({
            student: student._id,
            studentName: student.name,
            class: CLASS_NAME,
            subject,
            term,
            year: YEAR,
            assessments: makeAssessments(profile, term),
            teacher: teacher._id,
            teacherInitials: 'TCH',
            comments: '',
            isFinalized: false
          });
        }
      }
    }

    await Grade.create(docs);
    console.log(`Created ${docs.length} Grade 9 marks for ${students.length} students`);

    // Verify a sample
    const sample = await Grade.findOne({ class: CLASS_NAME, term: 'Term 2', year: YEAR }).lean();
    console.log('Sample grade:', {
      studentName: sample.studentName,
      subject: sample.subject,
      assessments: sample.assessments,
      subjectAverage: sample.subjectAverage,
      grade: sample.grade
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeder error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
})();
