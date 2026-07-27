const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const headerPatterns = [
  { key: 'serialIdx', regex: /^\s*(S\s*[/.]?\s*NO|S\s*N|SERIAL|SN|INDEX|NO\.?)\s*$/i },
  { key: 'nameIdx', regex: /^\s*NAME\s*$/i },
  { key: 'assIdx', regex: /ASS[\.\s]*NO|ASSESSMENT/i }
];

function findHeaderAndColumns(data) {
  const scanLimit = Math.min(data.length, 15);

  for (let r = 0; r < scanLimit; r++) {
    const row = data[r];
    if (!row) continue;

    const indices = {};
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (typeof cell !== 'string') continue;

      headerPatterns.forEach(({ key, regex }) => {
        if (indices[key] === undefined && regex.test(cell)) {
          indices[key] = c;
        }
      });
    }

    if (indices.serialIdx !== undefined && indices.nameIdx !== undefined) {
      return { headerRow: r, ...indices };
    }
  }

  return null;
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

      if (!Array.isArray(data) || data.length === 0) continue;

      const headerInfo = findHeaderAndColumns(data);
      if (!headerInfo) {
        console.warn(`No header row found in sheet: ${sheetName}`);
        continue;
      }

      const { headerRow, serialIdx, nameIdx, assIdx } = headerInfo;
      const studentRows = data.slice(headerRow + 1);

      for (let i = 0; i < studentRows.length; i++) {
        const row = studentRows[i];

        const rawSerial = row[serialIdx];
        if (rawSerial === undefined || rawSerial === null || rawSerial === '') continue;
        const serial = Number(rawSerial);
        if (!Number.isInteger(serial) || serial <= 0) continue;

        const rawName = row[nameIdx];
        if (!rawName || String(rawName).trim() === '') continue;

        try {
          const student = {
            name: String(rawName).trim(),
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

          if (assIdx !== undefined) {
            const rawAss = row[assIdx];
            if (rawAss && String(rawAss).startsWith('B0')) {
              student.assessmentNumber = String(rawAss).trim();
            }
          }

          if (student.assessmentNumber) {
            await User.updateOne(
              { assessmentNumber: student.assessmentNumber },
              { $set: student },
              { upsert: true }
            );
          } else {
            await User.create(student);
          }

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
