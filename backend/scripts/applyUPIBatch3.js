/**
 * Final UPI adjustments:
 *  - Delete VIVIAN EPUR (Grade 7, adm 207)
 *  - Asha Abdiraman (adm 126) -> UPI B001552932
 *  - Sabina Achoto (adm 140) -> UPI B001552889 (restored after the
 *    duplicate official-list entry was resolved)
 *
 * Usage: node scripts/applyUPIBatch3.js   (run from backend/)
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGODB_NAME || 'school' });
  const users = mongoose.connection.db.collection('users');

  // 1. Delete Vivian Epur
  const del = await users.deleteOne({ role: 'student', admissionNumber: '207', class: 'Grade 7' });
  console.log(`Deleted VIVIAN EPUR (adm 207): ${del.deletedCount} record(s)`);

  // 2. UPI updates — Asha first (frees B001552889), then Sabina
  for (const [adm, grade, upi] of [
    ['126', 'Grade 8', 'B001552932'],
    ['140', 'Grade 8', 'B001552889']
  ]) {
    const s = await users.findOne({ role: 'student', admissionNumber: adm, class: grade });
    if (!s) { console.log(`NOT FOUND: adm ${adm} (${grade}) — skipped`); continue; }
    const res = await users.updateOne({ _id: s._id }, { $set: { assessmentNumber: upi } });
    console.log(`${res.modifiedCount ? 'UPDATED' : 'UNCHANGED'}: "${s.name}" | UPI ${s.assessmentNumber || '—'} -> ${upi} [adm ${adm}]`);
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
