const mongoose = require('mongoose');
const { detectGradingScale, percentageToTier, formatTier } = require('../utils/cbcGradingEngine');

// Primary 4-tier rubric thresholds (CBC: EE > ME > AE > BE)
const PRIMARY_TIER_ORDER = ['EE', 'ME', 'AE', 'BE'];
const percentageToPrimaryRubric = (percentage) => {
    if (percentage === null || percentage === undefined || isNaN(percentage)) return null;
    if (percentage >= 80) return 'EE';
    if (percentage >= 65) return 'ME';
    if (percentage >= 50) return 'AE';
    return 'BE';
};

const GradeSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    studentName: {
        type: String,
        required: true
    },
    class: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    term: {
        type: String,
        required: true,
        enum: ['Term 1', 'Term 2', 'Term 3']
    },
    year: {
        type: Number,
        required: true,
        index: true
    },
    assessments: {
        ass1: { type: Number, default: null, min: 0, max: 100 },
        ass2: { type: Number, default: null, min: 0, max: 100 },
        ass3: { type: Number, default: null, min: 0, max: 100 },
        ass4: { type: Number, default: null, min: 0, max: 100 }
    },
    subjectAverage: {
        type: Number,
        default: null,
        min: 0,
        max: 100
    },
    grade: {
        type: String,
        default: ''
    },
    points: {
        type: Number,
        default: null
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    comments: {
        type: String,
        default: ''
    },
    isFinalized: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound index for one set of assessments per student/subject/term/year
GradeSchema.index({ student: 1, subject: 1, term: 1, year: 1 }, { unique: true });

// Pre-save hook: sync student name, compute average and CBC grade/points
GradeSchema.pre('save', async function(next) {
    // Fetch student name if missing
    if (!this.studentName && this.student) {
        try {
            const User = mongoose.model('User');
            const student = await User.findById(this.student);
            if (student) {
                this.studentName = student.name;
            }
        } catch (error) {
            return next(error);
        }
    }

    // Compute subject average from the four assessments
    const values = [
        this.assessments?.ass1,
        this.assessments?.ass2,
        this.assessments?.ass3,
        this.assessments?.ass4
    ].filter(v => typeof v === 'number' && !isNaN(v));

    if (values.length > 0) {
        const average = values.reduce((sum, v) => sum + v, 0) / values.length;
        this.subjectAverage = Math.round(average * 100) / 100;

        // Compute CBC grade and points from average
        const scale = detectGradingScale(this.class);
        if (scale === 'primary') {
            // Primary uses 4-tier rubric; store the rubric code in grade, points stay null
            const rubric = percentageToPrimaryRubric(average);
            this.grade = rubric || '';
            this.points = null;
        } else {
            // JSS uses 8-tier KJSEA scale
            const tier = percentageToTier(average);
            this.grade = tier ? formatTier(tier) : '';
            this.points = tier ? tier.points : null;
        }
    } else {
        this.subjectAverage = null;
        this.grade = '';
        this.points = null;
    }

    next();
});

module.exports = mongoose.model('Grade', GradeSchema);
