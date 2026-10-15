/**
 * meritListService.js
 * -------------------
 * Builds the "Term Examination & Assessment Merit Schedule" (class mark list)
 * for a class/term/year: per-student subject scores, totals, mean score,
 * class position and CBC performance indicator.
 *
 * Also renders the merit list to HTML (for the PDF download) via the shared
 * Puppeteer browser in cbcReportService.
 */
const User = require('../models/User');
const Grade = require('../models/Grade');
const SchoolSettings = require('../models/SchoolSettings');
const { JUNIOR_SECONDARY_SUBJECTS } = require('../config/subjects');
const {
    detectGradingScale,
    percentageToTier,
    FOUR_TIER_LABELS
} = require('../utils/cbcGradingEngine');
const { getBrowser } = require('./cbcReportService');

// Primary (4-tier) rubric thresholds — mirrors models/Grade.js
const percentageToPrimaryRubric = (p) => {
    if (p === null || p === undefined || isNaN(p)) return null;
    if (p >= 80) return 'EE';
    if (p >= 65) return 'ME';
    if (p >= 50) return 'AE';
    return 'BE';
};

const escapeHtml = (str = '') => String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const round2 = (v) => Math.round(v * 100) / 100;

/** Average of a grade record's 4 assessment slots (or its stored subjectAverage). */
const gradeScore = (g) => {
    if (typeof g.subjectAverage === 'number' && !isNaN(g.subjectAverage)) return g.subjectAverage;
    const vals = [g.assessments?.ass1, g.assessments?.ass2, g.assessments?.ass3, g.assessments?.ass4]
        .filter(v => typeof v === 'number' && !isNaN(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};

/** Order subject names by official JSS code, then alphabetically. */
const orderSubjects = (names) => {
    const codeFor = (name) => {
        const hit = JUNIOR_SECONDARY_SUBJECTS.find(s => s.name.toLowerCase() === String(name).toLowerCase());
        return hit ? parseInt(hit.code, 10) : Infinity;
    };
    return [...names].sort((a, b) => {
        const ca = codeFor(a), cb = codeFor(b);
        if (ca !== cb) return ca - cb;
        return String(a).localeCompare(String(b));
    });
};

/** Attach KNEC paper code + short label to a subject name (e.g. English -> 901 ENG). */
const subjectMeta = (name) => {
    const hit = JUNIOR_SECONDARY_SUBJECTS.find(s => s.name.toLowerCase() === String(name).toLowerCase());
    return {
        key: name,
        label: name,
        code: hit ? hit.code : '',
        short: hit ? hit.shortName : String(name).replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase()
    };
};

/** Level Points (1-8) for a JSS subject score — the `points` field of the KJSEA tier map. */
const scoreToLevelPoints = (score) => {
    const tier = percentageToTier(score);
    return tier ? tier.points : null;
};

/** Overall LEVEL string in KNEC grid style, e.g. "M.E 1". */
const formatLevel = (tier) => (tier ? `${tier.code.split('').join('.')} ${tier.suffix}` : null);

/**
 * Assemble the merit list for a class/term/year.
 * @returns {Promise<object|null>} null when the class has no students.
 */
const buildMeritList = async (className, term, year) => {
    const yearMatch = String(year ?? '').match(/\d{4}/);
    const recordYear = yearMatch ? Number(yearMatch[0]) : new Date().getFullYear();
    const termString = /^term/i.test(String(term)) ? String(term) : `Term ${term}`;

    const [students, grades, settings] = await Promise.all([
        User.find({
            role: 'student',
            $or: [{ class: className }, { 'profile.class': className }]
        }).select('name admissionNumber assessmentNumber class').lean(),
        Grade.find({ class: className, term: termString, year: recordYear }).lean(),
        SchoolSettings.findOne().lean()
    ]);

    if (!students.length) return null;

    const subjectNames = orderSubjects([...new Set(grades.map(g => g.subject).filter(Boolean))]);
    const subjects = subjectNames.map(subjectMeta);

    // Group grades per student
    const byStudent = new Map();
    for (const g of grades) {
        const sid = String(g.student);
        if (!byStudent.has(sid)) byStudent.set(sid, {});
        const score = gradeScore(g);
        if (score !== null) byStudent.get(sid)[g.subject] = round2(score);
    }

    const isJss = detectGradingScale(className) !== 'primary';

    const rows = students.map(s => {
        const scores = byStudent.get(String(s._id)) || {};
        const scored = subjectNames.map(n => scores[n]).filter(v => typeof v === 'number');
        const totalMarks = scored.length ? round2(scored.reduce((a, b) => a + b, 0)) : 0;
        const meanScore = scored.length ? round2(totalMarks / scored.length) : null;

        // Per-subject Level Points (JSS only — primary uses the 4-tier rubric)
        const lp = {};
        let aggregatePoints = null;
        if (isJss) {
            let sum = 0;
            let counted = 0;
            for (const name of subjectNames) {
                const v = scores[name];
                const points = typeof v === 'number' ? scoreToLevelPoints(v) : null;
                lp[name] = points;
                if (points !== null) { sum += points; counted++; }
            }
            aggregatePoints = counted ? sum : null;
        }

        let indicator = null;
        let level = null;
        if (meanScore !== null) {
            if (isJss) {
                const tier = percentageToTier(meanScore);
                indicator = tier ? { code: `${tier.code}${tier.suffix}`, label: tier.label } : null;
                level = formatLevel(tier);
            } else {
                const rubric = percentageToPrimaryRubric(meanScore);
                indicator = rubric ? { code: rubric, label: FOUR_TIER_LABELS[rubric] } : null;
                level = rubric;
            }
        }

        return {
            studentId: String(s._id),
            name: s.name || 'Unknown Student',
            admissionNumber: s.admissionNumber || '',
            assessmentNumber: s.assessmentNumber || '',
            scores,
            lp,
            subjectsOffered: scored.length,
            totalMarks,
            aggregatePoints,
            meanScore,
            level,
            indicator
        };
    });

    // Standard competition ranking (1224) on total marks — only scored students are ranked
    const ranked = rows.filter(r => r.subjectsOffered > 0);
    for (const r of ranked) {
        r.position = ranked.filter(o => o.totalMarks > r.totalMarks).length + 1;
    }
    for (const r of rows) {
        if (r.subjectsOffered === 0) r.position = null;
    }

    // Merit order: ranked students by position, unranked alphabetically at the bottom
    rows.sort((a, b) => {
        if (a.position === null && b.position === null) return a.name.localeCompare(b.name);
        if (a.position === null) return 1;
        if (b.position === null) return -1;
        return a.position - b.position || a.name.localeCompare(b.name);
    });

    return {
        schoolName: settings?.schoolName || 'AIC LOKICHOGGIO GIRLS PRIMARY & JUNIOR SCHOOL',
        className,
        term: termString,
        year: recordYear,
        gradingScale: isJss ? '8-tier' : '4-tier',
        subjects,
        students: rows,
        classSize: rows.length,
        rankedCount: ranked.length,
        generatedAt: new Date().toISOString()
    };
};

// ---------------------------------------------------------------------------
// HTML rendering (consumed by Puppeteer for the PDF download)
// ---------------------------------------------------------------------------
const buildMeritListHtml = (merit) => {
    const INDICATOR_COLORS = { EE: '#198754', ME: '#0d6efd', AE: '#fd7e14', BE: '#dc3545' };
    const levelKey = (level) => String(level || '').replace(/[^A-Za-z]/g, '').substring(0, 2);

    // Top header row: KNEC paper code + short name per subject (spans Mark | L.P)
    const subjectHeaders = merit.subjects
        .map(s => `<th class="num subj" colspan="2">${s.code ? `<span class="code">${escapeHtml(s.code)}</span> ` : ''}${escapeHtml(s.short)}<span class="subj-full">${escapeHtml(s.label)}</span></th>`)
        .join('');
    const subHeaders = merit.subjects.map(() => '<th class="num sub">Mark</th><th class="num sub">L.P</th>').join('');

    const rows = merit.students.map((st, i) => {
        const scoreCells = merit.subjects.map(s => {
            const v = st.scores[s.key];
            const p = st.lp ? st.lp[s.key] : null;
            return `<td class="num">${typeof v === 'number' ? v : '<span class="muted">—</span>'}</td>` +
                   `<td class="num lp">${p !== null && p !== undefined ? p : '<span class="muted">—</span>'}</td>`;
        }).join('');
        const key = levelKey(st.level);
        const lv = st.level
            ? `<span class="badge" style="background:${INDICATOR_COLORS[key] || '#6b7280'}">${escapeHtml(st.level)}</span>`
            : '<span class="muted">—</span>';
        return `<tr class="${i % 2 ? 'alt' : ''}">
            <td class="name">${escapeHtml(st.name)}</td>
            <td class="num">${escapeHtml(st.admissionNumber || '—')}</td>
            <td class="num">${escapeHtml(st.assessmentNumber || '—')}</td>
            ${scoreCells}
            <td class="num strong">${st.totalMarks || '—'}</td>
            <td class="num strong">${st.aggregatePoints !== null && st.aggregatePoints !== undefined ? st.aggregatePoints : '—'}</td>
            <td class="num">${lv}</td>
            <td class="num strong">${st.position || '—'}</td>
        </tr>`;
    }).join('');

    const colspan = 3 + merit.subjects.length * 2 + 4;

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI', Arial, sans-serif; font-size:8px; color:#212733; }
    .page { padding:10px 12px; }
    .head { text-align:center; border-bottom:3px double #143a66; padding-bottom:6px; margin-bottom:8px; }
    .school { font-size:14px; font-weight:700; color:#143a66; text-transform:uppercase; }
    .title { font-size:10px; font-weight:700; color:#c9a227; text-transform:uppercase; letter-spacing:1px; margin-top:2px; }
    .meta { font-size:9px; margin-top:3px; color:#374151; }
    table { width:100%; border-collapse:collapse; table-layout:fixed; }
    th { background:#143a66; color:#fff; font-size:6.5px; text-transform:uppercase; padding:3px 2px; border:1px solid #0f2c4f; text-align:center; vertical-align:middle; }
    th.subj .code { color:#c9a227; font-weight:700; }
    th.subj .subj-full { display:block; font-size:5.5px; font-weight:400; text-transform:none; color:#cdd7e5; margin-top:1px; }
    th.sub { font-size:5.5px; padding:2px 1px; background:#1d4e89; }
    td { padding:2px 2px; border:1px solid #d9e0ea; font-size:7.5px; overflow:hidden; }
    th.num, td.num { text-align:center; }
    tr.alt td { background:#f7f9fc; }
    td.name { font-weight:600; white-space:nowrap; }
    td.lp { color:#143a66; }
    td.num.strong { font-weight:700; }
    .badge { display:inline-block; padding:1px 4px; border-radius:3px; color:#fff; font-weight:700; font-size:7px; }
    .muted { color:#9ca3af; }
    .foot { margin-top:8px; font-size:7px; color:#6b7280; text-align:center; border-top:1px solid #e3e8ef; padding-top:5px; }
</style></head>
<body><div class="page">
    <div class="head">
        <div class="school">${escapeHtml(merit.schoolName)}</div>
        <div class="title">Term Examination &amp; Assessment Merit Schedule</div>
        <div class="meta">Class: <b>${escapeHtml(merit.className)}</b> &nbsp;|&nbsp; ${escapeHtml(merit.term)} &nbsp;|&nbsp; Year: <b>${merit.year}</b> &nbsp;|&nbsp; Candidates ranked: ${merit.rankedCount} of ${merit.classSize}</div>
    </div>
    <table>
        <thead>
            <tr>
                <th rowspan="2" style="width:120px">Student Name</th>
                <th rowspan="2" class="num" style="width:38px">Adm. No.</th>
                <th rowspan="2" class="num" style="width:64px">Assess. No. (UPI)</th>
                ${subjectHeaders}
                <th rowspan="2" class="num" style="width:38px">TOTAL</th>
                <th rowspan="2" class="num" style="width:30px">AG.P</th>
                <th rowspan="2" class="num" style="width:42px">LEVEL</th>
                <th rowspan="2" class="num" style="width:28px">POS</th>
            </tr>
            <tr>${subHeaders}</tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="${colspan}" class="muted" style="text-align:center">No students or marks recorded.</td></tr>`}</tbody>
    </table>
    <div class="foot">Confidential — generated ${new Date(merit.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} by the school management system. L.P = Level Points (E.E1=8 … B.E2=1) | Levels: E.E = Exceeding Expectation, M.E = Meeting Expectation, A.E = Approaching Expectation, B.E = Below Expectation.</div>
</div></body></html>`;
};

/** Render the merit list HTML to a PDF Buffer (landscape A4). */
const generateMeritListPdf = async (merit) => {
    const html = buildMeritListHtml(merit);
    const browser = await getBrowser();
    let page = null;
    try {
        page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
        return await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: { top: '10mm', right: '8mm', bottom: '10mm', left: '8mm' }
        });
    } finally {
        if (page) { try { await page.close(); } catch (e) { /* already closed */ } }
    }
};

module.exports = { buildMeritList, buildMeritListHtml, generateMeritListPdf };
