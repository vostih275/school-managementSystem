// API base URL - resolved from global config set by config.js
const apiBase = `${(window.API_CONFIG?.BASE_URL || 'https://aic-school-system-c0j6.onrender.com').replace(/\/$/, '')}/api`;

// Function to show alert messages
function showAlert(message, type = 'info') {
    // Remove any existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => alertDiv.remove();
    
    alertDiv.prepend(closeBtn);
    
    // Add to the top of the page
    const container = document.querySelector('.main-content') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Function to load classes for the report card tab
async function loadClassesForReportCard() {
    try {
        const classSelect = document.getElementById('report-class');
        if (!classSelect) {
            console.error('Class select element not found');
            return;
        }

        // Clear existing options
        classSelect.innerHTML = '<option value="">-- Select Class --</option>';
        
        // Create the same class structure as in marks entry
        const classGroups = [
            {
                label: 'Pre-Primary',
                classes: [
                    { value: 'Baby Class', text: 'Baby Class' },
                    { value: 'PP1', text: 'PP1 (Pre-Primary 1)' },
                    { value: 'PP2', text: 'PP2 (Pre-Primary 2)' }
                ]
            },
            {
                label: 'Lower Primary (Grade 1-3)',
                classes: [
                    { value: 'Grade 1', text: 'Grade 1' },
                    { value: 'Grade 2', text: 'Grade 2' },
                    { value: 'Grade 3', text: 'Grade 3' }
                ]
            },
            {
                label: 'Upper Primary (Grade 4-6)',
                classes: [
                    { value: 'Grade 4', text: 'Grade 4' },
                    { value: 'Grade 5', text: 'Grade 5' },
                    { value: 'Grade 6', text: 'Grade 6' }
                ]
            },
            {
                label: 'Junior Secondary (Grade 7-9)',
                classes: [
                    { value: 'Grade 7', text: 'Grade 7' },
                    { value: 'Grade 8', text: 'Grade 8' },
                    { value: 'Grade 9', text: 'Grade 9' }
                ]
            },
            {
                label: 'Senior School (Grade 10-12)',
                classes: [
                    { value: 'Grade 10', text: 'Grade 10' },
                    { value: 'Grade 11', text: 'Grade 11' },
                    { value: 'Grade 12', text: 'Grade 12' }
                ]
            }
        ];

        // Add class groups and options
        classGroups.forEach(group => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = group.label;
            
            group.classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.value;
                option.textContent = cls.text;
                optgroup.appendChild(option);
            });
            
            classSelect.appendChild(optgroup);
        });

        // Enable the select
        classSelect.disabled = false;

    } catch (error) {
        console.error('Error loading classes:', error);
        const classSelect = document.getElementById('report-class');
        if (classSelect) {
            classSelect.innerHTML = '<option value="">Error loading classes</option>';
            classSelect.disabled = true;
        }
        showAlert('Failed to load classes. Please try again.', 'error');
    }
}

// Function to load students for report card
async function loadStudentsForReportCard(className) {
    console.log('Loading students for class:', className);
    const reportStudentSelect = document.getElementById('report-student');
    
    if (!reportStudentSelect) {
        console.error('Student select element not found');
        return [];
    }
    
    try {
        // Disable and show loading state
        reportStudentSelect.disabled = true;
        reportStudentSelect.innerHTML = '<option value="">Loading students...</option>';
        
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Not authenticated. Please log in again.');
        }
        
        console.log('Fetching students from:', `${apiBase}/students/class/${encodeURIComponent(className)}`);
        const response = await fetch(`${apiBase}/students/class/${encodeURIComponent(className)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            let errorMessage = 'Failed to fetch students';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        const students = Array.isArray(data) ? data : (data.data || data.students || []);
        
        console.log(`Fetched ${students.length} students for class ${className}`, students);
        
        // Update student dropdown
        reportStudentSelect.innerHTML = '<option value="">-- Select a student --</option>';
        
        if (students.length === 0) {
            const noStudentsOption = document.createElement('option');
            noStudentsOption.value = '';
            noStudentsOption.textContent = 'No students found in this class';
            reportStudentSelect.appendChild(noStudentsOption);
            reportStudentSelect.disabled = true;
            showAlert('No students found in the selected class.', 'warning');
            return [];
        }
        
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student._id || student.id;
            option.textContent = student.name || `Student ${student._id || student.id}`;
            reportStudentSelect.appendChild(option);
        });
        
        // Enable the student dropdown
        reportStudentSelect.disabled = false;
        console.log(`Successfully loaded ${students.length} students for class ${className}`);
        return students;
        
    } catch (error) {
        console.error('Error loading students for report card:', error);
        reportStudentSelect.innerHTML = '<option value="">Error loading students</option>';
        reportStudentSelect.disabled = true;
        
        const errorMessage = error.message || 'Failed to load students';
        showAlert(`Error: ${errorMessage}`, 'error');
        return [];
    }
}

function isJuniorSecondaryClass(className) {
    return /^Grade\s*[7-9]$/i.test(className);
}

// Helper function to calculate grade from marks
function calculateGradeFromMarks(marks, className) {
    const numericMarks = parseFloat(marks);
    if (isNaN(numericMarks)) return 'N/A';

    if (isJuniorSecondaryClass(className)) {
        if (numericMarks >= 90) return 'EE1';
        if (numericMarks >= 75) return 'EE2';
        if (numericMarks >= 58) return 'ME1';
        if (numericMarks >= 41) return 'ME2';
        if (numericMarks >= 31) return 'AE1';
        if (numericMarks >= 21) return 'AE2';
        if (numericMarks >= 11) return 'BE1';
        if (numericMarks >= 1) return 'BE2';
        return 'BE2';
    }

    if (numericMarks >= 85) return 'Exceeds Expectations';
    if (numericMarks >= 70) return 'Meets Expectations';
    if (numericMarks >= 55) return 'Approaches Expectations';
    return 'Below Expectations';
}

function calculatePointsFromMarks(marks, className) {
    const numericMarks = parseFloat(marks);
    if (isNaN(numericMarks) || !isJuniorSecondaryClass(className)) return '-';

    if (numericMarks >= 90) return 8;
    if (numericMarks >= 75) return 7;
    if (numericMarks >= 58) return 6;
    if (numericMarks >= 41) return 5;
    if (numericMarks >= 31) return 4;
    if (numericMarks >= 21) return 3;
    if (numericMarks >= 11) return 2;
    if (numericMarks >= 1) return 1;
    return 1;
}

// Helper function to get grade remarks (kept for backward compatibility)
function getGradeRemarks(grade) {
    // Since we're now using the full remark as grade, just return the grade
    return grade || 'N/A';
}

// Function to format a single mark cell (shows '-' for null/undefined/blank)
function formatMark(value) {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number') return value.toString();
    return value;
}

function getTeacherRemark(totalMarks) {
    if (totalMarks >= 788 && totalMarks <= 900) return 'E.E1 - Excellent work! Bravo!';
    if (totalMarks >= 676) return 'E.E2 - Very good work. You are almost to excellent!';
    if (totalMarks >= 563) return 'M.E1 - This is good. Target more!';
    if (totalMarks >= 451) return 'M.E2 - Good work. Aim higher.';
    if (totalMarks >= 338) return 'A.E1 - This is averagely fair work. Put more effort.';
    if (totalMarks >= 226) return 'A.E2 - The ability is good. Try extra hard.';
    if (totalMarks >= 113) return 'B.E1 - You have the potential. Aim higher.';
    return 'B.E2 - You can work hard. Keep trying.';
}

// Official KJSEA report card builder (4 assessments)
function updateReportCardPreview(reportData) {
    console.log('=== updateReportCardPreview called ===');

    try {
        const payload = reportData.data || reportData;
        const student = payload.student || {};
        const subjects = Array.isArray(payload.subjects) ? payload.subjects : [];

        const studentSelect = document.getElementById('report-student');
        const classSelect = document.getElementById('report-class');
        const termSelect = document.getElementById('report-term');

        const studentName = student.name || (studentSelect ? studentSelect.options[studentSelect.selectedIndex]?.text : 'N/A') || 'N/A';
        const className = student.class || (classSelect ? classSelect.value : '') || 'N/A';
        const term = payload.term || (termSelect ? termSelect.value : '') || 'N/A';
        const year = payload.year || new Date().getFullYear();
        const termNumber = String(term).replace(/\D/g, '') || term;

        const termAverage = payload.termAverage !== undefined && payload.termAverage !== null ? payload.termAverage : 0;
        const totalMarks = termAverage * subjects.length;
        const teacherRemark = getTeacherRemark(totalMarks);
        const overallGrade = termAverage ? calculateGradeFromMarks(termAverage, className) : '-';
        const classPosition = payload.classPosition !== undefined ? payload.classPosition : null;
        const classSize = payload.classSize !== undefined ? payload.classSize : null;

        const isJss = isJuniorSecondaryClass(className);

        // Build per-subject rows
        let rows = '';
        const sorted = [...subjects].sort((a, b) => {
            const codeA = a.subjectCode ? parseInt(a.subjectCode, 10) : Infinity;
            const codeB = b.subjectCode ? parseInt(b.subjectCode, 10) : Infinity;
            if (codeA !== codeB) return codeA - codeB;
            return (a.subject || '').localeCompare(b.subject || '');
        });

        sorted.forEach((item, idx) => {
            const name = item.subject || `Subject ${idx + 1}`;
            const a = item.assessments || {};
            const ass1 = a.ass1 !== undefined && a.ass1 !== null ? a.ass1 : null;
            const ass2 = a.ass2 !== undefined && a.ass2 !== null ? a.ass2 : null;
            const ass3 = a.ass3 !== undefined && a.ass3 !== null ? a.ass3 : null;
            const ass4 = a.ass4 !== undefined && a.ass4 !== null ? a.ass4 : null;
            const avg = item.subjectAverage !== undefined && item.subjectAverage !== null ? item.subjectAverage : null;

            rows += `<tr style="background:${idx % 2 === 1 ? '#f2f2f2' : 'transparent'};">
                <td style="padding:4px; border:1px solid #000; text-align:left; font-weight:600;">${name}</td>
                <td style="padding:4px; border:1px solid #000; text-align:center;">${formatMark(ass1)}</td>
                <td style="padding:4px; border:1px solid #000; text-align:center;">${ass1 !== null ? calculateGradeFromMarks(ass1, className) : '-'}</td>
                <td style="padding:4px; border:1px solid #000; text-align:center;">${formatMark(ass2)}</td>
                <td style="padding:4px; border:1px solid #000; text-align:center;">${ass2 !== null ? calculateGradeFromMarks(ass2, className) : '-'}</td>
                <td style="padding:4px; border:1px solid #000; text-align:center;">${formatMark(ass3)}</td>
                <td style="padding:4px; border:1px solid #000; text-align:center;">${ass3 !== null ? calculateGradeFromMarks(ass3, className) : '-'}</td>
                <td style="padding:4px; border:1px solid #000; text-align:center;">${formatMark(ass4)}</td>
                <td style="padding:4px; border:1px solid #000; text-align:center;">${ass4 !== null ? calculateGradeFromMarks(ass4, className) : '-'}</td>
                <td style="padding:4px; border:1px solid #000; text-align:center; font-weight:700;">${formatMark(avg)}</td>
                <td style="padding:4px; border:1px solid #000; text-align:center; font-weight:700;">${avg !== null ? calculateGradeFromMarks(avg, className) : '-'}</td>
                <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
            </tr>`;
        });

        // Totals
        let totalAss1 = null, totalAss2 = null, totalAss3 = null, totalAss4 = null, totalAvg = null;
        let ptsAss1 = 0, ptsAss2 = 0, ptsAss3 = 0, ptsAss4 = 0, totalPts = 0;
        let count = 0;
        sorted.forEach(item => {
            const a = item.assessments || {};
            if (typeof a.ass1 === 'number') { totalAss1 = (totalAss1 || 0) + a.ass1; ptsAss1 += isJss ? (calculatePointsFromMarks(a.ass1, className) || 0) : 0; }
            if (typeof a.ass2 === 'number') { totalAss2 = (totalAss2 || 0) + a.ass2; ptsAss2 += isJss ? (calculatePointsFromMarks(a.ass2, className) || 0) : 0; }
            if (typeof a.ass3 === 'number') { totalAss3 = (totalAss3 || 0) + a.ass3; ptsAss3 += isJss ? (calculatePointsFromMarks(a.ass3, className) || 0) : 0; }
            if (typeof a.ass4 === 'number') { totalAss4 = (totalAss4 || 0) + a.ass4; ptsAss4 += isJss ? (calculatePointsFromMarks(a.ass4, className) || 0) : 0; }
            if (typeof item.subjectAverage === 'number') { totalAvg = (totalAvg || 0) + item.subjectAverage; totalPts += isJss ? (item.points !== undefined && item.points !== null ? item.points : (calculatePointsFromMarks(item.subjectAverage, className) || 0)) : 0; count++; }
        });

        const display = v => (v === null || v === undefined || v === '') ? '-' : v;
        const ptsDisplay = p => isJss ? (p || 0) : '-';

        const html = `
        <div class="official-report-card report-card-container" style="background:#fff; color:#000; padding:12px; font-family:Arial, sans-serif; font-size:12px; line-height:1.35;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 10px;">

                <!-- Left: School Badge Placeholder -->
                <div style="flex: 1; text-align: left;">
                    <img src="/images/logo.png" alt="School Badge" style="max-height: 60px; width: auto;">
                </div>

                <!-- Center: School Information -->
                <div style="flex: 3; text-align: center;">
                    <h1 style="margin: 0; font-size: 18px; font-weight: bold; text-transform: uppercase;">AIC LOKICHOGGIO GIRLS JUNIOR SCHOOL</h1>
                    <p style="margin: 3px 0 0 0; font-size: 13px;">
                        P.O BOX 11-30503, LOKICHOGGIO. &nbsp;|&nbsp;
                        <i class="fas fa-phone" style="font-size:16px; margin-right:5px;"></i> TEL: 0745994826 / 0708474334
                    </p>
                    <p style="margin: 1px 0 0 0; font-size: 13px;">E-mail: aiclokichoggiogirls@gmail.com</p>
                    <p style="margin: 3px 0 0 0; font-size: 15px; font-style: italic; font-weight: bold;">MOTTO: Strive for excellence</p>
                </div>

                <!-- Right: Graduation Cap Placeholder -->
                <div style="flex: 1; text-align: right;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" width="60" height="48" fill="#000"><path d="M622.34 153.62L343.09 67.88c-16.92-5.25-34.46-5.25-51.38 0L12.66 153.62C5.1 156.07 0 163.17 0 171.21c0 8.04 5.1 15.14 12.66 17.59L320 272.94l307.34-84.14c7.56-2.45 12.66-9.55 12.66-17.59 0-8.04-5.1-15.14-12.66-17.59zM64 224v118.78c0 42.11 89.59 76.22 224 76.22s224-34.11 224-76.22V224c0 42.11-89.59 76.22-224 76.22S64 266.11 64 224zM320 488c88.22 0 168-18.35 224-47.08V384c-56 28.73-135.78 47.08-224 47.08S96 412.73 64 384v56.92C120 469.65 231.78 488 320 488z"/></svg>
                </div>

            </div>

            <div style="margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-weight:600;">
                    <span>LEARNER'S NAME: ${studentName}</span>
                    <span>GRADE: ${className}</span>
                </div>
                <p style="margin:4px 0; font-style:italic; font-size:11px;">Dear Parents/Guardians, This report form shows the ability and progress your child has made in different learning areas. The school welcomes you, should you desire to know more about your child's progress.</p>
            </div>

            <table style="width:100%; border-collapse:collapse; border:1px solid #000; margin-bottom:10px; font-size:11px;">
                <thead>
                    <tr style="background:#2c3e50; color:#fff;">
                        <th style="padding:4px; border:1px solid #000; text-align:left; width:18%;">LEARNING AREA</th>
                        <th style="padding:4px; border:1px solid #000; text-align:center;">ASS1</th>
                        <th style="padding:4px; border:1px solid #000; text-align:center;">LEVEL</th>
                        <th style="padding:4px; border:1px solid #000; text-align:center;">ASS2</th>
                        <th style="padding:4px; border:1px solid #000; text-align:center;">LEVEL</th>
                        <th style="padding:4px; border:1px solid #000; text-align:center;">ASS3</th>
                        <th style="padding:4px; border:1px solid #000; text-align:center;">LEVEL</th>
                        <th style="padding:4px; border:1px solid #000; text-align:center;">ASS4</th>
                        <th style="padding:4px; border:1px solid #000; text-align:center;">LEVEL</th>
                        <th style="padding:4px; border:1px solid #000; text-align:center;">AVERAGE</th>
                        <th style="padding:4px; border:1px solid #000; text-align:center;">LEVEL</th>
                        <th style="padding:4px; border:1px solid #000; text-align:center;">TR. INITIAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                    <tr style="font-weight:700; background:#f1f1f1;">
                        <td style="padding:4px; border:1px solid #000; text-align:left;">TOTAL MARKS/ MEAN GRADE</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;">${display(totalAss1)}</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;">${display(totalAss2)}</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;">${display(totalAss3)}</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;">${display(totalAss4)}</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;">${display(count ? (totalAvg / count).toFixed(2) : '-')}</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;">${overallGrade}</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
                    </tr>
                    <tr style="font-weight:700;">
                        <td style="padding:4px; border:1px solid #000; text-align:left;">TOTAL POINTS OUT OF 8</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;">${ptsDisplay(ptsAss1)}</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;">${ptsDisplay(ptsAss2)}</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;">${ptsDisplay(ptsAss3)}</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;">${ptsDisplay(ptsAss4)}</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;">${ptsDisplay(totalPts)}</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
                    </tr>
                    <tr style="font-weight:700;">
                        <td style="padding:4px; border:1px solid #000; text-align:left;">CLASS POSITION</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;">-</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;">-</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;">-</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;">-</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;">${classPosition !== null && classSize !== null ? `${classPosition} / ${classSize}` : '-'}</td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
                        <td style="padding:4px; border:1px solid #000; text-align:center;"></td>
                    </tr>
                </tbody>
            </table>

            <div style="margin-bottom:12px; font-weight:700;">Class teacher's Remarks: <span style="color:red; font-weight:400;">${teacherRemark}</span></div>

            <div style="margin-bottom:12px; font-size:11px; font-weight:700;">
                OVERALL GRADING SCALE: 01-112 (BE2), 113-225 (BE-1), 226-337 (AE-2), 338-450 (AE-1), 451-562(ME-2), 563-675(ME-1), 676-787(EE-2), 788-900(EE-1) and [----] MISSED ASSESSMENT.
            </div>

            <pre style="margin:0 0 8px; font-size:10px; line-height:1.2; font-family:monospace; white-space:pre; border:none; background:transparent;">KJSEA GRADING SCALE PER LEARNING AREA (%)
01-10(1 P) --- [0.5]- BE (2)              11-20(2 P)--- [1.0]-BE (1) -BELOW EXPECTATION
21- 30 (3 P)--- [1.5]-AE (2)              31-40(4 P)--- [2.0]-AE (1)-APPROACHING EXPECTATION
41-57(5 P)--- [2.5]-ME (2)               58-74(6 P)--- [3.0]-ME (1)--MEETING EXPECTATION
75-89(7 P)--- [3.5]-EE (2)                 90-100 (8 P)--- [4.0]-EE (1) - EXCEEDING EXPECTATION</pre>

            <div style="margin-top:10px; font-size:11px;">
                <table style="width:100%; border-collapse:collapse;">
                    <tr>
                        <td style="padding:4px 0;">Opening date: ..........................</td>
                        <td style="padding:4px 0;">Closing date: ..........................</td>
                    </tr>
                    <tr>
                        <td style="padding:4px 0;">Principal: Mrs. Akiru Rebecca Lokeun</td>
                        <td style="padding:4px 0;">Class teacher: ..........................</td>
                    </tr>
                    <tr>
                        <td style="padding:4px 0;">Signature ..........................</td>
                        <td style="padding:4px 0;">Signature ..........................</td>
                    </tr>
                    <tr>
                        <td style="padding:4px 0;"></td>
                        <td style="padding:4px 0; text-align:right; font-weight:700;">SCHOOL OFFICIAL STAMP</td>
                    </tr>
                </table>
            </div>
        </div>`;

        const previewContainer = document.getElementById('report-card-preview');
        if (previewContainer) {
            previewContainer.innerHTML = html;
        }

        // Show the preview section and action buttons
        const previewSection = document.querySelector('.preview-section');
        if (previewSection) previewSection.style.display = 'block';

        const deleteMarksBtn = document.getElementById('delete-marks');
        if (deleteMarksBtn) deleteMarksBtn.style.display = 'inline-block';

        const printReportBtn = document.getElementById('print-report-card');
        if (printReportBtn) printReportBtn.style.display = 'inline-block';

        const sendBtn = document.getElementById('send-to-student');
        if (sendBtn) sendBtn.style.display = 'inline-block';

    } catch (error) {
        console.error('Error updating report card preview:', error);
        showAlert('Failed to update report card preview. Please try again.', 'error');
    }
}

// Legacy preview builder (kept for reference)
function _deprecatedUpdateReportCardPreview(reportData) {
    console.log('=== updateReportCardPreview called ===');
    console.log('Report data received:', reportData);

    try {
        // Normalize incoming data (backend wraps in data property; local data is flat)
        const payload = reportData.data || reportData;
        const student = payload.student || {};
        const subjects = Array.isArray(payload.subjects) ? payload.subjects : [];

        const studentSelect = document.getElementById('report-student');
        const classSelect = document.getElementById('report-class');
        const termSelect = document.getElementById('report-term');

        // Student info (fallback to current form selections if not in payload)
        const studentName = student.name || (studentSelect ? studentSelect.options[studentSelect.selectedIndex]?.text : 'N/A') || 'N/A';
        const className = student.class || (classSelect ? classSelect.value : '') || 'N/A';
        const term = payload.term || (termSelect ? termSelect.value : '') || 'N/A';
        const year = payload.year || new Date().getFullYear();

        const studentNameElement = document.getElementById('student-name');
        if (studentNameElement) studentNameElement.textContent = studentName;

        const studentClassElement = document.getElementById('student-class');
        if (studentClassElement) studentClassElement.textContent = className;

        const termDisplay = document.getElementById('term-display');
        if (termDisplay) termDisplay.textContent = `${term} (${year})`;

        const reportTermDisplay = document.getElementById('report-term-display');
        if (reportTermDisplay) reportTermDisplay.textContent = `TERMLY REPORT CARD — ${term} ${year}`;

        // Update marks table (sorted by official JSS subject code order)
        const marksTableBody = document.getElementById('marks-table-body');
        if (marksTableBody) {
            marksTableBody.innerHTML = '';

            const sortedSubjects = [...subjects].sort((a, b) => {
                const codeA = a.subjectCode ? parseInt(a.subjectCode, 10) : Infinity;
                const codeB = b.subjectCode ? parseInt(b.subjectCode, 10) : Infinity;
                if (codeA !== codeB) return codeA - codeB;
                return (a.subject || '').localeCompare(b.subject || '');
            });

            if (sortedSubjects.length > 0) {
                sortedSubjects.forEach((item, idx) => {
                    const row = document.createElement('tr');

                    const subjectName = item.subject || `Subject ${idx + 1}`;
                    const subjectCode = item.subjectCode || '';
                    const formattedSubject = subjectName
                        .toString()
                        .replace(/-/g, ' ')
                        .replace(/\b(\w)/g, l => l.toUpperCase())
                        .replace(/\s+/g, ' ')
                        .trim();

                    const a = item.assessments || {};
                    const ass1 = a.ass1 !== undefined ? a.ass1 : (item.ass1 !== undefined ? item.ass1 : null);
                    const ass2 = a.ass2 !== undefined ? a.ass2 : (item.ass2 !== undefined ? item.ass2 : null);
                    const ass3 = a.ass3 !== undefined ? a.ass3 : (item.ass3 !== undefined ? item.ass3 : null);
                    const ass4 = a.ass4 !== undefined ? a.ass4 : (item.ass4 !== undefined ? item.ass4 : null);

                    const subjectAverage = item.subjectAverage !== undefined && item.subjectAverage !== null
                        ? item.subjectAverage
                        : (item.marks !== undefined && item.marks !== null ? item.marks : null);
                    const isJss = isJuniorSecondaryClass(className);
                    const grade = item.grade || (typeof subjectAverage === 'number' ? calculateGradeFromMarks(subjectAverage, className) : 'N/A');
                    const points = isJss ? (item.points !== undefined && item.points !== null ? item.points : calculatePointsFromMarks(subjectAverage, className)) : '-';
                    const subjectPosition = item.subjectPosition !== undefined ? item.subjectPosition : null;
                    const totalStudents = item.totalStudents !== undefined ? item.totalStudents : payload.classSize;
                    const improvement = item.improvement || '-';
                    const remarks = item.remarks || grade || '';

                    const cells = [
                        formattedSubject,
                        subjectCode,
                        formatMark(ass1),
                        formatMark(ass2),
                        formatMark(ass3),
                        formatMark(ass4),
                        formatMark(subjectAverage),
                        grade || '-',
                        points,
                        subjectPosition !== null && totalStudents ? `${subjectPosition} / ${totalStudents}` : '-',
                        improvement,
                        remarks || '-'
                    ];

                    cells.forEach((text, i) => {
                        const td = document.createElement('td');
                        td.textContent = text;
                        td.style.padding = '10px';
                        td.style.border = '1px solid #ddd';
                        if (i > 0) td.style.textAlign = 'center';
                        row.appendChild(td);
                    });

                    marksTableBody.appendChild(row);
                });
            } else {
                marksTableBody.innerHTML = '<tr><td colspan="12" class="text-center">No marks data available</td></tr>';
            }
        }

        // Update the summary section
        const termAverage = payload.termAverage !== undefined && payload.termAverage !== null ? payload.termAverage : null;
        const classPosition = payload.classPosition !== undefined && payload.classPosition !== null ? payload.classPosition : null;
        const classSize = payload.classSize !== undefined && payload.classSize !== null ? payload.classSize : null;

        const averageScoreElement = document.getElementById('average-score');
        if (averageScoreElement) averageScoreElement.textContent = termAverage !== null ? `${termAverage}%` : '-';

        const classPositionElement = document.getElementById('class-position');
        if (classPositionElement) classPositionElement.textContent = (classPosition !== null && classSize !== null) ? `${classPosition} out of ${classSize}` : '-';

        const overallGradeElement = document.getElementById('overall-grade');
        if (overallGradeElement) overallGradeElement.textContent = termAverage !== null ? calculateGradeFromMarks(termAverage, className) : '-';

        const remarksElement = document.getElementById('teacher-remarks-preview');
        if (remarksElement) remarksElement.textContent = payload.teacherRemarks || 'No remarks provided';

        // Show action buttons
        const downloadBtn = document.getElementById('download-pdf');
        const sendBtn = document.getElementById('send-to-student');
        const deleteBtn = document.getElementById('delete-report');

        if (downloadBtn) downloadBtn.style.display = 'inline-block';
        if (sendBtn) sendBtn.style.display = 'inline-block';
        if (deleteBtn) deleteBtn.style.display = 'inline-block';

        // Show the preview section
        const previewSection = document.querySelector('.preview-section');
        if (previewSection) previewSection.style.display = 'block';

    } catch (error) {
        console.error('Error updating report card preview:', error);
        showAlert('Failed to update report card preview. Please try again.', 'error');
    }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Delete Marks for selected student/term
// ---------------------------------------------------------------------------
async function deleteMarks() {
    const studentSelect = document.getElementById('report-student');
    const termSelect = document.getElementById('report-term');

    const studentId = studentSelect ? studentSelect.value : '';
    const term = termSelect ? termSelect.value : '';
    const year = new Date().getFullYear();

    if (!studentId || !term) {
        showAlert('Please select a student and term before deleting marks.', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete all marks for this student for the selected term?')) {
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        showAlert('You are not authenticated. Please log in again.', 'error');
        return;
    }

    const deleteBtn = document.getElementById('delete-marks');
    const originalText = deleteBtn ? deleteBtn.innerHTML : '';
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    }

    try {
        const url = `${apiBase}/marks/students/${encodeURIComponent(studentId)}/marks?term=${encodeURIComponent(term)}&year=${year}`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `Server returned ${response.status}`);
        }

        showAlert(data.message || 'Marks deleted successfully.', 'success');

        // Clear the preview
        const previewContainer = document.getElementById('report-card-preview');
        if (previewContainer) {
            previewContainer.innerHTML = '<div style="padding:20px; text-align:center;">Marks deleted. Generate a new report card after entering marks.</div>';
        }

        // Refresh the student list
        const classSelect = document.getElementById('report-class');
        if (classSelect && classSelect.value) {
            loadStudentsForReportCard(classSelect.value);
        }

    } catch (error) {
        console.error('deleteMarks error:', error);
        showAlert(`Failed to delete marks: ${error.message}`, 'error');
    } finally {
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalText;
        }
    }
}

// Download Report Card as PDF via the CBC report service (legacy)
// ---------------------------------------------------------------------------
async function _unusedDownloadReportCardAsPDF() {
    const studentSelect = document.getElementById('report-student');
    const termSelect    = document.getElementById('report-term');

    const studentId   = studentSelect ? studentSelect.value : '';
    const studentName = studentSelect ? (studentSelect.options[studentSelect.selectedIndex]?.text || 'student') : 'student';
    const termRaw     = termSelect ? termSelect.value : '';

    if (!studentId) {
        showAlert('Please select a student before downloading.', 'error');
        return;
    }
    if (!termRaw) {
        showAlert('Please select a term before downloading.', 'error');
        return;
    }

    // Derive numeric term (e.g. "Term 1" -> "1")
    // Pass the same format used by Marks Entry: term = 'Term 1', year = 2026
    const term = termRaw;
    const yr = new Date().getFullYear();
    const academicYear = yr;

    const token = localStorage.getItem('token');
    if (!token) {
        showAlert('You are not authenticated. Please log in again.', 'error');
        return;
    }

    const downloadBtn = document.getElementById('download-pdf');
    const originalText = downloadBtn ? downloadBtn.innerHTML : '';
    if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
    }

    try {
        const url = `${apiBase}/cbc/report-card/${studentId}?term=${encodeURIComponent(term)}&academicYear=${academicYear}&download=true`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || `Server returned ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/pdf')) {
            // Blob download
            const blob = await response.blob();
            const objectUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            const fileTerm = term.replace(/\D/g, '') || term;
            a.download = `ReportCard_${studentName.replace(/\s+/g, '_')}_Term${fileTerm}_${yr}.pdf`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(objectUrl);
            }, 200);
            showAlert('PDF downloaded successfully.', 'success');
        } else {
            // JSON response with a download URL
            const data = await response.json();
            const baseHost = apiBase.replace(/\/api$/, '');
            const pdfUrl = data.data?.downloadUrl
                ? `${baseHost}${data.data.downloadUrl}`
                : (data.data?.filePath ? `${baseHost}${data.data.filePath}` : null);

            if (pdfUrl) {
                const a = document.createElement('a');
                a.href = pdfUrl;
                a.target = '_blank';
                a.download = `ReportCard_${studentName.replace(/\s+/g, '_')}_Term${termRaw.replace(/\D/g, '') || termRaw}_${yr}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                showAlert('PDF download started.', 'success');
            } else {
                throw new Error('PDF URL not returned by server. Check server logs.');
            }
        }
    } catch (error) {
        console.error('downloadReportCardAsPDF error:', error);
        showAlert(`Failed to download PDF: ${error.message}`, 'error');
    } finally {
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = originalText;
        }
    }
}

// Stub — future feature: email/share report card
function sendReportCardToStudent() {
    showAlert('Send to student feature is coming soon.', 'info');
}

// Function to preview the report card
async function previewReportCard(event) {
    console.log('=== previewReportCard called ===');

    // Prevent default form submission if any
    if (event) event.preventDefault();

    console.log('Event target:', event ? event.target : 'no event');

    try {
        // Get selected values
        const studentSelect = document.getElementById('report-student');
        const termSelect = document.getElementById('report-term');
        const classSelect = document.getElementById('report-class');

        console.log('Form elements:', {
            studentSelect: studentSelect ? 'found' : 'not found',
            termSelect: termSelect ? 'found' : 'not found',
            classSelect: classSelect ? 'found' : 'not found',
            studentValue: studentSelect ? studentSelect.value : 'N/A',
            termValue: termSelect ? termSelect.value : 'N/A',
            classValue: classSelect ? classSelect.value : 'N/A'
        });

        if (!studentSelect || !termSelect || !classSelect) {
            const errorMsg = 'Required form elements not found. Please refresh the page and try again.';
            console.error(errorMsg, {studentSelect, termSelect, classSelect});
            showAlert(errorMsg, 'error');
            return;
        }

        const studentId = studentSelect.value.trim();
        const term = termSelect.value.trim();
        const className = classSelect.value.trim();

        console.log('Form values:', {studentId, term, className});

        // Validate selections
        if (!studentId) {
            showAlert('Please select a student', 'error');
            return;
        }
        if (!term) {
            showAlert('Please select a term', 'error');
            return;
        }
        if (!className) {
            showAlert('Please select a class first', 'error');
            return;
        }

        const year = new Date().getFullYear();
        const token = localStorage.getItem('token');
        if (!token) {
            showAlert('You are not authenticated. Please log in again.', 'error');
            return;
        }

        const generateBtn = document.getElementById('generate-report-card');
        const originalBtnText = generateBtn ? generateBtn.innerHTML : '';
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        }

        const marksTableBody = document.getElementById('marks-table-body');
        if (marksTableBody) {
            marksTableBody.innerHTML = '<tr><td colspan="12" class="text-center">Loading report card...</td></tr>';
        }

        try {
            const response = await fetch(`${apiBase}/reports/generate/${encodeURIComponent(studentId)}/${encodeURIComponent(term)}/${year}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                if (response.status === 404) {
                    const msg = error.message || `No marks recorded for this student for ${term} ${year}. Please go to Marks Entry, enter the scores, and click Save Marks first.`;
                    showAlert(msg, 'warning');
                    if (marksTableBody) {
                        marksTableBody.innerHTML = `<tr><td colspan="12" class="text-center text-warning">${msg}</td></tr>`;
                    }
                    return;
                }
                throw new Error(error.message || `Server returned ${response.status}`);
            }

            const reportData = await response.json();
            console.log('Comprehensive report data:', reportData);

            updateReportCardPreview(reportData);
            showAlert('Report card generated successfully', 'success');

        } catch (error) {
            console.error('Error loading comprehensive report:', error);
            showAlert(`Failed to load report card: ${error.message || 'Please try again later'}`, 'error');

            if (marksTableBody) {
                marksTableBody.innerHTML = '<tr><td colspan="12" class="text-center text-danger">Failed to load marks. Please try again.</td></tr>';
            }
        } finally {
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = originalBtnText;
            }
        }
    } catch (error) {
        console.error('Error in previewReportCard:', error);
        showAlert('An unexpected error occurred. Please check the console for details.', 'error');
    }
}

// Function to initialize tab switching
function initializeTabSwitching() {
    console.log('Initializing tab switching...');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    console.log(`Found ${tabButtons.length} tab buttons and ${tabPanes.length} tab panes`);
    
    // Add click event to each tab button
    tabButtons.forEach(button => {
        console.log(`Adding click handler for tab button with data-tab: ${button.getAttribute('data-tab')}`);
        button.addEventListener('click', function() {
            console.log(`Tab button clicked: ${this.textContent}`);
            
            // Remove active class from all buttons and hide all panes
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.style.borderBottom = '1px solid #ddd';
                btn.style.background = '#f8f9fa';
            });
            
            tabPanes.forEach(pane => {
                console.log(`Hiding pane: ${pane.id}`);
                pane.style.display = 'none';
            });
            
            // Add active class to clicked button and style it
            this.classList.add('active');
            this.style.borderBottom = '2px solid #007bff';
            this.style.background = '#fff';
            
            // Show the corresponding tab pane
            const targetTab = this.getAttribute('data-tab');
            console.log(`Target tab: ${targetTab}`);
            const targetPane = document.getElementById(targetTab);
            
            if (targetPane) {
                console.log(`Showing tab pane: ${targetTab}`);
                targetPane.style.display = 'block';
                
                // If we're switching to the report card tab, load classes
                if (targetTab === 'report-card-tab') {
                    console.log('Switched to report card tab, loading classes...');
                    loadClassesForReportCard();
                }
            } else {
                console.error(`Could not find target tab pane with id: ${targetTab}`);
            }
        });
    });
    
    // Add event listener for class selection change in report card tab
    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'report-class') {
            const className = e.target.value;
            console.log('Class selected in report card tab:', className);
            loadStudentsForReportCard(className);
        }
    });
    
    // Activate the first tab by default if none are active
    if (tabButtons.length > 0) {
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            console.log('Found active tab, clicking it to initialize');
            activeTab.click();
        } else {
            console.log('No active tab found, activating first tab');
            tabButtons[0].click();
        }
    } else {
        console.error('No tab buttons found for initialization');
    }
    
    console.log('Tab switching initialization complete');
}
async function deleteReportCard() {
    console.log('Delete report card function called');
    
    let deleteBtn;
    let originalBtnText;
    
    try {
        // Get form elements
        const studentSelect = document.getElementById('report-student');
        const termSelect = document.getElementById('report-term');
        const classSelect = document.getElementById('report-class');
        deleteBtn = document.getElementById('confirmDeleteBtn');
        
        console.log('Form elements:', { 
            studentSelect: studentSelect ? 'found' : 'not found', 
            termSelect: termSelect ? 'found' : 'not found', 
            classSelect: classSelect ? 'found' : 'not found',
            deleteBtn: deleteBtn ? 'found' : 'not found'
        });
        
        // Validate form elements exist
        if (!studentSelect || !termSelect || !classSelect || !deleteBtn) {
            const missingElements = [];
            if (!studentSelect) missingElements.push('student select');
            if (!termSelect) missingElements.push('term select');
            if (!classSelect) missingElements.push('class select');
            if (!deleteBtn) missingElements.push('delete button');
            
            const errorMsg = `Required elements not found: ${missingElements.join(', ')}`;
            console.error(errorMsg);
            showAlert('Error: Could not find required page elements', 'error');
            return;
        }
        
        // Get form values
        const studentId = studentSelect.value.trim();
        const term = termSelect.value.trim();
        const className = classSelect.value.trim();
        
        console.log('Form values:', { studentId, term, className });
        
        // Validate form values
        if (!studentId || !term || !className) {
            const missingFields = [];
            if (!studentId) missingFields.push('student');
            if (!term) missingFields.push('term');
            if (!className) missingFields.push('class');
            
            console.error('Missing required fields:', missingFields);
            showAlert(`Please select ${missingFields.join(', ')}`, 'error');
            return;
        }
        
        // Disable the delete button and show loading state
        originalBtnText = deleteBtn.innerHTML;
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';
    
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            throw new Error('Not authenticated');
        }
        
        // Get current academic year
        const currentYear = new Date().getFullYear();
        const academicYear = `${currentYear}-${currentYear + 1}`;
        
        const url = `${apiBase}/marks/${studentId}/term/${encodeURIComponent(term)}?academicYear=${encodeURIComponent(academicYear)}`;
        console.log('Making DELETE request to:', url);
        
        // Call the delete endpoint
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Delete response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Delete failed:', errorData);
            throw new Error(errorData.message || 'Failed to delete report card');
        }
        
        // Show success message
        showAlert('Report card deleted successfully', 'success');
        
        // Reset the form
        if (studentSelect) studentSelect.value = '';
        if (termSelect) termSelect.value = '';
        if (classSelect) classSelect.value = '';
        
        // Hide the preview
        const previewContainer = document.getElementById('report-card-preview');
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }
        // Hide action buttons
        const downloadBtn = document.getElementById('download-pdf');
        const sendBtn = document.getElementById('send-to-student');
        const deleteReportBtn = document.getElementById('delete-report');
        
        if (downloadBtn) downloadBtn.style.display = 'none';
        if (sendBtn) sendBtn.style.display = 'none';
        if (deleteReportBtn) deleteReportBtn.style.display = 'none';
        
        // Hide the modal
        const modal = document.getElementById('confirmDeleteModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Re-enable scrolling
        }
    } catch (error) {
        console.error('Error in deleteReportCard:', error);
        showAlert(error.message || 'Failed to delete report card', 'error');
    } finally {
        // Restore the delete button
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalBtnText;
        }
    }
}

// Initialize the report card system when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing report card system...');
    
    // Initialize tab switching
    initializeTabSwitching();
    
    // Debug: Log all elements with ID containing 'delete'
    console.log('Debug: Elements with ID containing "delete":', 
        Array.from(document.querySelectorAll('[id*="delete"]')).map(el => ({
            id: el.id,
            tagName: el.tagName,
            classList: Array.from(el.classList)
        }))
    );
    
    // Modal elements
    const modal = document.getElementById('confirmDeleteModal');
    const deleteReportBtn = document.getElementById('delete-report');
    const closeModalBtn = document.getElementById('closeDeleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    // Function to show modal
    function showModal() {
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Prevent scrolling
            // Focus trap for accessibility
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    // Function to hide modal
    function hideModal() {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Re-enable scrolling
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    // Handle delete report button click
    if (deleteReportBtn) {
        deleteReportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showModal();
        });
    }

    // Handle close button
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            hideModal();
        });
    }

    // Handle cancel button
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            hideModal();
        });
    }

    // Handle confirm delete button
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            deleteReportCard();
            hideModal();
        });
    }

    // Close modal when clicking outside content
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideModal();
            }
        });
    }

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal && modal.style.display === 'block') {
            hideModal();
        }
    });
    
    // Add event listener to the Report Card tab class select
    const classSelect = document.getElementById('report-class');
    if (classSelect) {
        classSelect.addEventListener('change', function() {
            const className = this.value;
            if (className) {
                loadStudentsForReportCard(className);
            }
        });

        // If a class is already selected on load, populate students immediately
        if (classSelect.value) {
            console.log('Initializing report-class with current value:', classSelect.value);
            loadStudentsForReportCard(classSelect.value);
        }
    } else {
        console.error('report-class select element not found in DOM');
    }
    
    // Add event listener to generate button
    const generateBtn = document.getElementById('generate-report-card');
    if (generateBtn) {
        console.log('Generate button found, adding click event listener');
        generateBtn.addEventListener('click', function(e) {
            console.log('Generate button clicked');
            previewReportCard(e);
        });
    } else {
        console.error('Generate report card button not found');
    }

    // Wire Delete Marks button
    const deleteMarksBtn = document.getElementById('delete-marks');
    if (deleteMarksBtn) {
        deleteMarksBtn.addEventListener('click', function(e) {
            e.preventDefault();
            deleteMarks();
        });
    }

    // Wire Send to Student button
    const sendBtn = document.getElementById('send-to-student');
    if (sendBtn) {
        sendBtn.addEventListener('click', function(e) {
            e.preventDefault();
            sendReportCardToStudent();
        });
    }

    console.log('Report card system initialization complete');
});