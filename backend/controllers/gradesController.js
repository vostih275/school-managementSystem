const Grade = require('../models/Grade');
const User = require('../models/User');

// Add Grade
exports.addGrade = async (req, res) => {
    try {
        const { student, subject, term, year, assessments, comments } = req.body;

        const studentUser = await User.findById(student).select('name class profile.class');
        if (!studentUser) {
            return res.status(404).json({ msg: "Student not found" });
        }

        const currentYear = new Date().getFullYear();
        const grade = new Grade({
            student,
            studentName: studentUser.name,
            class: studentUser.class || studentUser.profile?.class || '',
            subject,
            term: term || 'Term 1',
            year: Number(year) || currentYear,
            teacher: req.user.id,
            assessments: {
                ass1: assessments?.ass1 ?? null,
                ass2: assessments?.ass2 ?? null,
                ass3: assessments?.ass3 ?? null,
                ass4: assessments?.ass4 ?? null
            },
            comments: comments || ''
        });

        await grade.save();
        res.json({ msg: "Grade added successfully!", grade });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get Student Grades
exports.getStudentGrades = async (req, res) => {
    try {
        const grades = req.user.role === 'student' 
            ? await Grade.find({ student: req.user.id }).populate('student', 'name')
            : await Grade.find().populate('student', 'name');
        
        res.json(grades);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update Grade
exports.updateGrade = async (req, res) => {
    try {
        const { term, year, assessments, comments, isFinalized } = req.body;

        const grade = await Grade.findById(req.params.id);
        if (!grade) return res.status(404).json({ msg: "Grade not found" });

        if (term) grade.term = term;
        if (year) grade.year = Number(year);
        if (comments !== undefined) grade.comments = comments;
        if (isFinalized !== undefined) grade.isFinalized = Boolean(isFinalized);

        if (assessments) {
            grade.assessments.ass1 = assessments.ass1 ?? grade.assessments.ass1;
            grade.assessments.ass2 = assessments.ass2 ?? grade.assessments.ass2;
            grade.assessments.ass3 = assessments.ass3 ?? grade.assessments.ass3;
            grade.assessments.ass4 = assessments.ass4 ?? grade.assessments.ass4;
        }

        await grade.save();
        res.json({ msg: "Grade updated successfully", grade });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete Grade
exports.deleteGrade = async (req, res) => {
    try {
        const grade = await Grade.findById(req.params.id);
        if (!grade) return res.status(404).json({ msg: "Grade not found" });

        await grade.deleteOne();
        res.json({ msg: "Grade deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
