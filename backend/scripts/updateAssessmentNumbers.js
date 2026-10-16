/**
 * One-off migration: set official Assessment Numbers (UPIs) for Grade 7 & 8
 * students in the `users` collection and remove the "test student" record.
 *
 * Usage: node scripts/updateAssessmentNumbers.js   (run from backend/)
 */
const mongoose = require('mongoose');
require('dotenv').config();

const studentData = [
  // Grade 7
  { name: "IVY AJEM", assessmentNumber: "A002744789", grade: "Grade 7" },
  { name: "JENNAH AMEKWI", assessmentNumber: "A002747018", grade: "Grade 7" },
  { name: "BLESSING NJOKI", assessmentNumber: "B002154684", grade: "Grade 7" },
  { name: "MARIAN AKENO", assessmentNumber: "B002274790", grade: "Grade 7" },
  { name: "ABIGAEL NAKULEU", assessmentNumber: "B002389815", grade: "Grade 7" },
  { name: "JACKLINE AROT", assessmentNumber: "B002481832", grade: "Grade 7" },
  { name: "REBECCA NAKURA", assessmentNumber: "B002481973", grade: "Grade 7" },
  { name: "ANNET NALIWO", assessmentNumber: "B002482213", grade: "Grade 7" },
  { name: "TRAZY NACHODO", assessmentNumber: "B002530915", grade: "Grade 7" },
  { name: "FAITH NAPEDES", assessmentNumber: "B002530978", grade: "Grade 7" },
  { name: "ARENA LOBUIN", assessmentNumber: "B002531112", grade: "Grade 7" },
  { name: "EMILY ASIBITAR", assessmentNumber: "B002531176", grade: "Grade 7" },
  { name: "JANE APAS", assessmentNumber: "B002531223", grade: "Grade 7" },
  { name: "ALICE LOKONYA", assessmentNumber: "B002531297", grade: "Grade 7" },
  { name: "VICTORIA IKIMAT", assessmentNumber: "B002534183", grade: "Grade 7" },
  { name: "CYNTHIA LOKAALE", assessmentNumber: "B002541794", grade: "Grade 7" },
  { name: "BLESSING AROO", assessmentNumber: "B002544681", grade: "Grade 7" },
  { name: "FAITH DINA", assessmentNumber: "B002544806", grade: "Grade 7" },
  { name: "DORCAS AKARU", assessmentNumber: "B002544938", grade: "Grade 7" },
  { name: "CYNTHIA EKAI NANGOLOL", assessmentNumber: "B002545701", grade: "Grade 7" },
  { name: "EMILY ELIM KARENGA", assessmentNumber: "B002545911", grade: "Grade 7" },
  { name: "PEACE WANJIRO", assessmentNumber: "B002546040", grade: "Grade 7" },
  { name: "IMMECULATE AKAL", assessmentNumber: "B002546287", grade: "Grade 7" },
  { name: "JOAN LOKAALE NAPEM", assessmentNumber: "B002552819", grade: "Grade 7" },
  { name: "MARY ATABO", assessmentNumber: "B002552918", grade: "Grade 7" },
  { name: "SANDRA NAWESIO", assessmentNumber: "B002553015", grade: "Grade 7" },
  { name: "FAITH EWOTON", assessmentNumber: "B002553127", grade: "Grade 7" },
  { name: "DELINE AKIRU", assessmentNumber: "B002553708", grade: "Grade 7" },
  { name: "RUTH EKUTAN", assessmentNumber: "B002566171", grade: "Grade 7" },
  { name: "SANDRA AKIRU", assessmentNumber: "B002566243", grade: "Grade 7" },
  { name: "GLADYS AJIKON", assessmentNumber: "8007259164", grade: "Grade 7" },
  { name: "JOY LOMILO", assessmentNumber: "B002038735", grade: "Grade 7" },
  { name: "CARINA MUYA", assessmentNumber: "B002566327", grade: "Grade 7" },
  { name: "NELLY AKENO", assessmentNumber: "B002566405", grade: "Grade 7" },
  { name: "FAIZA MUHAMMED", assessmentNumber: "8002566777", grade: "Grade 7" },
  { name: "ZIPPORAH AKIPOR", assessmentNumber: "B002576622", grade: "Grade 7" },
  { name: "BERRIL ADOME", assessmentNumber: "B002576669", grade: "Grade 7" },
  { name: "SYLVIA ALACHA NAGETEI", assessmentNumber: "B002576717", grade: "Grade 7" },
  { name: "JOYCE LOTIRA", assessmentNumber: "B002576770", grade: "Grade 7" },
  { name: "AMIDA NAWI MORU", assessmentNumber: "B002576937", grade: "Grade 7" },
  { name: "MAGDALINE KELAE", assessmentNumber: "B002577107", grade: "Grade 7" },
  { name: "BETTY LOMULEN", assessmentNumber: "B002577203", grade: "Grade 7" },
  { name: "NANYUDUK KOROBE", assessmentNumber: "8002577348", grade: "Grade 7" },
  { name: "BEATRICE AKATOROT", assessmentNumber: "B002577426", grade: "Grade 7" },
  { name: "ANJELINE AYAPAN NABUIN", assessmentNumber: "8002577837", grade: "Grade 7" },
  { name: "LILIAN ADUKON", assessmentNumber: "B002578038", grade: "Grade 7" },
  { name: "ASUGURU EMURIA", assessmentNumber: "B002578126", grade: "Grade 7" },
  { name: "LILIAN IKIMAT", assessmentNumber: "B002578209", grade: "Grade 7" },
  { name: "MELVINE ORONDO", assessmentNumber: "B002578312", grade: "Grade 7" },
  { name: "SUSAN KAI", assessmentNumber: "B002578394", grade: "Grade 7" },
  { name: "SUNDAY NAKUWA", assessmentNumber: "B002578657", grade: "Grade 7" },
  { name: "DAISY ARENG", assessmentNumber: "B002587499", grade: "Grade 7" },
  { name: "SARAH AKAI", assessmentNumber: "B002592917", grade: "Grade 7" },
  { name: "PAULINE IKAI", assessmentNumber: "B002594800", grade: "Grade 7" },
  { name: "DEBRA LOKITOI", assessmentNumber: "B002602082", grade: "Grade 7" },
  { name: "NAOMI TAPAR", assessmentNumber: "B002602095", grade: "Grade 7" },
  { name: "ABIGAEL AKIRU", assessmentNumber: "B002602108", grade: "Grade 7" },
  { name: "CECILIA AKIRU", assessmentNumber: "B002602143", grade: "Grade 7" },
  { name: "MARY NASAAK IMOO", assessmentNumber: "B002602155", grade: "Grade 7" },
  { name: "SHERLYNE SHIRO", assessmentNumber: "B002602170", grade: "Grade 7" },
  { name: "DORCAS LOSIKIRIA", assessmentNumber: "B002602178", grade: "Grade 7" },
  { name: "DORCAS ACHUMAN", assessmentNumber: "B002602192", grade: "Grade 7" },
  { name: "PHOEBE IKITOE", assessmentNumber: "B002606010", grade: "Grade 7" },
  { name: "NATASHA WAMBUI", assessmentNumber: "B002758090", grade: "Grade 7" },
  { name: "REBECCA NABUIN", assessmentNumber: "B003285933", grade: "Grade 7" },
  { name: "CORRINE ADONGA", assessmentNumber: "B003309051", grade: "Grade 7" },
  { name: "SHARON IKIMAT", assessmentNumber: "8003435722", grade: "Grade 7" },
  { name: "EMMY AKIRU", assessmentNumber: "B003435787", grade: "Grade 7" },
  { name: "CANTO DAISY LOROT", assessmentNumber: "B003435846", grade: "Grade 7" },
  { name: "CYNTHIA AUREN", assessmentNumber: "B003435916", grade: "Grade 7" },
  { name: "BEATRICE AKIRU", assessmentNumber: "B003436825", grade: "Grade 7" },
  { name: "ABIGAEL NAKOSI", assessmentNumber: "B003441545", grade: "Grade 7" },
  { name: "CIARA LOMOR", assessmentNumber: "B003469574", grade: "Grade 7" },
  { name: "SHARON ASEKON", assessmentNumber: "B003469605", grade: "Grade 7" },
  { name: "FATIHI BISHAR", assessmentNumber: "8007230702", grade: "Grade 7" },

  // Grade 8
  { name: "NASRO ALI", assessmentNumber: "A001710786", grade: "Grade 8" },
  { name: "LAVENDER AKAI", assessmentNumber: "A001722094", grade: "Grade 8" },
  { name: "HAPPINESS ATOT", assessmentNumber: "A002210317", grade: "Grade 8" },
  { name: "RUTH EKALI", assessmentNumber: "A002216067", grade: "Grade 8" },
  { name: "ANGELINE ELIBIT", assessmentNumber: "A002216103", grade: "Grade 8" },
  { name: "CECILIA ALIMLIM", assessmentNumber: "A002216151", grade: "Grade 8" },
  { name: "SHEMYNIGHT LOTESIRO", assessmentNumber: "A002216163", grade: "Grade 8" },
  { name: "YVONNE ARENG", assessmentNumber: "A002216317", grade: "Grade 8" },
  { name: "AROT AMINA", assessmentNumber: "A002216331", grade: "Grade 8" },
  { name: "CHWERIA ABDI", assessmentNumber: "A002216369", grade: "Grade 8" },
  { name: "SELINA ARUKUDI", assessmentNumber: "A002216416", grade: "Grade 8" },
  { name: "ANGELINE EWOI", assessmentNumber: "A002216416", grade: "Grade 8" },
  { name: "SYLVIA ALELE", assessmentNumber: "A002216489", grade: "Grade 8" },
  { name: "HARMONY A. EMERI", assessmentNumber: "A002248559", grade: "Grade 8" },
  { name: "KEZIAH AMEYAN", assessmentNumber: "B001522493", grade: "Grade 8" },
  { name: "ZENA EJORE ARII", assessmentNumber: "B001534778", grade: "Grade 8" },
  { name: "PATRICIA APEYON", assessmentNumber: "B001552718", grade: "Grade 8" },
  { name: "BLESSING TIOKO", assessmentNumber: "B001552741", grade: "Grade 8" },
  { name: "ZIPPORAH ETAAN", assessmentNumber: "B001552813", grade: "Grade 8" },
  { name: "LAVENTA LOROT", assessmentNumber: "B001552838", grade: "Grade 8" },
  { name: "MERCY ARUKUDI", assessmentNumber: "B001552863", grade: "Grade 8" },
  { name: "SABINA ECHOTO", assessmentNumber: "B001552889", grade: "Grade 8" },
  { name: "ASHA R. ABDIKADIR", assessmentNumber: "B001552889", grade: "Grade 8" },
  { name: "NOEL OROKO", assessmentNumber: "B001552979", grade: "Grade 8" },
  { name: "VIOLA NAMEJA", assessmentNumber: "B001553072", grade: "Grade 8" },
  { name: "LEAH LOCHAMPA", assessmentNumber: "B001553105", grade: "Grade 8" },
  { name: "LAUREEN EPONG", assessmentNumber: "B001553133", grade: "Grade 8" },
  { name: "REGINA LOSIKE", assessmentNumber: "B001553165", grade: "Grade 8" },
  { name: "PAULINA ERUPE", assessmentNumber: "B001553197", grade: "Grade 8" },
  { name: "VALENTINE AKIRU", assessmentNumber: "B001553232", grade: "Grade 8" },
  { name: "SCHOLAR EMORU", assessmentNumber: "B001553252", grade: "Grade 8" },
  { name: "PHANICE ADIAMBO", assessmentNumber: "B001553290", grade: "Grade 8" },
  { name: "RISPER LOSURU", assessmentNumber: "B001553341", grade: "Grade 8" },
  { name: "YASMIN AMURIA", assessmentNumber: "B001553379", grade: "Grade 8" },
  { name: "AKAI LOKAALE", assessmentNumber: "B001553379", grade: "Grade 8" },
  { name: "MARY M. AGULE", assessmentNumber: "B001553548", grade: "Grade 8" },
  { name: "SHIRLEEN KONGOR", assessmentNumber: "B001553631", grade: "Grade 8" },
  { name: "FELISTAS ANGOLAN", assessmentNumber: "B001553654", grade: "Grade 8" },
  { name: "BLESSING AKAMAIS", assessmentNumber: "B001553734", grade: "Grade 8" },
  { name: "TABITHA AWESIT", assessmentNumber: "B001553811", grade: "Grade 8" },
  { name: "MELVIS NAFULA", assessmentNumber: "B001553888", grade: "Grade 8" },
  { name: "NATOME LOTER", assessmentNumber: "B001553981", grade: "Grade 8" },
  { name: "JOYCE AKUWAM", assessmentNumber: "B001554008", grade: "Grade 8" },
  { name: "FELISTAS AKAI", assessmentNumber: "B001554033", grade: "Grade 8" },
  { name: "DOREEN LOWOI", assessmentNumber: "B001554088", grade: "Grade 8" },
  { name: "MIRIAM AKAL", assessmentNumber: "800554115", grade: "Grade 8" },
  { name: "VIVIAN E. AWOI", assessmentNumber: "B001554130", grade: "Grade 8" },
  { name: "CAREN KAMAR", assessmentNumber: "B001554146", grade: "Grade 8" },
  { name: "VIONA WAKASA", assessmentNumber: "B001690619", grade: "Grade 8" },
  { name: "JANE EWOTON", assessmentNumber: "B001750319", grade: "Grade 8" },
  { name: "DORCAS AKARU", assessmentNumber: "B002339303", grade: "Grade 8" },
  { name: "MELVIN ASINYEN", assessmentNumber: "B003436930", grade: "Grade 8" },
  { name: "FAITH KAKWAKIPI", assessmentNumber: "B005006709", grade: "Grade 8" },
  { name: "DINNAR ALIM EMANMAN", assessmentNumber: "B001720681", grade: "Grade 8" }
];

const normalize = (s) => String(s || '').replace(/\s+/g, ' ').trim().toUpperCase();

// Classic Levenshtein distance on normalized strings
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

const tokenSet = (s) => new Set(normalize(s).split(' ').filter(t => t.length > 1));
const isSubset = (small, big) => [...small].every(t => big.has(t));

async function updateAndClean() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGODB_NAME || 'school' });
  const users = mongoose.connection.db.collection('users');

  // 1. Delete the test student
  const deleteRes = await users.deleteMany({
    role: 'student',
    $or: [
      { admissionNumber: '1000' },
      { name: { $regex: /test student/i } }
    ]
  });
  console.log(`Deleted ${deleteRes.deletedCount} test student(s).`);

  // 2. Load all Grade 7/8 students, grouped per class for scoped matching
  const students = await users.find({ role: 'student', class: { $in: ['Grade 7', 'Grade 8'] } }).toArray();
  const claimed = new Set(); // _id of students already matched by a fuzzy pass

  // Resolve one list record to a student doc within its class, or null.
  // mode: 'exact' | 'subset' | 'fuzzy'
  const resolve = (record, mode) => {
    const pool = students.filter(s =>
      normalize(s.class) === normalize(record.grade) && !claimed.has(String(s._id)));
    const key = normalize(record.name);

    if (mode === 'exact') {
      const m = pool.filter(s => normalize(s.name) === key);
      return m.length === 1 ? m[0] : null;
    }

    if (mode === 'subset') {
      const recTokens = tokenSet(record.name);
      const m = pool.filter(s => {
        const dbTokens = tokenSet(s.name);
        return isSubset(recTokens, dbTokens) || isSubset(dbTokens, recTokens);
      });
      return m.length === 1 ? m[0] : null;
    }

    // fuzzy: best Levenshtein within class, distance <= 3, first-name token close
    let best = null, bestDist = Infinity;
    const firstToken = key.split(' ')[0];
    for (const s of pool) {
      const d = lev(normalize(s.name), key);
      const dbFirst = normalize(s.name).split(' ')[0];
      if (d < bestDist && d <= 3 && lev(dbFirst, firstToken) <= 1) {
        best = s; bestDist = d;
      } else if (d === bestDist) {
        best = null; // tie — ambiguous
      }
    }
    return best;
  };

  let updatedCount = 0;
  let alreadySet = 0;
  const notFound = [];
  const ambiguous = [];
  const fuzzyApplied = [];

  for (const mode of ['exact', 'subset', 'fuzzy']) {
    for (const record of studentData) {
      if (record._done) continue;
      const student = resolve(record, mode);
      if (!student) continue;
      record._done = true;
      record._student = student;
      claimed.add(String(student._id));
      if (mode !== 'exact') fuzzyApplied.push(`${record.name}  ->  DB: "${student.name}" [${student.class}, adm:${student.admissionNumber || '-'}] (${mode})`);
    }
  }

  for (const record of studentData) {
    const student = record._student;
    if (!student) {
      notFound.push(`${record.name} (${record.grade})`);
      continue;
    }

    if (student.assessmentNumber === record.assessmentNumber) {
      alreadySet++;
      continue;
    }

    try {
      await users.updateOne({ _id: student._id }, { $set: { assessmentNumber: record.assessmentNumber } });
      updatedCount++;
    } catch (err) {
      if (err.code === 11000) {
        ambiguous.push(`${record.name} (UPI ${record.assessmentNumber} already assigned to another student)`);
      } else {
        throw err;
      }
    }
  }

  console.log(`Updated: ${updatedCount} | Already correct: ${alreadySet}`);
  if (fuzzyApplied.length) {
    console.log(`\nFuzzy/subset matches applied — PLEASE VERIFY (${fuzzyApplied.length}):`);
    fuzzyApplied.forEach(n => console.log(`  - ${n}`));
  }
  if (notFound.length) {
    console.log(`\nNot found in DB (${notFound.length}):`);
    notFound.forEach(n => console.log(`  - ${n}`));
  }
  if (ambiguous.length) {
    console.log(`\nSkipped - ambiguous/mismatch (${ambiguous.length}):`);
    ambiguous.forEach(n => console.log(`  - ${n}`));
  }

  await mongoose.disconnect();
  process.exit(0);
}

if (require.main === module) {
  updateAndClean().catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
  });
}

module.exports = { studentData };
