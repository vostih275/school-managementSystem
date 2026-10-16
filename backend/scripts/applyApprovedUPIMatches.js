/**
 * Apply the teacher-approved second-name-variance matches: expand each DB
 * name to the full official form (PDF name + registered surname) and set
 * the assessmentNumber. Idempotent — safe to re-run.
 *
 * Usage: node scripts/applyApprovedUPIMatches.js   (run from backend/)
 */
const mongoose = require('mongoose');
require('dotenv').config();

const updates = [
  { adm: '185', grade: 'Grade 7', name: 'ZIPPORAH AKIPOR LONYAMAN',  assessmentNumber: 'B002576622' },
  { adm: '173', grade: 'Grade 7', name: 'LILIAN ADUKON NAKAIN',      assessmentNumber: 'B002578038' },
  { adm: '157', grade: 'Grade 7', name: 'SUNDAY NAKUWA TAWOI',       assessmentNumber: 'B002578657' },
  { adm: '156', grade: 'Grade 7', name: 'DORCAS LOSIKIRIA KOSOWA',   assessmentNumber: 'B002602178' },
  { adm: '093', grade: 'Grade 8', name: 'PAULINA ERUPE LOSURU',      assessmentNumber: 'B001553197' },
  { adm: '122', grade: 'Grade 8', name: 'MIRIAM AKAL EKUWAM',        assessmentNumber: 'B00554115' }
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGODB_NAME || 'school' });
  const users = mongoose.connection.db.collection('users');

  for (const u of updates) {
    const before = await users.findOne({ role: 'student', admissionNumber: u.adm, class: u.grade });
    if (!before) {
      console.log(`NOT FOUND: adm ${u.adm} (${u.grade}) — skipped`);
      continue;
    }
    const res = await users.updateOne(
      { _id: before._id },
      { $set: { name: u.name, assessmentNumber: u.assessmentNumber } }
    );
    console.log(`${res.modifiedCount ? 'UPDATED' : 'UNCHANGED'}: "${before.name}" -> "${u.name}" | UPI ${before.assessmentNumber || '—'} -> ${u.assessmentNumber} [adm ${u.adm}]`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
