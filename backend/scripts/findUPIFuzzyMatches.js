/**
 * Fuzzy-match the remaining unmatched UPI list entries against Grade 7/8
 * students in `users` that still have no assessmentNumber.
 *
 * Auto-applies a match only when it is unambiguous:
 *   - every token of the DB name matches a token of the PDF name
 *     (exact, <=1 edit distance, or substring), OR
 *   - whole-name Levenshtein similarity >= 0.85.
 * Everything else is printed for manual review.
 *
 * Usage: node scripts/findUPIFuzzyMatches.js [--apply-all]
 *   --apply-all also writes REPORTED matches (not recommended).
 */
const mongoose = require('mongoose');
require('dotenv').config();
const { studentData } = require('./updateAssessmentNumbers');

const APPLY_ALL = process.argv.includes('--apply-all');

const normalize = (s) => String(s || '').replace(/\s+/g, ' ').trim().toUpperCase();

const lev = (a, b) => {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[m][n];
};

const levSim = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length, 1);

// Per-token match: exact, 1 edit, or substring containment (len >= 4)
const tokenMatch = (a, b) => {
  if (a === b) return true;
  if (a.length >= 4 && b.includes(a)) return true;
  if (b.length >= 4 && a.includes(b)) return true;
  return lev(a, b) <= 1;
};

// What fraction of the DB name's tokens appear (fuzzily) in the PDF name
const coverage = (dbTokens, pdfTokens) => {
  if (!dbTokens.length) return 0;
  const hits = dbTokens.filter(dt => pdfTokens.some(pt => tokenMatch(dt, pt))).length;
  return hits / dbTokens.length;
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGODB_NAME || 'school' });
  const users = mongoose.connection.db.collection('users');

  // Official entries whose UPI is already assigned -> done, skip them
  const assigned = new Set(
    (await users.distinct('assessmentNumber', { role: 'student' })).filter(Boolean)
  );
  const unmatched = studentData.filter(r => !assigned.has(r.assessmentNumber));

  // Students still missing a UPI
  const pool = await users.find({
    role: 'student',
    class: { $in: ['Grade 7', 'Grade 8'] },
    $or: [{ assessmentNumber: { $exists: false } }, { assessmentNumber: '' }, { assessmentNumber: null }]
  }).toArray();

  console.log(`Unmatched official entries: ${unmatched.length}`);
  console.log(`DB students still without UPI: ${pool.length}\n`);

  const applied = [];
  const review = [];
  const noCandidate = [];
  const conflicts = [];
  const claimed = new Set();

  for (const record of unmatched) {
    const pdfTokens = normalize(record.name).split(' ').filter(t => t.length > 1);

    // Score every same-class candidate
    let best = null, bestScore = -1, tie = false;
    for (const s of pool) {
      if (claimed.has(String(s._id))) continue;
      if (normalize(s.class) !== normalize(record.grade)) continue;
      const dbTokens = normalize(s.name).split(' ').filter(t => t.length > 1);
      const cov = coverage(dbTokens, pdfTokens);
      const fullSim = levSim(normalize(s.name), normalize(record.name));
      const score = Math.max(cov, fullSim);
      if (score > bestScore) { best = s; bestScore = score; tie = false; }
      else if (score === bestScore) tie = true;
    }

    if (!best || tie) {
      noCandidate.push(`${record.name} (${record.grade}) — ${tie ? 'ambiguous candidates' : 'no same-grade candidate'}`);
      continue;
    }

    const apply = APPLY_ALL ||
      coverage(normalize(best.name).split(' ').filter(t => t.length > 1), pdfTokens) === 1 ||
      levSim(normalize(best.name), normalize(record.name)) >= 0.85;

    const label = `${record.name} (${record.grade})  <->  "${best.name}" [adm:${best.admissionNumber || '-'}] sim=${(bestScore * 100).toFixed(0)}%`;

    if (!apply) {
      review.push(label);
      continue;
    }

    claimed.add(String(best._id));
    try {
      await users.updateOne({ _id: best._id }, { $set: { assessmentNumber: record.assessmentNumber } });
      applied.push(`${label}  => UPI ${record.assessmentNumber}`);
    } catch (err) {
      if (err.code === 11000) conflicts.push(`${label}  => BLOCKED: UPI ${record.assessmentNumber} already assigned elsewhere`);
      else throw err;
    }
  }

  console.log(`=== APPLIED (${applied.length}) ===`);
  applied.forEach(l => console.log('  ' + l));
  console.log(`\n=== REVIEW (below confidence threshold) (${review.length}) ===`);
  review.forEach(l => console.log('  ' + l));
  if (conflicts.length) {
    console.log(`\n=== CONFLICTS (${conflicts.length}) ===`);
    conflicts.forEach(l => console.log('  ' + l));
  }
  console.log(`\n=== NO CANDIDATE (${noCandidate.length}) ===`);
  noCandidate.forEach(l => console.log('  ' + l));

  // Pool students no official entry mapped to (missing from the PDF list?)
  const unmatchedPool = pool.filter(s => !claimed.has(String(s._id)));
  if (unmatchedPool.length) {
    console.log(`\n=== DB students with no UPI and no list entry (${unmatchedPool.length}) ===`);
    unmatchedPool.forEach(s => console.log(`  ${s.name} [${s.class}, adm:${s.admissionNumber || '-'}]`));
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
