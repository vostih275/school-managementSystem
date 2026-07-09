const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.resolve('c:/Users/carol/Downloads/G 9 CAT 1 TERM 2 LIST.xlsx');

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
console.log('Sheet names:', workbook.SheetNames);

if (workbook.SheetNames.length === 0) {
  console.log('No sheets found in workbook');
  process.exit(0);
}

// Check all sheets for data
for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log(`\n=== Sheet: ${sheetName} ===`);
  console.log('Total rows:', data.length);
  
  if (data.length > 0) {
    console.log('\nFirst 10 rows:');
    data.slice(0, 10).forEach((row, i) => {
      console.log(`Row ${i}:`, row);
    });
    console.log('\nHeaders (row 0):', data[0]);
    console.log('\nColumn count:', data[0] ? data[0].length : 0);
  }
}
