require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const CBCAssessment = require('../models/CBCAssessment');
const CBCCoreCompetency = require('../models/CBCCoreCompetency');
const User = require('../models/User');
const { generateReportPdf } = require('../services/cbcReportService');
const path = require('path');

const mockAssessments = [
    { learningArea: 'English', assessment1: 83, assessment2: 92, teacherInitial: 'A.L' },
    { learningArea: 'Kiswahili', assessment1: 80, assessment2: 80, teacherInitial: 'K.S' },
    { learningArea: 'Mathematics', assessment1: 65, assessment2: 76, teacherInitial: 'M.N' },
    { learningArea: 'Science', assessment1: 90, assessment2: 82, teacherInitial: 'S.K' },
    { learningArea: 'Agriculture', assessment1: 82, assessment2: 91, teacherInitial: 'A.L' },
    { learningArea: 'Social Studies', assessment1: 71, assessment2: 66, teacherInitial: 'K.S' },
    { learningArea: 'CRE', assessment1: 60, assessment2: 69, teacherInitial: 'C.R' },
    { learningArea: 'Creative Arts', assessment1: 70, assessment2: 74, teacherInitial: 'A.L' },
    { learningArea: 'Pre-Technical', assessment1: 81, assessment2: 82, teacherInitial: 'P.T' }
];

const mockCompetencies = {
    communication: 4,
    criticalThinking: 3,
    creativity: 4,
    citizenship: 3,
    digitalLiteracy: 3,
    learningToLearn: 4,
    selfEfficacy: 3
};

async function testPdfGeneration() {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        // Find or create a test student
        let student = await User.findOne({ role: 'student' }).limit(1);
        if (!student) {
            console.log('No student found. Creating test student...');
            student = await User.create({
                name: 'Test Student',
                email: 'test@student.com',
                password: 'password123',
                role: 'student',
                class: 'Grade 9'
            });
        }
        console.log('Using student:', student.name, student._id);

        const term = 2;
        const academicYear = '2026-2027';

        // Clear existing test data
        await CBCAssessment.deleteMany({ student: student._id, term, academicYear });
        await CBCCoreCompetency.deleteMany({ student: student._id, term, academicYear });

        // Insert mock assessments
        for (const la of mockAssessments) {
            await CBCAssessment.create({
                student: student._id,
                learningArea: la.learningArea,
                term,
                academicYear,
                assessment1: la.assessment1,
                assessment2: la.assessment2,
                teacherInitial: la.teacherInitial,
                teacherRemarks: 'Good performance',
                recordedBy: student._id
            });
        }
        console.log('Inserted', mockAssessments.length, 'mock assessments');

        // Insert mock competencies
        await CBCCoreCompetency.create({
            student: student._id,
            term,
            academicYear,
            competencies: mockCompetencies,
            teacherRemarks: 'Student demonstrates strong competencies across all areas.',
            recordedBy: student._id
        });
        console.log('Inserted mock competencies');

        // Build report data
        const { buildTermReportData } = require('../controllers/cbcController');
        const reportData = await buildTermReportData(String(student._id), term, academicYear);
        
        console.log('\nReport Data Summary:');
        console.log('Student:', reportData.student.name);
        console.log('Learning Areas:', reportData.learningAreas.length);
        console.log('Total Marks:', reportData.summary.totalMarks);
        console.log('Total Points:', reportData.summary.totalPoints);
        console.log('Overall Grade:', reportData.summary.overallGrade?.formatted);
        console.log('Class Position:', reportData.summary.classPosition, 'out of', reportData.summary.classSize);

        // Generate PDF
        const outputPath = path.join(__dirname, '../public/downloads/report-cards/test_kjsea_report.pdf');
        await generateReportPdf(reportData, outputPath);
        console.log('\nPDF generated successfully at:', outputPath);

        // Cleanup
        await CBCAssessment.deleteMany({ student: student._id, term, academicYear });
        await CBCCoreCompetency.deleteMany({ student: student._id, term, academicYear });
        console.log('Cleaned up test data');

        await mongoose.disconnect();
        console.log('Test completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

testPdfGeneration();
