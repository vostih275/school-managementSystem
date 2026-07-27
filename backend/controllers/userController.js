const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const User = require('../models/User');


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

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (!Array.isArray(rows) || rows.length === 0) continue;

      for (const row of rows) {
        if (!row || row.length === 0) continue;

        let isStudent = false;
        let studentName = '';
        let assessNum = null;

        for (let i = 0; i < 4; i++) {
          const currentCell = row[i];
          const nextCell = row[i + 1];

          if (currentCell === null || currentCell === undefined || String(currentCell).trim() === '') continue;

          const num = Number(currentCell);
          if (Number.isInteger(num) && num > 0) {
            if (nextCell && typeof nextCell === 'string' && nextCell.trim().length > 2) {
              isStudent = true;
              studentName = nextCell.trim();

              const potentialAssess = row[i + 3];
              if (potentialAssess && String(potentialAssess).trim().length >= 4 && isNaN(Number(potentialAssess))) {
                assessNum = String(potentialAssess).trim();
              }
              break;
            }
          }
        }

        if (!isStudent) continue;

        try {
          const student = {
            name: studentName,
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

          if (assessNum) {
            student.assessmentNumber = assessNum;
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
          console.error(`Error processing row in sheet ${sheetName}:`, err.message);
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
