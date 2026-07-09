const mongoose = require('mongoose');

const competencyScore = {
    type: Number,
    min: [1, 'Competency score must be between 1 and 4'],
    max: [4, 'Competency score must be between 1 and 4'],
    validate: {
        validator: v => v === undefined || v === null || Number.isInteger(v),
        message: 'Competency score must be an integer'
    }
};

const cbcCoreCompetencySchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student reference is required'],
        index: true
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
    competencies: {
        communication: competencyScore,
        criticalThinking: competencyScore,
        creativity: competencyScore,
        citizenship: competencyScore,
        digitalLiteracy: competencyScore,
        learningToLearn: competencyScore,
        selfEfficacy: competencyScore
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

// One competency record per student per term per academic year
cbcCoreCompetencySchema.index({ student: 1, academicYear: 1, term: 1 }, { unique: true });

module.exports = mongoose.models.CBCCoreCompetency || mongoose.model('CBCCoreCompetency', cbcCoreCompetencySchema);
