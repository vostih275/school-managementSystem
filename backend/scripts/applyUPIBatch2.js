/**
 * Apply teacher-verified UPI assignments, name corrections, and one new
 * student record for Grades 7 & 8.
 *
 * Handles the B001552889 reassignment explicitly: the official list gave
 * the same UPI to both SABINA ECHOTO and ASHA ABDIKADIR; the teacher has
 * confirmed it belongs to ASHA ABDIRAMAN (adm 126), so it is removed from
 * Sabina (adm 140) before assignment.
 *
 * Creates CECILIA EMASE (Grade 8) as a new student with the next
 * admission number, mirroring the existing student document shape.
 *
 * Usage: node scripts/applyUPIBatch2.js   (run from backend/)
 */
const mongoose = require('mongoose');
require('dotenv').config();

// adm -> updates (name optional; omitted = keep existing name)
const updates = [
  // Grade 8
  { adm: '097', grade: 'Grade 8', name: 'SCHOLAR EMORU',           assessmentNumber: 'B001553252' },
  { adm: '121', grade: 'Grade 8',                                  assessmentNumber: 'A002216436' },
  { adm: '126', grade: 'Grade 8',                                  assessmentNumber: 'B001552889', takeFrom: '140' },
  { adm: '113', grade: 'Grade 8',                                  assessmentNumber: 'A001854300' },
  { adm: '122', grade: 'Grade 8',                                  assessmentNumber: 'B001554115' },
  { adm: '105', grade: 'Grade 8', name: 'SUSAN AKAI LOKAALE',      assessmentNumber: 'B001553522' },
  // Grade 7
  { adm: '188', grade: 'Grade 7', name: 'ABIGAEL AKALALE NAKUTAN', assessmentNumber: 'B002576838' },
  { adm: '175', grade: 'Grade 7',                                  assessmentNumber: 'B002602155' },
  { adm: '179', grade: 'Grade 7', name: 'JANET ASUGURU EMURIA',    assessmentNumber: 'B002578126' }
];

// New student addition (not previously in the database)
const newStudent = { name: 'CECILIA EMASE', grade: 'Grade 8', assessmentNumber: 'A00193323' };

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGODB_NAME || 'school' });
  const users = mongoose.connection.db.collection('users');

  for (const u of updates) {
    const student = await users.findOne({ role: 'student', admissionNumber: u.adm, class: u.grade });
    if (!student) {
      console.log(`NOT FOUND: adm ${u.adm} (${u.grade}) — skipped`);
      continue;
    }

    // Reassign a UPI currently held by another student (unique index)
    if (u.takeFrom) {
      const holder = await users.findOne({ role: 'student', admissionNumber: u.takeFrom });
      if (holder && holder.assessmentNumber === u.assessmentNumber) {
        await users.updateOne({ _id: holder._id }, { $unset: { assessmentNumber: '' } });
        console.log(`MOVED: UPI ${u.assessmentNumber} removed from "${holder.name}" (adm ${u.takeFrom}) — reassigned below`);
      }
    }

    const $set = { assessmentNumber: u.assessmentNumber };
    if (u.name) $set.name = u.name;
    const res = await users.updateOne({ _id: student._id }, { $set });
    console.log(`${res.modifiedCount ? 'UPDATED' : 'UNCHANGED'}: "${student.name}"${u.name ? ` -> "${u.name}"` : ''} | UPI ${student.assessmentNumber || '—'} -> ${u.assessmentNumber} [adm ${u.adm}, ${u.grade}]`);
  }

  // --- New student: CECILIA EMASE ---
  const existing = await users.findOne({ role: 'student', name: { $regex: /^\s*CECILIA\s+EMASE\s*$/i } });
  if (existing) {
    await users.updateOne({ _id: existing._id }, { $set: { assessmentNumber: newStudent.assessmentNumber } });
    console.log(`EXISTING: "${existing.name}" (adm ${existing.admissionNumber}) — set UPI ${newStudent.assessmentNumber}`);
  } else {
    // Next admission number — admission numbers are globally unique school-wide.
    // Exclude the >=1000 test range (e.g. adm 1001 'student one').
    const g8 = await users.find({ role: 'student' }, { projection: { admissionNumber: 1, password: 1 } }).toArray();
    const maxAdm = Math.max(...g8.map(s => parseInt(s.admissionNumber, 10)).filter(n => !isNaN(n) && n < 1000));
    const adm = String(maxAdm + 1);
    // Reuse the shared student password hash
    const sharedHash = g8.map(s => s.password).filter(Boolean).sort((a, b) =>
      g8.filter(x => x.password === b).length - g8.filter(x => x.password === a).length)[0];

    await users.insertOne({
      name: newStudent.name,
      admissionNumber: adm,
      assessmentNumber: newStudent.assessmentNumber,
      password: sharedHash,
      role: 'student',
      class: newStudent.grade,
      classAssigned: newStudent.grade,
      requiresPasswordChange: false,
      profile: { gender: 'Female', class: newStudent.grade, subjects: [], health: { allergies: [], medicalConditions: [], medications: [] } },
      completedQuizzes: []
    });
    console.log(`CREATED: "${newStudent.name}" | adm ${adm} | ${newStudent.grade} | UPI ${newStudent.assessmentNumber}`);
  }

  // Final coverage
  for (const g of ['Grade 7', 'Grade 8']) {
    const total = await users.countDocuments({ role: 'student', class: g });
    const withUpi = await users.countDocuments({ role: 'student', class: g, assessmentNumber: { $exists: true, $nin: ['', null] } });
    console.log(`${g}: ${withUpi}/${total} students have UPIs`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
