const ReportCard = require('../models/ReportCard');
const User = require('../models/User');
const Grade = require('../models/Grade');
const { JUNIOR_SECONDARY_SUBJECTS } = require('../config/subjects');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const { promisify } = require('util');
const writeFileAsync = promisify(fsSync.writeFile);
const mkdirAsync = promisify(fsSync.mkdir);
const accessAsync = promisify(fsSync.access);

// Ensure directory exists helper with promise
const ensureDirExists = async (dir) => {
    try {
        await accessAsync(dir);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await mkdirAsync(dir, { recursive: true });
        } else {
            throw error;
        }
    }
};

// Helper function to ensure directory exists
const ensureDirectoryExists = async (dir) => {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') {
            throw err;
        }
    }
};

// Helper function to generate PDF from HTML
const generatePdfFromHtml = async (html, outputPath) => {
    console.log(`Attempting to generate PDF at: ${outputPath}`);
    console.log(`Generating PDF at: ${outputPath}`);
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        // Generate PDF
        await page.pdf({
            path: outputPath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            }
        });
        
        console.log(`PDF generated successfully at: ${outputPath}`);
        return outputPath;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    } finally {
        await browser.close();
    }
};

// Send report card to student
const sendReportCard = async (req, res) => {
    const session = await ReportCard.startSession();
    session.startTransaction();
    
    try {
        const { studentId, term, year, comments } = req.body;
        const file = req.file;
        
        // Validate required fields
        if (!studentId || !term || !year) {
            return res.status(400).json({
                success: false,
                message: 'Student ID, term, and year are required'
            });
        }
        
        // Check if student exists
        const student = await User.findById(studentId).session(session);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        
        // Create report card record
        const reportCard = new ReportCard({
            studentId,
            studentName: student.name,
            term,
            year,
            comments: comments || '',
            status: 'sent',
            uploadedBy: req.user.id
        });
        
        // If file was uploaded, save file path
        if (file) {
            const fileExt = path.extname(file.originalname);
            const fileName = `report-${Date.now()}${fileExt}`;
            const filePath = path.join('uploads', 'report-cards', fileName);
            
            // Ensure directory exists
            await ensureDirectoryExists(path.dirname(filePath));
            
            // Move file to uploads directory
            await fs.rename(file.path, filePath);
            
            // Update report card with file path
            reportCard.fileUrl = `/uploads/report-cards/${fileName}`;
        }
        
        // Save report card to database
        await reportCard.save({ session });
        
        // Commit transaction
        await session.commitTransaction();
        
        res.status(201).json({
            success: true,
            message: 'Report card sent successfully',
            data: reportCard
        });
        
    } catch (error) {
        await session.abortTransaction();
        console.error('Error sending report card:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending report card',
            error: error.message
        });
    } finally {
        session.endSession();
    }
};

// Get report cards for a student
const getStudentReportCards = async (req, res) => {
    try {
        const { studentId } = req.params;
        
        // Build query based on user role
        let query = {};
        
        // If no studentId is provided, use the current user's ID for students
        // Admins and teachers can see all report cards
        if (req.user.role === 'student' && !studentId) {
            query.studentId = req.user.id;
        } else if (studentId) {
            // If a specific studentId is provided, check permissions
            if (req.user.role === 'student' && req.user.id !== studentId) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view these report cards'
                });
            }
            query.studentId = studentId;
        }
        // If no studentId and user is admin/teacher, query will be empty to return all
        
        console.log('Fetching report cards with query:', {
            query,
            userRole: req.user.role,
            userId: req.user.id,
            requestedStudentId: studentId
        });
        
        // Find all matching report cards
        const reportCards = await ReportCard.find(query)
            .sort({ year: -1, term: -1 })
            .populate('studentId', 'name email')
            .populate('uploadedBy', 'name');
        
        console.log(`Found ${reportCards.length} report cards`);
        
        res.status(200).json({
            success: true,
            count: reportCards.length,
            data: reportCards
        });
        
    } catch (error) {
        console.error('Error fetching student report cards:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching report cards',
            error: error.message
        });
    }
};

// Get a single report card
const getReportCard = async (req, res) => {
    const session = await ReportCard.startSession();
    session.startTransaction();
    
    try {
        const { id } = req.params;
        
        // Find the report card
        const reportCard = await ReportCard.findById(id).session(session);
        
        if (!reportCard) {
            return res.status(404).json({
                success: false,
                message: 'Report card not found'
            });
        }
        
        // Check if the user is authorized to view this report card
        if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.id !== reportCard.studentId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this report card'
            });
        }
        
        // If the report card has a file URL, read the file
        let fileContent = null;
        if (reportCard.fileUrl) {
            try {
                const filePath = path.join(__dirname, '..', reportCard.fileUrl);
                fileContent = await fs.readFile(filePath, 'utf8');
            } catch (fileError) {
                console.warn(`Report card file not found: ${reportCard.fileUrl}`);
                // Continue without file content if not found
            }
        }
        
        // Format the response
        const responseData = {
            id: reportCard._id,
            studentId: reportCard.studentId,
            studentName: reportCard.studentName,
            year: reportCard.year,
            term: reportCard.term,
            status: reportCard.status,
            comments: reportCard.comments,
            htmlContent: reportCard.htmlContent || fileContent,
            fileUrl: reportCard.fileUrl,
            uploadedBy: reportCard.uploadedBy,
            createdAt: reportCard.createdAt,
            updatedAt: reportCard.updatedAt
        };
        
        await session.commitTransaction();
        
        res.status(200).json({
            success: true,
            data: responseData
        });
        
    } catch (error) {
        console.error('Error in getReportCard:', error);
        
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to fetch report card',
            error: error.message
        });
    } finally {
        session.endSession();
    }
};

// Get all report cards
const getAllReportCards = async (req, res) => {
    try {
        // Get all report cards with student information
        const reportCards = await ReportCard.find()
            .populate('studentId', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: reportCards.length,
            data: reportCards
        });
    } catch (error) {
        console.error('Error fetching report cards:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Helper: first available assessment (ASS1 -> ASS4)
function getFirstAssessment(assessments = {}) {
    for (const key of ['ass1', 'ass2', 'ass3', 'ass4']) {
        const val = assessments[key];
        if (typeof val === 'number' && !isNaN(val)) return val;
    }
    return null;
}

// Helper: latest available assessment (ASS4 -> ASS1)
function getLatestAssessment(assessments = {}) {
    for (const key of ['ass4', 'ass3', 'ass2', 'ass1']) {
        const val = assessments[key];
        if (typeof val === 'number' && !isNaN(val)) return val;
    }
    return null;
}

// Helper: improvement trend for a subject
function getImprovement(assessments = {}) {
    const first = getFirstAssessment(assessments);
    const latest = getLatestAssessment(assessments);
    if (first === null || latest === null) return 'N/A';
    if (latest > first) return 'Improving';
    if (latest < first) return 'Declining';
    return 'Constant';
}

// Helper: average of an array of numbers
function average(values) {
    const valid = values.filter(v => typeof v === 'number' && !isNaN(v));
    if (!valid.length) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// Helper: standard competition rank (number of strictly higher values + 1)
function rank(value, allValues) {
    return allValues.filter(v => v > value).length + 1;
}

// @desc    Generate comprehensive report card data
// @route   GET /api/reports/generate/:studentId/:term/:year
// @access  Private
const generateComprehensiveReport = async (req, res) => {
    try {
        const { studentId, term, year } = req.params;
        const recordYear = Number(year);

        if (!studentId || !term || isNaN(recordYear)) {
            return res.status(400).json({
                success: false,
                message: 'studentId, term, and a valid year are required'
            });
        }

        const student = await User.findById(studentId).lean();
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const studentGrades = await Grade.find({
            student: studentId,
            term,
            year: recordYear
        }).lean();

        if (studentGrades.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No marks found for this student in ${term}, ${recordYear}. Please enter and save marks first.`
            });
        }

        const studentClass = studentGrades[0].class || student.class || student.profile?.class || '';
        if (!studentClass) {
            return res.status(400).json({
                success: false,
                message: 'Student class not found'
            });
        }

        // All grades in the same class, term and year
        const classGrades = await Grade.find({
            class: studentClass,
            term,
            year: recordYear
        }).populate('student', 'name').lean();

        // Compute each class student's term average
        const studentTermMap = {};
        for (const g of classGrades) {
            const sid = g.student._id.toString();
            const subjectAverage = average([
                g.assessments?.ass1,
                g.assessments?.ass2,
                g.assessments?.ass3,
                g.assessments?.ass4
            ]);

            if (!studentTermMap[sid]) {
                studentTermMap[sid] = { name: g.student?.name || g.studentName, averages: [] };
            }
            studentTermMap[sid].averages.push(subjectAverage);
        }

        const classAverages = Object.entries(studentTermMap).map(([sid, data]) => {
            const totalMarks = data.averages.reduce((a, b) => a + b, 0);
            return {
                studentId: sid,
                name: data.name,
                totalMarks,
                termAverage: data.averages.length ? totalMarks / data.averages.length : 0
            };
        });

        const studentRecord = classAverages.find(s => s.studentId === studentId);
        const termAverage = studentRecord ? studentRecord.termAverage : 0;
        const classPosition = rank(studentRecord ? studentRecord.totalMarks : 0, classAverages.map(s => s.totalMarks));
        const classSize = classAverages.length;

        // Build per-subject report data
        const subjects = studentGrades.map(g => {
            const assessments = g.assessments || {};
            const values = [
                assessments.ass1,
                assessments.ass2,
                assessments.ass3,
                assessments.ass4
            ].filter(v => typeof v === 'number' && !isNaN(v));
            const subjectAverage = values.length
                ? values.reduce((a, b) => a + b, 0) / values.length
                : 0;

            // All students' averages for this subject
            const subjectClassValues = classGrades
                .filter(cg => cg.subject === g.subject)
                .map(cg => average([
                    cg.assessments?.ass1,
                    cg.assessments?.ass2,
                    cg.assessments?.ass3,
                    cg.assessments?.ass4
                ]));

            const subjectPosition = rank(subjectAverage, subjectClassValues);
            const jssSubject = JUNIOR_SECONDARY_SUBJECTS.find(s => s.name === g.subject);

            return {
                subject: g.subject,
                subjectCode: jssSubject ? jssSubject.code : '',
                shortName: jssSubject ? jssSubject.shortName : '',
                assessments: {
                    ass1: assessments.ass1 ?? null,
                    ass2: assessments.ass2 ?? null,
                    ass3: assessments.ass3 ?? null,
                    ass4: assessments.ass4 ?? null
                },
                subjectAverage: parseFloat(subjectAverage.toFixed(2)),
                grade: g.grade || '',
                points: g.points ?? null,
                improvement: getImprovement(assessments),
                subjectPosition,
                totalStudents: subjectClassValues.length
            };
        });

        // Enforce official JSS subject order (901–912) when codes are present
        subjects.sort((a, b) => {
            const codeA = a.subjectCode ? parseInt(a.subjectCode, 10) : Infinity;
            const codeB = b.subjectCode ? parseInt(b.subjectCode, 10) : Infinity;
            if (codeA !== codeB) return codeA - codeB;
            return (a.subject || '').localeCompare(b.subject || '');
        });

        res.status(200).json({
            success: true,
            data: {
                student: {
                    id: student._id,
                    name: student.name || 'Unknown Student',
                    class: studentClass
                },
                term,
                year: recordYear,
                termAverage: parseFloat(termAverage.toFixed(2)),
                classSize,
                classPosition,
                subjects
            }
        });
    } catch (error) {
        console.error('Error generating comprehensive report:', error);
        res.status(500).json({
            success: false,
            message: 'Server error generating report card',
            error: error.message
        });
    }
};

module.exports = {
    sendReportCard,
    getStudentReportCards,
    getReportCard,
    getAllReportCards,
    generateComprehensiveReport
};
