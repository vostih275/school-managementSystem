const XLSX = require('xlsx');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school';

// Get CLI arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node importExcelStudents.js <filepath> <className> [startingAdmissionNumber]');
  console.error('Example: node importExcelStudents.js "uploads/G9.xlsx" "Grade 9" 56');
  process.exit(1);
}

const filePath = args[0];
const className = args[1];
const startingAdmissionNumber = args[2] ? parseInt(args[2], 10) : 56;

// Auto-detect the NAME and ASS. NO (assessment number) column indices by scanning
// the first several rows of a sheet for header cells. Falls back to indices 2 and 4
// (the originally specified defaults) if detection fails.
function detectColumns(data) {
  const nameRegex = /^\s*name\s*$/i;
  const assRegex = /ass[\.\s]*no|assessment/i;

  let nameIdx = null;
  let assIdx = null;

  const scanLimit = Math.min(data.length, 10);
  for (let r = 0; r < scanLimit; r++) {
    const row = data[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (typeof cell !== 'string') continue;
      if (nameIdx === null && nameRegex.test(cell)) nameIdx = c;
      if (assIdx === null && assRegex.test(cell)) assIdx = c;
    }
    if (nameIdx !== null && assIdx !== null) break;
  }

  return {
    nameIdx: nameIdx !== null ? nameIdx : 2,
    assIdx: assIdx !== null ? assIdx : 4
  };
}

console.log('=== Student Import Script ===');
console.log('File path:', filePath);
console.log('Class name:', className);
console.log('Starting admission number:', startingAdmissionNumber);

// Check if file exists
if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    return processExcelFile();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function processExcelFile() {
  try {
    const workbook = XLSX.readFile(filePath);
    console.log('Sheet names:', workbook.SheetNames);

    if (workbook.SheetNames.length === 0) {
      console.log('No sheets found in workbook');
      process.exit(0);
    }

    let currentCounter = startingAdmissionNumber;
    let successCount = 0;
    let errorCount = 0;
    let totalValidRows = 0;

    // Loop through ALL sheets in the workbook
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      console.log(`\nProcessing sheet: ${sheetName}`);
      console.log('Total rows:', data.length);

      if (data.length === 0) {
        console.log(`No data found in sheet '${sheetName}', skipping...`);
        continue;
      }

      // Auto-detect NAME and ASS. NO columns for this sheet (falls back to 2 and 4)
      const { nameIdx, assIdx } = detectColumns(data);
      console.log(`Detected columns for '${sheetName}': nameIdx=${nameIdx}, assIdx=${assIdx}`);

      // Filter valid rows (where the assessment column is a valid ID string like 'B0...' and the name column has a name)
      const validRows = data.filter(row => {
        if (!row[assIdx] || typeof row[assIdx] !== 'string') return false;
        if (!row[nameIdx] || typeof row[nameIdx] !== 'string' || row[nameIdx].trim() === '') return false;
        return row[assIdx].startsWith('B0');
      });

      console.log(`Valid rows found in '${sheetName}':`, validRows.length);

      if (validRows.length === 0) {
        console.log(`No valid rows found in sheet '${sheetName}' (rows with B0... IDs), skipping...`);
        continue;
      }

      totalValidRows += validRows.length;

      for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];

      try {
        // Map data for each valid row
        const student = {
          name: row[nameIdx],
          assessmentNumber: row[assIdx], // Original Excel ID
          class: className,
          admissionNumber: String(currentCounter).padStart(3, '0'), // Generate sequential admission number
          role: 'student',
          password: 'password123', // Default password
          classAssigned: className,
          profile: {
            gender: 'Female'
          }
        };

        console.log(`Processing student ${i + 1}/${validRows.length} [${sheetName}]:`, {
          name: student.name,
          assessmentNumber: student.assessmentNumber,
          admissionNumber: student.admissionNumber,
          class: student.class
        });

        // Upsert using assessmentNumber as the key
        const result = await User.updateOne(
          { assessmentNumber: student.assessmentNumber },
          { $set: student },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          console.log(`  ✓ Created new student: ${student.name}`);
        } else {
          console.log(`  ✓ Updated existing student: ${student.name}`);
        }

        successCount++;
        currentCounter++; // Increment counter for next student, continues across sheets

      } catch (err) {
        console.error(`  ✗ Error processing row ${i}:`, err.message);
        errorCount++;
      }
      }
    }

    console.log('\n=== Import Summary ===');
    console.log('Total valid rows across all sheets:', totalValidRows);
    console.log('Successfully imported:', successCount);
    console.log('Errors:', errorCount);
    console.log('Final admission number:', String(currentCounter).padStart(3, '0'));

  } catch (err) {
    console.error('Error processing Excel file:', err);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
}
