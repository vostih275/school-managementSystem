const mongoose = require('mongoose');
const path = require('path');
const fsp = require('fs').promises;
const CBCAssessment = require('../models/CBCAssessment');
const Grade = require('../models/Grade');
const CBCCoreCompetency = require('../models/CBCCoreCompetency');
const User = require('../models/User');
const { generateReportPdf } = require('../services/cbcReportService');
const {
    detectGradingScale,
    percentageToTier, totalMarksToGrade, calculateAverage, formatTier, formatOverallGrade,
    calculatePrimaryGrade, calculateOverallCompetency, normaliseRubric
} = require('../utils/cbcGradingEngine');

// @desc    Record a new assessment with two scores (Assessment 1/Midterm and Assessment 2/KNEC)
// @route   POST /api/cbc/assessments
// @access  Private (Teacher/Admin)
exports.createAssessment = async (req, res) => {
    try {
        const { student, learningArea, term, academicYear, assessment1, assessment2, teacherInitial, teacherRemarks } = req.body;

        if (!mongoose.Types.ObjectId.isValid(student)) {
            return res.status(400).json({ success: false, message: 'Invalid student ID' });
        }

        if (assessment1 === undefined && assessment2 === undefined) {
            return res.status(400).json({ success: false, message: 'At least one assessment score (assessment1 or assessment2) is required' });
        }

        const studentDoc = await User.findOne({ _id: student, role: 'student' }).select('_id name class');
        if (!studentDoc) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // Determine grading scale from student class
        const studentClass = studentDoc.class || '';
        const gradingScale = detectGradingScale(studentClass);

        // For 4-tier: normalise rubric strings; for 8-tier: ensure numbers
        let a1 = assessment1;
        let a2 = assessment2;
        if (gradingScale === '4-tier') {
            if (a1 !== undefined && a1 !== null) a1 = normaliseRubric(String(a1));
            if (a2 !== undefined && a2 !== null) a2 = normaliseRubric(String(a2));
            if ((a1 !== undefined && a1 !== null && !a1) || (a2 !== undefined && a2 !== null && !a2)) {
                return res.status(400).json({ success: false, message: 'Invalid rubric value. Must be EE, ME, AE, or BE for this class level.' });
            }
        }

        // Check if assessment already exists for this student/learningArea/term/year and update
        const existing = await CBCAssessment.findOne({ student, learningArea, term, academicYear });
        let assessment;
        if (existing) {
            if (a1 !== undefined) existing.assessment1 = a1;
            if (a2 !== undefined) existing.assessment2 = a2;
            if (teacherInitial) existing.teacherInitial = teacherInitial;
            if (teacherRemarks !== undefined) existing.teacherRemarks = teacherRemarks;
            existing.gradingScale = gradingScale;
            existing.recordedBy = req.user.id;
            assessment = await existing.save();
        } else {
            assessment = await CBCAssessment.create({
                student,
                learningArea,
                term,
                academicYear,
                gradingScale,
                assessment1: a1,
                assessment2: a2,
                teacherInitial,
                teacherRemarks,
                recordedBy: req.user.id
            });
        }

        res.status(201).json({ success: true, data: assessment });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: Object.values(error.errors).map(e => e.message)
            });
        }
        console.error('Error creating CBC assessment:', error);
        res.status(500).json({ success: false, message: 'Server error while creating assessment' });
    }
};

// @desc    Record (or update) a student's core competencies for a term
// @route   POST /api/cbc/competencies
// @access  Private (Teacher/Admin)
exports.upsertCoreCompetencies = async (req, res) => {
    try {
        const { student, term, academicYear, competencies, teacherRemarks } = req.body;

        if (!mongoose.Types.ObjectId.isValid(student)) {
            return res.status(400).json({ success: false, message: 'Invalid student ID' });
        }

        if (!competencies || typeof competencies !== 'object' || Object.keys(competencies).length === 0) {
            return res.status(400).json({ success: false, message: 'competencies object is required' });
        }

        const studentDoc = await User.findOne({ _id: student, role: 'student' }).select('_id name');
        if (!studentDoc) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // Build a $set update so partial competency submissions don't erase existing scores
        const setFields = {
            teacherRemarks: teacherRemarks || '',
            recordedBy: req.user.id
        };
        const allowedCompetencies = [
            'communication', 'criticalThinking', 'creativity',
            'citizenship', 'digitalLiteracy', 'learningToLearn', 'selfEfficacy'
        ];
        for (const key of allowedCompetencies) {
            if (competencies[key] !== undefined) {
                setFields[`competencies.${key}`] = competencies[key];
            }
        }

        const record = await CBCCoreCompetency.findOneAndUpdate(
            { student, term, academicYear },
            { $set: setFields },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );

        res.status(201).json({ success: true, data: record });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: Object.values(error.errors).map(e => e.message)
            });
        }
        console.error('Error saving CBC core competencies:', error);
        res.status(500).json({ success: false, message: 'Server error while saving competencies' });
    }
};

const REPORT_CARD_DIR = path.join(__dirname, '../public/downloads/report-cards');

// @desc    Aggregated termly summary for one student (KJSEA grading)
// @route   GET /api/cbc/student/:id/summary?academicYear=YYYY-YYYY&term=1
// @access  Private (Teacher/Admin)
exports.getStudentSummary = async (req, res) => {
    try {
        const { id } = req.params;
        const { academicYear, term } = req.query;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid student ID' });
        }

        const studentId = new mongoose.Types.ObjectId(id);

        const matchStage = { student: studentId };
        if (academicYear) matchStage.academicYear = academicYear;
        if (term) matchStage.term = parseInt(term, 10);

        const [student, assessments, competencyRecords] = await Promise.all([
            User.findById(studentId).select('name email class profile.class').lean(),
            CBCAssessment.find(matchStage).lean(),
            CBCCoreCompetency.find(matchStage).lean()
        ]);

        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // Group assessments by year-term
        const assessmentsByTerm = {};
        for (const a of assessments) {
            const key = `${a.academicYear}-${a.term}`;
            if (!assessmentsByTerm[key]) {
                assessmentsByTerm[key] = [];
            }
            assessmentsByTerm[key].push(a);
        }

        const competencyByTerm = {};
        for (const rec of competencyRecords) {
            competencyByTerm[`${rec.academicYear}-${rec.term}`] = rec;
        }

        const allTermKeys = new Set([...Object.keys(assessmentsByTerm), ...Object.keys(competencyByTerm)]);
        const terms = [];

        for (const key of allTermKeys) {
            const [year, termNo] = key.split('-');
            const termAssessments = assessmentsByTerm[key] || [];
            const competencyRec = competencyByTerm[key] || null;

            // Determine scale from first assessment record (all records in same term share the same student class)
            const scale = (termAssessments[0] && termAssessments[0].gradingScale) || '8-tier';
            const is4Tier = scale === '4-tier';

            const learningAreas = termAssessments.map(a => {
                if (is4Tier) {
                    const grade = calculatePrimaryGrade(a.assessment1, a.assessment2);
                    return {
                        learningArea: a.learningArea,
                        assessment1: a.assessment1,
                        assessment2: a.assessment2,
                        grade: grade,
                        gradingScale: '4-tier',
                        teacherInitial: a.teacherInitial,
                        teacherRemarks: a.teacherRemarks
                    };
                }
                const avg = calculateAverage(a.assessment1, a.assessment2);
                const tier = percentageToTier(avg);
                return {
                    learningArea: a.learningArea,
                    assessment1: a.assessment1,
                    assessment2: a.assessment2,
                    average: avg,
                    tier: tier ? { ...tier, formatted: formatTier(tier) } : null,
                    gradingScale: '8-tier',
                    teacherInitial: a.teacherInitial,
                    teacherRemarks: a.teacherRemarks
                };
            }).sort((a, b) => a.learningArea.localeCompare(b.learningArea));

            let summary;
            if (is4Tier) {
                const rubrics = learningAreas.map(la => la.grade?.rubric).filter(Boolean);
                const overall = calculateOverallCompetency(rubrics);
                summary = { gradingScale: '4-tier', overallCompetency: overall };
            } else {
                const totalMarks = learningAreas.reduce((sum, la) => sum + (la.average || 0), 0);
                const totalPoints = learningAreas.reduce((sum, la) => sum + (la.tier?.points || 0), 0);
                const overallGrade = totalMarksToGrade(totalMarks);
                summary = {
                    gradingScale: '8-tier',
                    totalMarks: Math.round(totalMarks * 100) / 100,
                    totalPoints,
                    overallGrade: overallGrade ? { ...overallGrade, formatted: formatOverallGrade(overallGrade) } : null
                };
            }

            terms.push({
                academicYear: year,
                term: parseInt(termNo, 10),
                learningAreas,
                summary,
                coreCompetencies: competencyRec ? {
                    competencies: competencyRec.competencies,
                    teacherRemarks: competencyRec.teacherRemarks,
                    updatedAt: competencyRec.updatedAt
                } : null
            });
        }

        terms.sort((a, b) => {
            if (a.academicYear !== b.academicYear) return a.academicYear.localeCompare(b.academicYear);
            return a.term - b.term;
        });

        res.status(200).json({
            success: true,
            data: {
                student: {
                    id: student._id,
                    name: student.name,
                    email: student.email,
                    class: student.class || student.profile?.class || ''
                },
                filters: {
                    academicYear: academicYear || 'all',
                    term: term ? parseInt(term, 10) : 'all'
                },
                terms
            }
        });
    } catch (error) {
        console.error('Error generating CBC student summary:', error);
        res.status(500).json({ success: false, message: 'Server error while generating summary' });
    }
};

// @desc    List assessments (filterable by student, term, year, learningArea)
// @route   GET /api/cbc/assessments
// @access  Private (Teacher/Admin)
exports.getAssessments = async (req, res) => {
    try {
        const { student, term, academicYear, learningArea } = req.query;
        const query = {};
        if (student) {
            if (!mongoose.Types.ObjectId.isValid(student)) {
                return res.status(400).json({ success: false, message: 'Invalid student ID' });
            }
            query.student = student;
        }
        if (term) query.term = parseInt(term, 10);
        if (academicYear) query.academicYear = academicYear;
        if (learningArea) query.learningArea = learningArea;

        const assessments = await CBCAssessment.find(query)
            .populate('student', 'name email class')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({ success: true, count: assessments.length, data: assessments });
    } catch (error) {
        console.error('Error fetching CBC assessments:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching assessments' });
    }
};

// ---------------------------------------------------------------------------
// PDF Report Card Generation
// ---------------------------------------------------------------------------

// Builds the per-learning-area view with KJSEA grading and class position
exports.buildTermReportData = buildTermReportData = async (studentId, term, academicYear) => {
    const match = {
        student: new mongoose.Types.ObjectId(studentId),
        term: parseInt(term, 10),
        academicYear
    };

    const [student, assessments, competencyRecord] = await Promise.all([
        User.findById(studentId).select('name email class profile.class').lean(),
        CBCAssessment.find(match).lean(),
        CBCCoreCompetency.findOne(match).lean()
    ]);

    if (!student) return null;

    const studentClass = student.class || student.profile?.class || '';
    const gradingScale = detectGradingScale(studentClass);
    const is4Tier = gradingScale === '4-tier';

    const learningAreas = assessments.map(a => {
        if (is4Tier) {
            const grade = calculatePrimaryGrade(a.assessment1, a.assessment2);
            return {
                learningArea: a.learningArea,
                assessment1: a.assessment1,
                assessment2: a.assessment2,
                grade,
                gradingScale: '4-tier',
                teacherInitial: a.teacherInitial,
                teacherRemarks: a.teacherRemarks
            };
        }
        const avg = calculateAverage(a.assessment1, a.assessment2);
        const tier = percentageToTier(avg);
        return {
            learningArea: a.learningArea,
            assessment1: a.assessment1,
            assessment2: a.assessment2,
            average: avg,
            tier: tier ? { ...tier, formatted: formatTier(tier) } : null,
            gradingScale: '8-tier',
            teacherInitial: a.teacherInitial,
            teacherRemarks: a.teacherRemarks
        };
    }).sort((a, b) => a.learningArea.localeCompare(b.learningArea));

    let summary;
    if (is4Tier) {
        const rubrics = learningAreas.map(la => la.grade?.rubric).filter(Boolean);
        const overallCompetency = calculateOverallCompetency(rubrics);
        summary = {
            gradingScale: '4-tier',
            overallCompetency,
            classPosition: null,
            classSize: null
        };
    } else {
        const totalMarks = learningAreas.reduce((sum, la) => sum + (la.average || 0), 0);
        const totalPoints = learningAreas.reduce((sum, la) => sum + (la.tier?.points || 0), 0);
        const overallGrade = totalMarksToGrade(totalMarks);

        // Calculate class position (8-tier / JSS only)
        let classPosition = null;
        let classSize = 0;
        if (studentClass) {
            const allStudentAssessments = await CBCAssessment.find({
                term: parseInt(term, 10),
                academicYear
            }).lean();

            const studentTotals = new Map();
            for (const a of allStudentAssessments) {
                const sId = String(a.student);
                if (!studentTotals.has(sId)) studentTotals.set(sId, []);
                studentTotals.get(sId).push(a);
            }

            const studentRankings = [];
            for (const [sId, sAssessments] of studentTotals) {
                const sTotal = sAssessments.reduce((sum, a) => {
                    const avg = calculateAverage(a.assessment1, a.assessment2);
                    return sum + (avg || 0);
                }, 0);
                studentRankings.push({ studentId: sId, totalMarks: sTotal });
            }

            studentRankings.sort((a, b) => b.totalMarks - a.totalMarks);
            classSize = studentRankings.length;
            const myIndex = studentRankings.findIndex(r => r.studentId === String(studentId));
            if (myIndex !== -1) classPosition = myIndex + 1;
        }

        summary = {
            gradingScale: '8-tier',
            totalMarks: Math.round(totalMarks * 100) / 100,
            totalPoints,
            overallGrade: overallGrade ? { ...overallGrade, formatted: formatOverallGrade(overallGrade) } : null,
            classPosition,
            classSize
        };
    }

    return {
        student: {
            id: student._id,
            name: student.name,
            email: student.email,
            class: studentClass
        },
        term: parseInt(term, 10),
        academicYear,
        gradingScale,
        learningAreas,
        summary,
        competencies: competencyRecord ? competencyRecord.competencies : null,
        classTeacherRemarks: competencyRecord ? competencyRecord.teacherRemarks : '',
        principalRemarks: '',
        attendance: null
    };
};

// Fallback builder that uses Grade records from the Marks Entry flow when no CBCAssessment data exists yet
const buildTermReportDataFromGrades = async (studentId, term, academicYear) => {
    const termString = `Term ${term}`;
    const year = parseInt(academicYear, 10) || parseInt(String(academicYear).match(/\d{4}/)[0], 10);

    const [student, grades] = await Promise.all([
        User.findById(studentId).select('name email class profile.class').lean(),
        Grade.find({
            student: new mongoose.Types.ObjectId(studentId),
            term: termString,
            year
        }).lean()
    ]);

    if (!student || !grades || grades.length === 0) return null;

    const studentClass = student.class || student.profile?.class || grades[0]?.class || '';
    const gradingScale = detectGradingScale(studentClass);
    const is4Tier = gradingScale === '4-tier';

    const percentageToPrimaryRubric = (p) => {
        if (p === null || p === undefined || isNaN(p)) return null;
        if (p >= 80) return 'EE';
        if (p >= 65) return 'ME';
        if (p >= 50) return 'AE';
        return 'BE';
    };

    const learningAreas = grades.map(g => {
        if (is4Tier) {
            const a1 = percentageToPrimaryRubric(g.assessments?.ass1);
            const a2 = percentageToPrimaryRubric(g.assessments?.ass2);
            const grade = calculatePrimaryGrade(a1, a2) ||
                (g.grade ? { rubric: g.grade, label: g.grade } : null);
            return {
                learningArea: g.subject,
                assessment1: a1,
                assessment2: a2,
                grade,
                gradingScale: '4-tier',
                teacherInitial: '',
                teacherRemarks: g.comments || ''
            };
        }

        const a1 = typeof g.assessments?.ass1 === 'number' ? g.assessments.ass1 : null;
        const a2 = typeof g.assessments?.ass2 === 'number' ? g.assessments.ass2 : null;
        const avg = g.subjectAverage !== null && g.subjectAverage !== undefined
            ? g.subjectAverage
            : calculateAverage(a1, a2);
        const tier = percentageToTier(avg);
        return {
            learningArea: g.subject,
            assessment1: a1,
            assessment2: a2,
            average: avg,
            tier: tier ? { ...tier, formatted: formatTier(tier) } : null,
            gradingScale: '8-tier',
            teacherInitial: '',
            teacherRemarks: g.comments || ''
        };
    }).sort((a, b) => a.learningArea.localeCompare(b.learningArea));

    let summary;
    if (is4Tier) {
        const rubrics = learningAreas.map(la => la.grade?.rubric).filter(Boolean);
        const overallCompetency = calculateOverallCompetency(rubrics);
        summary = {
            gradingScale: '4-tier',
            overallCompetency,
            classPosition: null,
            classSize: null
        };
    } else {
        const totalMarks = learningAreas.reduce((sum, la) => sum + (la.average || 0), 0);
        const totalPoints = grades.reduce((sum, g) => sum + (g.points || 0), 0);
        const overallGrade = totalMarksToGrade(totalMarks);

        let classPosition = null;
        let classSize = 0;
        if (studentClass) {
            const classGrades = await Grade.find({ class: studentClass, term: termString, year }).lean();
            const studentTotals = new Map();
            for (const cg of classGrades) {
                const sid = String(cg.student);
                if (!studentTotals.has(sid)) studentTotals.set(sid, []);
                const avg = cg.subjectAverage !== null && cg.subjectAverage !== undefined
                    ? cg.subjectAverage
                    : calculateAverage(
                          typeof cg.assessments?.ass1 === 'number' ? cg.assessments.ass1 : null,
                          typeof cg.assessments?.ass2 === 'number' ? cg.assessments.ass2 : null
                      );
                studentTotals.get(sid).push(avg || 0);
            }

            const studentRankings = [];
            for (const [sid, avgs] of studentTotals) {
                const total = avgs.reduce((s, v) => s + v, 0);
                studentRankings.push({ studentId: sid, totalMarks: total });
            }
            studentRankings.sort((a, b) => b.totalMarks - a.totalMarks);
            classSize = studentRankings.length;
            const myIndex = studentRankings.findIndex(r => r.studentId === String(studentId));
            if (myIndex !== -1) classPosition = myIndex + 1;
        }

        summary = {
            gradingScale: '8-tier',
            totalMarks: Math.round(totalMarks * 100) / 100,
            totalPoints,
            overallGrade: overallGrade ? { ...overallGrade, formatted: formatOverallGrade(overallGrade) } : null,
            classPosition,
            classSize
        };
    }

    return {
        student: {
            id: student._id,
            name: student.name,
            email: student.email,
            class: studentClass
        },
        term,
        academicYear,
        gradingScale,
        learningAreas,
        summary,
        competencies: null,
        classTeacherRemarks: '',
        principalRemarks: '',
        attendance: null
    };
};

// @desc    Generate (or serve cached) CBC PDF report card
// @route   GET /api/cbc/report-card/:studentId?term=1&academicYear=2026-2027&download=true&regenerate=true
// @access  Private (Teacher/Admin)
exports.getReportCard = async (req, res) => {
    try {
        const { studentId } = req.params;
        let { term, academicYear, download, regenerate } = req.query;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ success: false, message: 'Invalid student ID' });
        }
        if (!term || !academicYear) {
            return res.status(400).json({
                success: false,
                message: 'Both term and academicYear query parameters are required (e.g., ?term=1&academicYear=2026-2027)'
            });
        }

        // Normalize term: accept '1', 'Term 1', etc.
        const termMatch = String(term).match(/\d+/);
        term = termMatch ? parseInt(termMatch[0], 10) : null;
        if (!term || ![1, 2, 3].includes(term)) {
            return res.status(400).json({ success: false, message: 'Term must be 1, 2, or 3' });
        }

        // Normalize academicYear: accept a single year (2026) and expand to 2026-2027
        const year = String(academicYear).match(/\d{4}/);
        if (!year) {
            return res.status(400).json({ success: false, message: 'academicYear must be a valid 4-digit year' });
        }
        academicYear = academicYear.includes('-') ? academicYear : `${year[0]}-${parseInt(year[0], 10) + 1}`;

        // Predictable, unique file name
        const safeYear = academicYear.replace(/[^\d-]/g, '');
        const fileName = `report_card_${studentId}_${safeYear}_term${term}.pdf`;
        const filePath = path.join(REPORT_CARD_DIR, fileName);
        const publicPath = `/downloads/report-cards/${fileName}`;

        // Serve instantly from cache unless regeneration requested
        let cached = false;
        if (regenerate !== 'true') {
            try {
                await fsp.access(filePath);
                cached = true;
            } catch (e) { /* not cached; generate below */ }
        }

        if (!cached) {
            let reportData = await buildTermReportData(studentId, term, academicYear);
            if (!reportData) {
                return res.status(404).json({ success: false, message: 'Student not found' });
            }
            if (reportData.learningAreas.length === 0 && !reportData.competencies) {
                const gradeReportData = await buildTermReportDataFromGrades(studentId, term, academicYear);
                if (gradeReportData && gradeReportData.learningAreas.length > 0) {
                    reportData = gradeReportData;
                } else {
                    return res.status(404).json({
                        success: false,
                        message: `No CBC data recorded for this student in Term ${term}, ${academicYear}. Please enter and save marks first.`
                    });
                }
            }
            await generateReportPdf(reportData, filePath);
        }

        // Stream the file directly if requested
        if (download === 'true') {
            return res.download(filePath, fileName);
        }

        res.status(200).json({
            success: true,
            cached,
            data: {
                studentId,
                term: parseInt(term, 10),
                academicYear,
                fileName,
                filePath: publicPath,
                downloadUrl: `/api/cbc/report-card/${studentId}?term=${term}&academicYear=${academicYear}&download=true`
            }
        });
    } catch (error) {
        console.error('Error generating CBC report card:', error);
        res.status(500).json({ success: false, message: 'Server error while generating report card' });
    }
};
