require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;

async function testBranding() {
    console.log('\n=== Branding Verification ===\n');

    // 1. Check env vars
    console.log('SCHOOL_NAME   :', process.env.SCHOOL_NAME || '(not set - will use default)');
    console.log('SCHOOL_CONTACT:', process.env.SCHOOL_CONTACT || '(not set - will use default)');

    // 2. Check logo paths
    const logoPaths = [
        path.join(__dirname, '../../frontend/images/logo.png'),
        path.join(__dirname, '../public/assets/logo.png')
    ];
    let logoFound = false;
    for (const p of logoPaths) {
        try {
            const stat = await fs.stat(p);
            console.log(`\n✅ Logo found at: ${p} (${(stat.size / 1024).toFixed(1)} KB)`);
            logoFound = true;
            break;
        } catch (e) {
            console.log(`❌ Logo NOT found at: ${p}`);
        }
    }
    if (!logoFound) console.log('\n⚠️  No logo found — PDF will render without logo image.');

    // 3. Test HTML generation
    const { buildReportHtml } = require('../services/cbcReportService');
    const html = buildReportHtml({
        student: { name: 'Test Student', id: '001', class: 'Grade 6' },
        term: '1', academicYear: '2026',
        learningAreas: [], summary: { totalMarks: 0, totalPoints: 0, overallGrade: null, classPosition: null, classSize: 0 },
        competencies: {}, classTeacherRemarks: 'Good', principalRemarks: 'Excellent',
        attendance: {}, logoSrc: logoFound ? 'data:image/png;base64,TEST' : null
    });

    const schoolNameInHtml = html.includes('AIC LOKICHOGGIO GIRLS PRIMARY & JUNIOR');
    const turkanaInHtml = html.includes('Turkana County');
    const principalInHtml = html.includes('Mrs. Akiru Rebecca Lokeun');

    console.log('\n=== PDF Template Check ===');
    console.log(schoolNameInHtml ? '✅ School name correct' : '❌ School name MISSING');
    console.log(turkanaInHtml    ? '✅ Turkana County address present' : '❌ Turkana County MISSING');
    console.log(principalInHtml  ? '✅ Principal name correct' : '❌ Principal name MISSING');

    console.log('\n=== Done ===\n');
}

testBranding().catch(console.error).finally(() => process.exit(0));
