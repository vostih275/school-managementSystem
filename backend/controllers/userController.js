const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const nameRegex = /^\s*name\s*$/i;
const assRegex = /ass[\.\s]*no|assessment/i;

function detectColumns(data) {
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

exports.importExcelStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { className, startingNumber } = req.body;
    if (!className) {
      return res.status(400).json({ success: false, message: 'className is required' });
    }

    const startingAdmissionNumber = startingNumber ? parseInt(startingNumber, 10) : 56;
    if (isNaN(startingAdmissionNumber)) {
      return res.status(400).json({ success: false, message: 'startingNumber must be a valid number' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    if (workbook.SheetNames.length === 0) {
      return res.json({ success: true, message: 'No sheets found in workbook', imported: 0 });
    }

    const defaultPassword = await bcrypt.hash('123456', 10);

    let currentCounter = startingAdmissionNumber;
    let successCount = 0;
    let errorCount = 0;
    let totalValidRows = 0;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (data.length === 0) continue;

      const { nameIdx, assIdx } = detectColumns(data);

      const validRows = data.filter(row => {
        if (!row[assIdx] || typeof row[assIdx] !== 'string') return false;
        if (!row[nameIdx] || typeof row[nameIdx] !== 'string' || row[nameIdx].trim() === '') return false;
        return row[assIdx].startsWith('B0');
      });

      if (validRows.length === 0) continue;
      totalValidRows += validRows.length;

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];

        try {
          const student = {
            name: row[nameIdx],
            assessmentNumber: row[assIdx],
            class: className,
            admissionNumber: String(currentCounter).padStart(3, '0'),
            role: 'student',
            password: defaultPassword,
            classAssigned: className,
            profile: {
              gender: 'Female',
              class: className
            }
          };

          await User.updateOne(
            { assessmentNumber: student.assessmentNumber },
            { $set: student },
            { upsert: true }
          );

          successCount++;
          currentCounter++;
        } catch (err) {
          console.error(`Error processing row ${i} in sheet ${sheetName}:`, err.message);
          errorCount++;
        }
      }
    }

    res.json({
      success: true,
      message: `Imported ${successCount} students${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
      imported: successCount,
      errors: errorCount,
      startingAdmissionNumber,
      finalAdmissionNumber: String(currentCounter).padStart(3, '0')
    });
  } catch (error) {
    console.error('Error importing students:', error);
    res.status(500).json({ success: false, message: 'Server error during import', error: error.message });
  }
};
