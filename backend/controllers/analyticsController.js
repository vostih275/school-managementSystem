const Grade = require('../models/Grade');
const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { detectGradingScale } = require('../utils/cbcGradingEngine');

/**
 * Compute class analytics for a given class, term, and year.
 * Returns per-student averages, positions, and term-over-term improvement.
 */
exports.getClassAnalytics = asyncHandler(async (req, res, next) => {
    const { className } = req.params;
    const { term, year } = req.query;

    if (!className || !term || !year) {
        return next(new ErrorResponse('className, term, and year are required', 400));
    }

    const recordYear = Number(year);

    // Fetch current term marks for the class
    const currentMarks = await Grade.find({
        class: className,
        term,
        year: recordYear
    }).populate('student', 'name email');

    if (currentMarks.length === 0) {
        return res.status(200).json({
            success: true,
            message: 'No marks found for the specified criteria',
            data: {
                className,
                term,
                year: recordYear,
                students: [],
                subjectSummaries: []
            }
        });
    }

    // Group current marks by student
    const byStudent = {};
    for (const mark of currentMarks) {
        const sid = mark.student._id.toString();
        if (!byStudent[sid]) {
            byStudent[sid] = {
                studentId: sid,
                name: mark.studentName || mark.student?.name || 'Unknown',
                email: mark.student?.email || '',
                subjects: {}
            };
        }
        byStudent[sid].subjects[mark.subject] = {
            assessments: mark.assessments,
            subjectAverage: mark.subjectAverage,
            grade: mark.grade,
            points: mark.points
        };
    }

    // Determine previous term for improvement calculation
    const termMap = { 'Term 1': null, 'Term 2': 'Term 1', 'Term 3': 'Term 2' };
    const previousTerm = termMap[term];
    let previousAverages = {};

    if (previousTerm) {
        const previousMarks = await Grade.find({
            class: className,
            term: previousTerm,
            year: recordYear
        });
        for (const mark of previousMarks) {
            const sid = mark.student.toString();
            if (!previousAverages[sid]) {
                previousAverages[sid] = { total: 0, count: 0 };
            }
            previousAverages[sid].total += mark.subjectAverage || 0;
            previousAverages[sid].count += 1;
        }
    }

    // Compute per-student overall averages and improvement
    const studentResults = Object.values(byStudent).map(student => {
        const subjectList = Object.values(student.subjects);
        const total = subjectList.reduce((sum, s) => sum + (s.subjectAverage || 0), 0);
        const count = subjectList.length;
        const average = count ? total / count : 0;

        const prev = previousAverages[student.studentId];
        const previousAverage = prev && prev.count ? prev.total / prev.count : null;
        const improvement = previousAverage !== null ? (average - previousAverage) : null;

        return {
            ...student,
            average: parseFloat(average.toFixed(2)),
            previousAverage: previousAverage !== null ? parseFloat(previousAverage.toFixed(2)) : null,
            improvement: improvement !== null ? parseFloat(improvement.toFixed(2)) : null
        };
    });

    // Sort by average descending and assign positions
    studentResults.sort((a, b) => b.average - a.average);
    let lastAvg = null;
    let lastPos = 0;
    studentResults.forEach((student, index) => {
        if (student.average !== lastAvg) {
            lastPos = index + 1;
            lastAvg = student.average;
        }
        student.position = lastPos;
    });

    // Subject-level summaries
    const subjectSummaries = {};
    for (const mark of currentMarks) {
        if (!subjectSummaries[mark.subject]) {
            subjectSummaries[mark.subject] = { total: 0, count: 0, highest: -Infinity, lowest: Infinity };
        }
        const avg = mark.subjectAverage || 0;
        subjectSummaries[mark.subject].total += avg;
        subjectSummaries[mark.subject].count += 1;
        subjectSummaries[mark.subject].highest = Math.max(subjectSummaries[mark.subject].highest, avg);
        subjectSummaries[mark.subject].lowest = Math.min(subjectSummaries[mark.subject].lowest, avg);
    }

    const subjectSummaryList = Object.entries(subjectSummaries).map(([subject, stats]) => ({
        subject,
        average: parseFloat((stats.total / stats.count).toFixed(2)),
        highest: stats.highest === -Infinity ? 0 : parseFloat(stats.highest.toFixed(2)),
        lowest: stats.lowest === Infinity ? 0 : parseFloat(stats.lowest.toFixed(2)),
        candidateCount: stats.count
    }));

    res.status(200).json({
        success: true,
        data: {
            className,
            term,
            year: recordYear,
            previousTerm,
            scale: detectGradingScale(className),
            studentCount: studentResults.length,
            students: studentResults,
            subjectSummaries: subjectSummaryList
        }
    });
});

/**
 * Get improvement trends for a single student across all terms in a year.
 */
exports.getStudentTrends = asyncHandler(async (req, res, next) => {
    const { studentId } = req.params;
    const { year } = req.query;

    const recordYear = Number(year) || new Date().getFullYear();

    const student = await User.findById(studentId).select('name class profile.class').lean();
    if (!student) {
        return next(new ErrorResponse('Student not found', 404));
    }

    const marks = await Grade.find({
        student: studentId,
        year: recordYear
    });

    const byTerm = { 'Term 1': [], 'Term 2': [], 'Term 3': [] };
    for (const mark of marks) {
        if (byTerm[mark.term]) {
            byTerm[mark.term].push({
                subject: mark.subject,
                subjectAverage: mark.subjectAverage,
                grade: mark.grade,
                points: mark.points
            });
        }
    }

    const trends = Object.entries(byTerm).map(([term, subjects]) => {
        const total = subjects.reduce((sum, s) => sum + (s.subjectAverage || 0), 0);
        const count = subjects.length;
        const average = count ? total / count : 0;
        return {
            term,
            subjectCount: count,
            average: parseFloat(average.toFixed(2)),
            subjects
        };
    });

    res.status(200).json({
        success: true,
        data: {
            studentId,
            name: student.name || 'Unknown Student',
            className: student.class || student.profile?.class || '',
            year: recordYear,
            trends
        }
    });
});
