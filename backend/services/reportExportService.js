/**
 * reportExportService.js
 * ----------------------
 * Builds XLSX workbooks (in-memory Buffers) for:
 *   - Individual student report cards  (buildReportCardWorkbook)
 *   - Class merit / mark lists          (buildMeritListWorkbook)
 *
 * Uses the `xlsx` package already present in dependencies.
 */
const XLSX = require('xlsx');

const safe = (v) => (v === null || v === undefined || v === '' ? '' : v);
const num = (v) => (typeof v === 'number' && !isNaN(v) ? v : '');

/**
 * Build an XLSX Buffer for a single student's report card.
 * @param {object} data - payload from buildComprehensiveReportData()
 */
const buildReportCardWorkbook = (data) => {
    const wb = XLSX.utils.book_new();
    const rows = [];

    // ---- School / report header ----
    rows.push([safe(data.schoolName || 'AIC LOKICHOGGIO GIRLS PRIMARY & JUNIOR SCHOOL')]);
    rows.push(['TERMLY REPORT CARD']);
    rows.push([]);

    // ---- Student biodata ----
    rows.push(['Student Name', safe(data.student?.name)]);
    rows.push(['Admission No.', safe(data.student?.admissionNumber)]);
    rows.push(['Assessment No. (UPI)', safe(data.student?.assessmentNumber)]);
    rows.push(['Class / Grade', safe(data.student?.class)]);
    rows.push(['Term', safe(data.term), 'Year', safe(data.year)]);
    rows.push([]);

    // ---- Marks table ----
    rows.push([
        'Learning Area', 'Code',
        'ASS 1', 'ASS 2', 'ASS 3', 'ASS 4',
        'Average', 'Grade', 'Points', 'Subject Position', 'Improvement', 'Teacher'
    ]);

    for (const s of data.subjects || []) {
        const a = s.assessments || {};
        rows.push([
            safe(s.subject),
            safe(s.subjectCode),
            num(a.ass1), num(a.ass2), num(a.ass3), num(a.ass4),
            num(s.subjectAverage),
            safe(s.grade),
            num(s.points),
            s.subjectPosition ? `${s.subjectPosition} / ${s.totalStudents || ''}` : '',
            safe(s.improvement),
            safe(s.teacherInitials)
        ]);
    }

    // ---- Summary ----
    rows.push([]);
    rows.push(['Term Average', num(data.termAverage)]);
    rows.push(['Class Position', data.classPosition ? `${data.classPosition} out of ${data.totalStudents || data.classSize || ''}` : '']);
    rows.push([]);
    rows.push(["Class Teacher's Remarks", safe(data.classTeacherRemarks)]);
    rows.push(['Class Teacher', safe(data.classTeacherName)]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
        { wch: 28 }, { wch: 8 },
        { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
        { wch: 9 }, { wch: 8 }, { wch: 8 }, { wch: 16 }, { wch: 12 }, { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Report Card');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Build an XLSX Buffer for a class merit list.
 * @param {object} merit - payload from buildMeritList()
 */
const buildMeritListWorkbook = (merit) => {
    const wb = XLSX.utils.book_new();
    const rows = [];
    const merges = [];

    rows.push([safe(merit.schoolName)]);
    rows.push(['TERM EXAMINATION & ASSESSMENT MERIT SCHEDULE']);
    rows.push([`Class: ${safe(merit.className)}`, `Term: ${safe(merit.term)}`, `Year: ${safe(merit.year)}`]);
    rows.push([]);

    // ---- KNEC grid header: two rows ----
    const subjects = merit.subjects || [];
    const headerTop = ['Student Name', 'Adm. No.', 'Assessment No. (UPI)'];
    const headerSub = ['', '', ''];
    subjects.forEach(s => {
        headerTop.push(`${s.code ? s.code + ' ' : ''}${s.short || s.label}`, '');
        headerSub.push('Mark', 'L.P');
    });
    headerTop.push('TOTAL', 'AG.P', 'LEVEL', 'POS');
    headerSub.push('', '', '', '');
    rows.push(headerTop, headerSub);

    const h1 = rows.length - 2; // 0-based index of first header row
    // Merge identity + summary cells vertically across the two header rows
    const fixedCols = [0, 1, 2, 3 + subjects.length * 2, 4 + subjects.length * 2, 5 + subjects.length * 2, 6 + subjects.length * 2];
    fixedCols.forEach(c => merges.push({ s: { r: h1, c }, e: { r: h1 + 1, c } }));
    // Merge each subject pair horizontally
    subjects.forEach((s, i) => {
        const c = 3 + i * 2;
        merges.push({ s: { r: h1, c }, e: { r: h1, c: c + 1 } });
    });

    // ---- Data rows ----
    for (const st of merit.students || []) {
        const row = [safe(st.name), safe(st.admissionNumber), safe(st.assessmentNumber)];
        for (const s of subjects) {
            row.push(num(st.scores?.[s.key]), num(st.lp?.[s.key]));
        }
        row.push(num(st.totalMarks), num(st.aggregatePoints), safe(st.level), st.position || '');
        rows.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!merges'] = merges;
    ws['!cols'] = [
        { wch: 28 }, { wch: 10 }, { wch: 20 },
        ...subjects.flatMap(() => [{ wch: 7 }, { wch: 6 }]),
        { wch: 9 }, { wch: 7 }, { wch: 9 }, { wch: 6 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Merit List');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = {
    buildReportCardWorkbook,
    buildMeritListWorkbook
};
