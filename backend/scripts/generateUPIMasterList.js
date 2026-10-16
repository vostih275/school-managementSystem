/**
 * Generate AIC_Lokichoggio_Girls_Detailed_UPI_Audit.xlsx
 * Two styled worksheets (Grade 7 / Grade 8) listing every student with
 * their Assessment Number (UPI), a diagnostic Status, and an explicit
 * Conflict / Diagnosis Detail explaining exactly why a row is flagged.
 *
 * Statuses: Assigned | Missing | UPI Conflict | Name Variance
 *
 * Output: <frontend>/downloads/ so the file is downloadable via the server.
 * Usage: node scripts/generateUPIMasterList.js   (run from backend/)
 */
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
require('dotenv').config();
const { studentData } = require('./updateAssessmentNumbers');

const normalize = (s) => String(s || '').replace(/\s+/g, ' ').trim().toUpperCase();

// UPI -> official list entries claiming it (detects list-side duplicates)
const upiToEntries = new Map();
for (const r of studentData) {
  if (!upiToEntries.has(r.assessmentNumber)) upiToEntries.set(r.assessmentNumber, []);
  upiToEntries.get(r.assessmentNumber).push(r);
}

// UPI -> DB students holding it (detects DB-side duplicates)
const upiToStudents = new Map();

const diagnose = (student) => {
  const upi = student.assessmentNumber;
  if (!upi) {
    return ['Missing', 'Missing UPI: No assessment number matched in official PDF list'];
  }

  // DB-side duplicate: another student holds the same UPI
  const holders = (upiToStudents.get(upi) || []).filter(h => String(h._id) !== String(student._id));
  if (holders.length) {
    return ['UPI Conflict',
      `UPI Conflict: Assessment number '${upi}' is also assigned to ${holders.map(h => `${normalize(h.name)} (Adm ${h.admissionNumber || '?'})`).join(', ')}`];
  }

  const entries = upiToEntries.get(upi);
  if (!entries || entries.length === 0) {
    return ['UPI Conflict',
      `UPI Conflict: Assessment number '${upi}' is not present in the official Grade 7/8 PDF list — needs NEMIS verification`];
  }

  if (entries.length > 1) {
    const others = entries.map(e => e.name).join(' / ');
    return ['UPI Conflict',
      `UPI Conflict: Assessment number '${upi}' is listed for multiple students on the official PDF: ${others}`];
  }

  if (normalize(entries[0].name) !== normalize(student.name)) {
    return ['Name Variance',
      `Name Variance: Matched via fuzzy logic — DB '${normalize(student.name)}' <-> PDF '${entries[0].name}'`];
  }

  return ['Assigned', 'Verified Match: Exact or high-confidence match from PDF list'];
};

const STATUS_FILL = {
  'Assigned':      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }, // light green
  'Missing':       { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4E4' } }, // light red
  'UPI Conflict':  { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8CBAD' } }, // orange
  'Name Variance': { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }  // light amber
};
const STATUS_FONT = {
  'Assigned':      { color: { argb: 'FF2E7D32' }, bold: true },
  'Missing':       { color: { argb: 'FFC62828' }, bold: true },
  'UPI Conflict':  { color: { argb: 'FFB23A00' }, bold: true },
  'Name Variance': { color: { argb: 'FF9C6500' }, bold: true }
};
const thinBorder = {
  top: { style: 'thin' }, left: { style: 'thin' },
  bottom: { style: 'thin' }, right: { style: 'thin' }
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGODB_NAME || 'school' });
  const users = mongoose.connection.db.collection('users');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'AIC Lokichoggio Girls School Management System';
  wb.created = new Date();

  for (const grade of ['Grade 7', 'Grade 8']) {
    const students = await users.find({ role: 'student', class: grade }).toArray();

    // index DB-side UPI holders before diagnosing
    for (const s of students) {
      if (!s.assessmentNumber) continue;
      if (!upiToStudents.has(s.assessmentNumber)) upiToStudents.set(s.assessmentNumber, []);
      upiToStudents.get(s.assessmentNumber).push(s);
    }

    students.sort((a, b) => {
      const na = parseInt(a.admissionNumber, 10), nb = parseInt(b.admissionNumber, 10);
      if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
      return normalize(a.name).localeCompare(normalize(b.name));
    });

    const ws = wb.addWorksheet(`${grade} Master List`, {
      views: [{ state: 'frozen', ySplit: 4 }]
    });
    ws.columns = [
      { key: 'sno', width: 6 },
      { key: 'name', width: 32 },
      { key: 'adm', width: 14 },
      { key: 'upi', width: 22 },
      { key: 'status', width: 16 },
      { key: 'detail', width: 78 }
    ];

    // Title block
    ws.mergeCells('A1:F1');
    ws.getCell('A1').value = 'AIC LOKICHOGGIO GIRLS PRIMARY & JUNIOR SCHOOL';
    ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF143A66' } };
    ws.getCell('A1').alignment = { horizontal: 'center' };

    ws.mergeCells('A2:F2');
    ws.getCell('A2').value = `${grade.toUpperCase()} — DETAILED UPI AUDIT — ${new Date().toLocaleDateString('en-GB')}`;
    ws.getCell('A2').font = { bold: true, size: 10, color: { argb: 'FF6B7280' } };
    ws.getCell('A2').alignment = { horizontal: 'center' };

    ws.addRow([]);

    // Header row
    const header = ws.addRow(['S/NO', 'Student Name (DB)', 'Admission Number', 'Assessment Number (UPI)', 'Status', 'Conflict / Diagnosis Detail']);
    header.height = 24;
    header.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF143A66' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });

    // Data rows
    let i = 0;
    const counts = { 'Assigned': 0, 'Missing': 0, 'UPI Conflict': 0, 'Name Variance': 0 };
    for (const s of students) {
      const [status, detail] = diagnose(s);
      counts[status]++;
      const row = ws.addRow([
        ++i,
        normalize(s.name),
        s.admissionNumber || '',
        s.assessmentNumber || '—',
        status,
        detail
      ]);
      row.eachCell((cell, col) => {
        cell.border = thinBorder;
        cell.alignment = {
          vertical: 'middle',
          horizontal: col === 2 || col === 6 ? 'left' : 'center',
          wrapText: col === 6
        };
        if (col === 5) {
          cell.fill = STATUS_FILL[status];
          cell.font = STATUS_FONT[status];
        }
      });
    }

    // Legend
    ws.addRow([]);
    const legend = ws.addRow([
      `Assigned: ${counts['Assigned']}   |   Missing: ${counts['Missing']}   |   UPI Conflict: ${counts['UPI Conflict']}   |   Name Variance: ${counts['Name Variance']}   |   Total: ${students.length}`
    ]);
    legend.getCell(1).font = { bold: true, size: 10 };
    ws.autoFilter = { from: 'A4', to: 'F4' };

    console.log(`${grade}: ${students.length} students — ` +
      Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', '));
  }

  const outDir = path.join(__dirname, '..', '..', 'frontend', 'downloads');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'AIC_Lokichoggio_Girls_Detailed_UPI_Audit.xlsx');
  await wb.xlsx.writeFile(outFile);
  console.log(`\nSaved: ${outFile}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
