const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { normalizeSubject } = require('../utils/jssSubjectMapper');

const inputPath = process.argv[2] || path.resolve(__dirname, '../G 9 CAT 1 TERM 2 LIST (1).xlsx');

if (!fs.existsSync(inputPath)) {
  console.error('File not found:', inputPath);
  process.exit(1);
}

const workbook = XLSX.readFile(inputPath);
console.log('Sheet names:', workbook.SheetNames);

if (workbook.SheetNames.length === 0) {
  console.log('No sheets found in workbook');
  process.exit(0);
}

// Process each sheet and normalize headers to official JSS subjects
for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`\n=== Sheet: ${sheetName} ===`);
  console.log('Total rows:', data.length);

  if (data.length === 0 || !data[0]) continue;

  const rawHeaders = data[0];
  console.log('Raw headers:', rawHeaders);

  // Map each header to the official JSS subject object
  const mappedColumns = rawHeaders.map((h, i) => {
    const normalized = normalizeSubject(h);
    return {
      index: i,
      raw: h,
      ...normalized
    };
  });

  // Only columns that matched the official 9 JSS subjects
  const subjectColumns = mappedColumns.filter(col => col.code);
  console.log('Mapped JSS subject columns:', subjectColumns.map(c => `${c.raw} -> ${c.code} - ${c.name}`));

  // Output standardized subject objects for the first few data rows
  console.log('\nStandardized rows (sample):');
  data.slice(1, 6).forEach((row, i) => {
    const studentSubjects = {};
    subjectColumns.forEach(col => {
      const value = row[col.index];
      if (value !== undefined && value !== null && value !== '') {
        studentSubjects[col.code] = {
          name: col.name,
          shortName: col.shortName,
          rawScore: value
        };
      }
    });
    console.log(`Row ${i + 1}:`, { raw: row.slice(0, 5), mappedSubjects: studentSubjects });
  });

  console.log('\nColumn count:', rawHeaders.length);
  console.log('Official JSS subjects matched:', subjectColumns.length);
}
