const mongoose = require('mongoose');
const { isValidRubric, detectGradingScale } = require('../utils/cbcGradingEngine');

const cbcAssessmentSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student reference is required'],
        index: true
    },
    learningArea: {
        type: String,
        required: [true, 'Learning area is required'],
        trim: true
    },
    term: {
        type: Number,
        required: [true, 'Term is required'],
        enum: {
            values: [1, 2, 3],
            message: 'Term must be 1, 2, or 3'
        }
    },
    academicYear: {
        type: String,
        required: [true, 'Academic year is required'],
        match: [/^\d{4}(-\d{4})?$/, 'Academic year must be in format YYYY or YYYY-YYYY']
    },
    gradingScale: {
        type: String,
        enum: {
            values: ['4-tier', '8-tier'],
            message: 'gradingScale must be \'4-tier\' or \'8-tier\''
        },
        default: '8-tier'
    },
    assessment1: {
        type: mongoose.Schema.Types.Mixed,
        validate: {
            validator: function (v) {
                if (v === null || v === undefined) return true;
                const scale = this.gradingScale || detectGradingScale(this._classHint || '');
                if (scale === '4-tier') return isValidRubric(v);
                return typeof v === 'number' && v >= 0 && v <= 100;
            },
            message: 'assessment1 must be a number 0-100 for 8-tier, or EE/ME/AE/BE for 4-tier'
        }
    },
    assessment2: {
        type: mongoose.Schema.Types.Mixed,
        validate: {
            validator: function (v) {
                if (v === null || v === undefined) return true;
                const scale = this.gradingScale || detectGradingScale(this._classHint || '');
                if (scale === '4-tier') return isValidRubric(v);
                return typeof v === 'number' && v >= 0 && v <= 100;
            },
            message: 'assessment2 must be a number 0-100 for 8-tier, or EE/ME/AE/BE for 4-tier'
        }
    },
    teacherInitial: {
        type: String,
        trim: true,
        uppercase: true,
        maxLength: 10,
        description: 'Teacher initials (e.g., A.L, K.S)'
    },
    teacherRemarks: {
        type: String,
        default: '',
        trim: true
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound index for optimized termly summary aggregation
cbcAssessmentSchema.index({ student: 1, academicYear: 1, term: 1, learningArea: 1 });

module.exports = mongoose.models.CBCAssessment || mongoose.model('CBCAssessment', cbcAssessmentSchema);
