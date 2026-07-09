const path = require('path');
const fs = require('fs').promises;
const puppeteer = require('puppeteer');
const { percentageToTier, formatTier, formatOverallGrade } = require('../utils/cbcGradingEngine');

// ---------------------------------------------------------------------------
// Puppeteer browser lifecycle (shared instance, lazily launched)
// ---------------------------------------------------------------------------
let browserInstance = null;

const getBrowser = async () => {
    if (browserInstance && browserInstance.connected) {
        return browserInstance;
    }
    // Detect Chrome on Windows
    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
    ];
    let executablePath = null;
    for (const p of chromePaths) {
        try {
            await fsp.access(p);
            executablePath = p;
            break;
        } catch (e) { /* not found */ }
    }
    browserInstance = await puppeteer.launch({
        headless: 'new',
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    return browserInstance;
};

const closeBrowser = async () => {
    if (browserInstance) {
        try { await browserInstance.close(); } catch (e) { /* already closed */ }
        browserInstance = null;
    }
};

// Ensure browser shuts down with the process
process.on('exit', () => { if (browserInstance) browserInstance.close().catch(() => {}); });

// ---------------------------------------------------------------------------
// Rating helpers for KJSEA 8-tier scale
// ---------------------------------------------------------------------------
const escapeHtml = (str = '') => String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const renderScoreWithLevel = (score) => {
    if (score === null || score === undefined || isNaN(score)) {
        return '<span class="score-empty">&mdash;</span>';
    }
    const tier = percentageToTier(score);
    const levelHtml = tier 
        ? `<span class="level-badge">${tier.points}</span>`
        : '<span class="level-empty">&mdash;</span>';
    return `<div class="score-cell"><span class="score-value">${score}</span>${levelHtml}</div>`;
};

/** Render a 4-tier rubric badge (EE / ME / AE / BE) */
const RUBRIC_COLORS = { EE: '#198754', ME: '#0d6efd', AE: '#fd7e14', BE: '#dc3545' };
const renderRubricBadge = (val) => {
    if (!val) return '<span class="score-empty">&mdash;</span>';
    const v = String(val).toUpperCase();
    const bg = RUBRIC_COLORS[v] || '#6b7280';
    return `<span style="display:inline-block;padding:2px 7px;border-radius:4px;font-weight:700;font-size:9px;color:#fff;background:${bg}">${escapeHtml(v)}</span>`;
};

const COMPETENCY_LABELS = {
    communication: 'Communication & Collaboration',
    criticalThinking: 'Critical Thinking & Problem Solving',
    creativity: 'Creativity & Imagination',
    citizenship: 'Citizenship',
    digitalLiteracy: 'Digital Literacy',
    learningToLearn: 'Learning to Learn',
    selfEfficacy: 'Self-Efficacy'
};

// ---------------------------------------------------------------------------
// HTML template - KJSEA Official Format
// ---------------------------------------------------------------------------
const buildReportHtml = ({ student, term, academicYear, gradingScale, learningAreas, summary, competencies, classTeacherRemarks, principalRemarks, attendance, logoSrc }) => {
    const schoolName = process.env.SCHOOL_NAME || 'AIC LOKICHOGGIO GIRLS PRIMARY & JUNIOR';
    const schoolContact = process.env.SCHOOL_CONTACT || 'Lokichoggio, Turkana County &bull; P.O. Box 1, Lokichoggio &bull; +254 700 000 000';
    const principalName = 'Mrs. Akiru Rebecca Lokeun';

    const is4Tier = (gradingScale || summary?.gradingScale) === '4-tier';

    // ---- Learning Area Rows ----
    let learningAreaRows;
    if (learningAreas.length === 0) {
        const cols = is4Tier ? 4 : 5;
        learningAreaRows = `<tr><td colspan="${cols}" class="center muted">No assessments recorded for this term.</td></tr>`;
    } else if (is4Tier) {
        learningAreaRows = learningAreas.map(area => `
            <tr>
                <td class="subject-cell">${escapeHtml(area.learningArea)}</td>
                <td class="score-column center">${renderRubricBadge(area.assessment1)}</td>
                <td class="score-column center">${renderRubricBadge(area.assessment2)}</td>
                <td class="score-column center">${renderRubricBadge(area.grade?.rubric)}&nbsp;<span style="font-size:8px;color:#6b7280">${escapeHtml(area.grade?.label || '')}</span></td>
            </tr>`).join('');
    } else {
        learningAreaRows = learningAreas.map(area => `
            <tr>
                <td class="subject-cell">${escapeHtml(area.learningArea)}</td>
                <td class="score-column">${renderScoreWithLevel(area.assessment1)}</td>
                <td class="score-column">${renderScoreWithLevel(area.assessment2)}</td>
                <td class="score-column">${renderScoreWithLevel(area.average)}</td>
                <td class="initial-cell">${escapeHtml(area.teacherInitial || '&mdash;')}</td>
            </tr>`).join('');
    }

    // ---- Summary rows (mode-dependent) ----
    let summaryRows;
    if (is4Tier) {
        const oc = summary.overallCompetency;
        const ocBadge = oc ? renderRubricBadge(oc.rubric) + `&nbsp;<span style="font-size:9px;color:#374151">${escapeHtml(oc.label)}</span>` : '<span class="muted">N/A</span>';
        summaryRows = `
            <tr class="summary-row">
                <td class="summary-label" colspan="3">OVERALL COMPETENCY</td>
                <td class="summary-value">${ocBadge}</td>
            </tr>`;
    } else {
        const overallGradeFormatted = summary.overallGrade ? summary.overallGrade.formatted : 'N/A';
        const classPositionText = summary.classPosition
            ? `${summary.classPosition} out of ${summary.classSize}`
            : 'N/A';
        summaryRows = `
            <tr class="summary-row">
                <td class="summary-label">TOTAL MARKS / MEAN GRADE</td>
                <td></td><td></td>
                <td class="summary-value">${summary.totalMarks} / ${overallGradeFormatted}</td>
                <td></td>
            </tr>
            <tr class="summary-row">
                <td class="summary-label">TOTAL POINTS OUT OF 8</td>
                <td></td><td></td>
                <td class="summary-value">${summary.totalPoints}</td>
                <td></td>
            </tr>
            <tr class="summary-row">
                <td class="summary-label">CLASS POSITION</td>
                <td></td><td></td>
                <td class="summary-value">${classPositionText}</td>
                <td></td>
            </tr>`;
    }

    const reportTypeLabel = is4Tier
        ? 'CBC Primary Progress Report'
        : 'KJSEA Progress Report Form';
    const footerNote = is4Tier
        ? 'Grades are based on the Kenya CBC 4-Tier Rubric Scale (EE / ME / AE / BE). Ranking by marks is not applicable for this level.'
        : 'Grades are based on the Kenya Junior Secondary Education Assessment (KJSEA) 8-Tier Scale.';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CBC Report Card - ${escapeHtml(student.name)}</title>
<style>
    :root {
        --primary: #143a66;
        --primary-light: #1d5fa8;
        --accent: #c9a227;
        --ink: #212733;
        --muted: #6b7280;
        --line: #e3e8ef;
        --paper: #ffffff;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        color: var(--ink);
        background: var(--paper);
        font-size: 11px;
        line-height: 1.4;
    }
    .page { padding: 24px 32px; }

    /* ---------- Header ---------- */
    .report-header {
        display: flex; align-items: center; gap: 16px;
        border-bottom: 3px solid var(--primary);
        padding-bottom: 14px;
    }
    .logo-wrap {
        width: 64px; height: 64px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        border-radius: 50%; background: #f1f5fb; border: 2px solid var(--line);
        overflow: hidden;
    }
    .logo-wrap img { width: 100%; height: 100%; object-fit: contain; }
    .school-meta { flex: 1; }
    .school-name {
        font-size: 18px; font-weight: 700; color: var(--primary);
        letter-spacing: 0.5px; text-transform: uppercase;
    }
    .school-contact { color: var(--muted); font-size: 9px; margin-top: 2px; }
    .school-motto { font-size: 9px; color: var(--accent); font-style: italic; margin-top: 2px; }
    .report-title { font-size: 10px; font-weight: 600; color: var(--accent); letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px; }
    .term-badge {
        text-align: center; flex-shrink: 0;
        background: var(--primary); color: #fff;
        border-radius: 8px; padding: 8px 14px;
    }
    .term-badge .year { font-size: 12px; font-weight: 700; }
    .term-badge .term { font-size: 9px; opacity: 0.85; margin-top: 2px; }

    /* ---------- Biodata ---------- */
    .biodata {
        display: grid; grid-template-columns: repeat(4, 1fr);
        gap: 10px; margin: 16px 0;
    }
    .bio-card {
        background: #f7f9fc; border: 1px solid var(--line);
        border-radius: 6px; padding: 8px 12px;
    }
    .bio-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--muted); }
    .bio-value { font-size: 11px; font-weight: 600; margin-top: 2px; }

    /* ---------- Section titles ---------- */
    .section-title {
        display: flex; align-items: center; gap: 8px;
        font-size: 11px; font-weight: 700; color: var(--primary);
        text-transform: uppercase; letter-spacing: 1px;
        margin: 18px 0 8px;
    }
    .section-title::after { content: ''; flex: 1; height: 1px; background: var(--line); }

    /* ---------- Learning areas table ---------- */
    table { width: 100%; border-collapse: collapse; }
    thead th {
        background: var(--primary); color: #fff;
        font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px;
        padding: 6px 8px; text-align: left;
        border: 1px solid var(--primary);
    }
    thead th.center, td.center { text-align: center; }
    tbody td { padding: 6px 8px; border: 1px solid var(--line); vertical-align: middle; }
    tbody tr:nth-child(even) { background: #fafbfd; }
    .subject-cell { font-weight: 600; font-size: 10px; }
    .score-column { width: 80px; }
    .score-cell { display: flex; align-items: center; gap: 6px; }
    .score-value { font-weight: 600; font-size: 10px; min-width: 28px; }
    .score-empty { color: var(--muted); }
    .level-badge {
        display: inline-block; min-width: 18px; text-align: center;
        font-weight: 700; font-size: 8px;
        padding: 2px 5px; border-radius: 4px;
        background: var(--primary); color: #fff;
    }
    .level-empty { color: var(--muted); font-size: 8px; }
    .initial-cell { font-size: 9px; font-weight: 600; text-align: center; }
    .muted { color: var(--muted); }

    /* ---------- Summary rows ---------- */
    .summary-row { background: #f0f4f8 !important; font-weight: 700; }
    .summary-row td { border: 1px solid var(--line); }
    .summary-label { color: var(--primary); }
    .summary-value { text-align: right; }

    /* ---------- Signatures ---------- */
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 20px; }
    .sig-block {
        border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px;
    }
    .sig-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--primary); }
    .sig-remarks { font-size: 9px; color: var(--muted); min-height: 28px; margin: 4px 0 10px; }
    .sig-line-row { display: flex; gap: 14px; }
    .sig-line { flex: 1; }
    .sig-line .line { border-bottom: 1px solid var(--ink); height: 18px; }
    .sig-line .caption { font-size: 7px; color: var(--muted); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.6px; }

    .footer-note {
        margin-top: 16px; text-align: center;
        font-size: 7px; color: var(--muted);
        border-top: 1px solid var(--line); padding-top: 8px;
    }
</style>
</head>
<body>
<div class="page">

    <div class="report-header">
        <div class="logo-wrap">
            <img src="${logoSrc || '/public/assets/logo.png'}" alt="School Logo" onerror="this.style.display='none'">
        </div>
        <div class="school-meta">
            <div class="school-name">${schoolName}</div>
            <div class="school-contact">${schoolContact}</div>
            <div class="school-motto"><em>&ldquo;Motto: Strive to Excel&rdquo;</em></div>
            <div class="report-title">${reportTypeLabel}</div>
        </div>
        <div class="term-badge">
            <div class="year">${escapeHtml(academicYear)}</div>
            <div class="term">Term ${term}</div>
        </div>
    </div>

    <div class="biodata">
        <div class="bio-card">
            <div class="bio-label">Student Name</div>
            <div class="bio-value">${escapeHtml(student.name)}</div>
        </div>
        <div class="bio-card">
            <div class="bio-label">Student ID</div>
            <div class="bio-value">${escapeHtml(String(student.id))}</div>
        </div>
        <div class="bio-card">
            <div class="bio-label">Class / Grade</div>
            <div class="bio-value">${escapeHtml(student.class || 'N/A')}</div>
        </div>
        <div class="bio-card">
            <div class="bio-label">Report Generated</div>
            <div class="bio-value">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
    </div>

    <div class="section-title">Learning Areas Performance</div>
    <table>
        <thead>
            <tr>
                <th>LEARNING AREA</th>
                <th class="center">ASSNT 1 MIDTERM</th>
                <th class="center">ASSNT 2 KNEC</th>
                <th class="center">${is4Tier ? 'TERM GRADE' : 'AVERAGE'}</th>
                ${is4Tier ? '' : '<th class="center">TR. INITIAL</th>'}
            </tr>
        </thead>
        <tbody>${learningAreaRows}
            ${summaryRows}
        </tbody>
    </table>

    <div class="signatures">
        <div class="sig-block">
            <div class="sig-title">Class Teacher's Remarks</div>
            <div class="sig-remarks">${escapeHtml(classTeacherRemarks || '')}</div>
            <div class="sig-line-row">
                <div class="sig-line"><div class="line"></div><div class="caption">Signature</div></div>
                <div class="sig-line"><div class="line"></div><div class="caption">Date</div></div>
            </div>
        </div>
        <div class="sig-block">
            <div class="sig-title">Principal's Remarks</div>
            <div class="sig-remarks">${escapeHtml(principalRemarks || '')}</div>
            <div class="sig-line-row">
                <div class="sig-line"><div class="line"></div><div class="caption">${escapeHtml(principalName)}</div></div>
                <div class="sig-line"><div class="line"></div><div class="caption">Date</div></div>
            </div>
        </div>
    </div>

    <div class="footer-note">
        This report card is a confidential academic document generated by ${schoolName}'s school management system.
        ${footerNote}
    </div>

</div>
</body>
</html>`;
};

// ---------------------------------------------------------------------------
// PDF generation with safe page lifecycle
// ---------------------------------------------------------------------------
// Logo resolution order:
//   1. frontend/images/logo.png  (source of truth)
//   2. backend/public/assets/logo.png  (fallback copy)
const LOGO_PATHS = [
    path.join(__dirname, '../../frontend/images/logo.png'),
    path.join(__dirname, '../public/assets/logo.png')
];

const resolveLogoSrc = async () => {
    for (const logoPath of LOGO_PATHS) {
        try {
            const buffer = await fs.readFile(logoPath);
            console.log('[PDF] Logo loaded from:', logoPath);
            return `data:image/png;base64,${buffer.toString('base64')}`;
        } catch (e) { /* try next path */ }
    }
    console.warn('[PDF] Logo not found at any known path; header will render without logo.');
    return null;
};

const generateReportPdf = async (reportData, outputPath) => {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const logoSrc = await resolveLogoSrc();
    const html = buildReportHtml({ ...reportData, logoSrc });
    const browser = await getBrowser();
    let page = null;
    try {
        page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.pdf({
            path: outputPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' }
        });
    } finally {
        if (page) {
            try { await page.close(); } catch (e) { /* page already closed */ }
        }
    }

    return outputPath;
};

module.exports = { generateReportPdf, buildReportHtml, closeBrowser };
