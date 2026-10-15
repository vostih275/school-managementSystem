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
    const subjects = subjectNames.map(name => ({ key: name, label: name }));

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

        let indicator = null;
        if (meanScore !== null) {
            if (isJss) {
                const tier = percentageToTier(meanScore);
                indicator = tier ? { code: `${tier.code}${tier.suffix}`, label: tier.label } : null;
            } else {
                const rubric = percentageToPrimaryRubric(meanScore);
                indicator = rubric ? { code: rubric, label: FOUR_TIER_LABELS[rubric] } : null;
            }
        }

        return {
            studentId: String(s._id),
            name: s.name || 'Unknown Student',
            admissionNumber: s.admissionNumber || '',
            assessmentNumber: s.assessmentNumber || '',
            scores,
            subjectsOffered: scored.length,
            totalMarks,
            meanScore,
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

    const subjectHeaders = merit.subjects
        .map(s => `<th class="num">${escapeHtml(s.label)}</th>`).join('');

    const rows = merit.students.map((st, i) => {
        const scoreCells = merit.subjects.map(s => {
            const v = st.scores[s.key];
            return `<td class="num">${typeof v === 'number' ? v : '<span class="muted">—</span>'}</td>`;
        }).join('');
        const ind = st.indicator;
        const indBadge = ind
            ? `<span class="badge" style="background:${INDICATOR_COLORS[ind.code.substring(0, 2)] || '#6b7280'}">${escapeHtml(ind.code)}</span> <span class="ind-label">${escapeHtml(ind.label)}</span>`
            : '<span class="muted">—</span>';
        return `<tr class="${i % 2 ? 'alt' : ''}">
            <td class="num strong">${st.position || '—'}</td>
            <td class="name">${escapeHtml(st.name)}</td>
            <td class="num">${escapeHtml(st.admissionNumber || '—')}</td>
            <td class="num">${escapeHtml(st.assessmentNumber || '—')}</td>
            ${scoreCells}
            <td class="num strong">${st.totalMarks || '—'}</td>
            <td class="num strong">${st.meanScore !== null ? st.meanScore : '—'}</td>
            <td class="ind">${indBadge}</td>
        </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI', Arial, sans-serif; font-size:9px; color:#212733; }
    .page { padding:14px 18px; }
    .head { text-align:center; border-bottom:3px double #143a66; padding-bottom:8px; margin-bottom:10px; }
    .school { font-size:15px; font-weight:700; color:#143a66; text-transform:uppercase; }
    .title { font-size:11px; font-weight:700; color:#c9a227; text-transform:uppercase; letter-spacing:1px; margin-top:3px; }
    .meta { font-size:10px; margin-top:4px; color:#374151; }
    table { width:100%; border-collapse:collapse; }
    th { background:#143a66; color:#fff; font-size:8px; text-transform:uppercase; padding:5px 4px; border:1px solid #143a66; text-align:left; }
    th.num, td.num { text-align:center; }
    td { padding:4px; border:1px solid #e3e8ef; font-size:9px; }
    tr.alt td { background:#f7f9fc; }
    td.name { font-weight:600; }
    td.num.strong { font-weight:700; }
    .badge { display:inline-block; padding:1px 5px; border-radius:3px; color:#fff; font-weight:700; font-size:8px; }
    .ind-label { font-size:8px; color:#374151; }
    .muted { color:#9ca3af; }
    .foot { margin-top:12px; font-size:7.5px; color:#6b7280; text-align:center; border-top:1px solid #e3e8ef; padding-top:6px; }
</style></head>
<body><div class="page">
    <div class="head">
        <div class="school">${escapeHtml(merit.schoolName)}</div>
        <div class="title">Term Examination &amp; Assessment Merit Schedule</div>
        <div class="meta">Class: <b>${escapeHtml(merit.className)}</b> &nbsp;|&nbsp; ${escapeHtml(merit.term)} &nbsp;|&nbsp; Year: <b>${merit.year}</b> &nbsp;|&nbsp; Candidates ranked: ${merit.rankedCount} of ${merit.classSize}</div>
    </div>
    <table>
        <thead><tr>
            <th class="num">Pos.</th><th>Student Name</th><th class="num">Adm. No.</th><th class="num">Assessment No. (UPI)</th>${subjectHeaders}<th class="num">Total</th><th class="num">Mean</th><th>Performance Indicator</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="20" class="muted" style="text-align:center">No students or marks recorded.</td></tr>'}</tbody>
    </table>
    <div class="foot">Confidential — generated ${new Date(merit.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} by the school management system. Indicators: EE = Exceeding Expectation, ME = Meeting Expectation, AE = Approaching Expectation, BE = Below Expectation.</div>
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
