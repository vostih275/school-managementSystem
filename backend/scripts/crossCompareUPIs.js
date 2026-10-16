/**
 * Cross-compare leftover (unassigned) official-list UPIs against Grade 7/8
 * DB students that still have no assessmentNumber.
 *
 * Auto-applies when unambiguous:
 *   - strong first-name token match AND exactly one plausible candidate
 *     left in that grade ("second-name variance"), OR
 *   - the existing high-confidence rules from findUPIFuzzyMatches.js
 *     (full DB-name token coverage, or whole-name sim >= 0.85).
 *
 * PDF entries whose UPI is already held by a different student are
 * diagnosed but NOT re-assigned.
 *
 * Usage: node scripts/crossCompareUPIs.js [--dry-run]
 */
const mongoose = require('mongoose');
require('dotenv').config();
const { studentData } = require('./updateAssessmentNumbers');

const DRY_RUN = process.argv.includes('--dry-run');

const normalize = (s) => String(s || '').replace(/\s+/g, ' ').trim().toUpperCase();
const tokens = (s) => normalize(s).split(' ').filter(t => t.length > 1);

const lev = (a, b) => {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
};
const levSim = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length, 1);

const tokenMatch = (a, b) =>
  a === b ||
  (a.length >= 4 && b.includes(a)) ||
  (b.length >= 4 && a.includes(b)) ||
  lev(a, b) <= 1;

const coverage = (dbToks, pdfToks) =>
  dbToks.length ? dbToks.filter(dt => pdfToks.some(pt => tokenMatch(dt, pt))).length / dbToks.length : 0;

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGODB_NAME || 'school' });
  const users = mongoose.connection.db.collection('users');

  const all = await users.find({ role: 'student', class: { $in: ['Grade 7', 'Grade 8'] } }).toArray();
  const pool = all.filter(s => !s.assessmentNumber);
  const holders = new Map(); // upi -> holder
  for (const s of all) if (s.assessmentNumber) holders.set(s.assessmentNumber, s);

  // Leftover PDF entries: name not yet satisfied. An entry counts as
  // satisfied if its UPI is held AND the holder's name matches (the
  // name-variance assignments still "hold" the UPI for this comparison).
  const leftover = studentData.filter(r => {
    const h = holders.get(r.assessmentNumber);
    return !h; // UPI not held at all
  });
  const upiTaken = studentData.filter(r => {
    const h = holders.get(r.assessmentNumber);
    return h && normalize(h.name) !== normalize(r.name);
  });

  console.log(`DB students without UPI: ${pool.length}`);
  console.log(`PDF entries with unassigned UPI: ${leftover.length}`);
  console.log(`PDF entries whose UPI is already held by a different-named student: ${upiTaken.length}\n`);

  const claimed = new Set();
  const applied = [];
  const review = [];
  const noMatch = [];

  for (const r of leftover) {
    const pdfToks = tokens(r.name);
    const sameGrade = pool.filter(s =>
      !claimed.has(String(s._id)) && normalize(s.class) === normalize(r.grade));

    // Score all same-grade candidates
    const scored = sameGrade.map(s => {
      const dbToks = tokens(s.name);
      const cov = coverage(dbToks, pdfToks);
      const revCov = coverage(pdfToks, dbToks); // PDF tokens found in DB name
      const sim = levSim(normalize(s.name), normalize(r.name));
      const firstNameMatch = dbToks.length && pdfToks.length &&
        tokenMatch(dbToks[0], pdfToks[0]);
      const surnameMatch = dbToks.slice(1).some(dt => pdfToks.slice(1).some(pt => tokenMatch(dt, pt)));
      return { s, cov, revCov, sim, firstNameMatch, surnameMatch,
               score: Math.max(cov, revCov, sim) };
    }).sort((a, b) => b.score - a.score);

    const best = scored[0];
    const fmt = `${r.assessmentNumber}  ${r.name} (${r.grade})`;

    if (!best || best.score < 0.3) {
      noMatch.push(`${fmt}  <->  no plausible candidate`);
      continue;
    }

    // Auto-apply rules
    const firstNameCandidates = scored.filter(c => c.firstNameMatch);
    const soleFirstName = firstNameCandidates.length === 1 ? firstNameCandidates[0] : null;
    const uniqueBest = scored.length === 1 || scored[1].score < best.score;

    let reason = null;
    if (best.cov === 1 || best.revCov === 1 || best.sim >= 0.85) reason = 'high-confidence name match';
    else if (soleFirstName && uniqueBest && (best.surnameMatch || best.sim >= 0.5 || soleFirstName === best))
      reason = 'sole strong first-name match in grade (second-name variance)';
    else if (sameGrade.length === 1) reason = 'only UPI-less student left in grade';

    if (reason && uniqueBest) {
      claimed.add(String(best.s._id));
      if (!DRY_RUN) {
        await users.updateOne({ _id: best.s._id }, { $set: { assessmentNumber: r.assessmentNumber } });
      }
      applied.push(`${fmt}  <->  "${best.s.name}" [adm:${best.s.admissionNumber || '-'}] sim=${(best.sim * 100).toFixed(0)}%  (${reason})${DRY_RUN ? ' [dry-run]' : ''}`);
    } else {
      const alts = scored.slice(0, 3)
        .map(c => `"${c.s.name}" [adm:${c.s.admissionNumber || '-'} sim:${(c.sim * 100).toFixed(0)}% 1st:${c.firstNameMatch ? 'Y' : 'N'} cov:${(c.cov * 100).toFixed(0)}%]`)
        .join('  |  ');
      review.push(`${fmt}  <->  ${alts}`);
    }
  }

  console.log(`=== APPLIED (${applied.length}) ===`);
  applied.forEach(l => console.log('  ' + l));
  console.log(`\n=== REVIEW — ambiguous (${review.length}) ===`);
  review.forEach(l => console.log('  ' + l));
  console.log(`\n=== NO MATCH (${noMatch.length}) ===`);
  noMatch.forEach(l => console.log('  ' + l));

  if (upiTaken.length) {
    console.log(`\n=== UPI ALREADY TAKEN (listed name never matched) (${upiTaken.length}) ===`);
    for (const r of upiTaken) {
      const h = holders.get(r.assessmentNumber);
      const gPool = pool.filter(s => normalize(s.class) === normalize(r.grade));
      const near = gPool.map(s => `${s.name} [adm:${s.admissionNumber || '-'} sim:${(levSim(normalize(s.name), normalize(r.name)) * 100).toFixed(0)}%]`)
        .sort().join('  |  ');
      console.log(`  ${r.assessmentNumber}  ${r.name} -> UPI held by "${h.name}" [adm:${h.admissionNumber || '-'}]`);
      if (near) console.log(`     remaining candidates in grade: ${near}`);
    }
  }

  const stillOpen = pool.filter(s => !claimed.has(String(s._id)));
  console.log(`\n=== DB students still without UPI (${stillOpen.length}) ===`);
  stillOpen.forEach(s => console.log(`  ${s.name} [${s.class}, adm:${s.admissionNumber || '-'}]`));

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
