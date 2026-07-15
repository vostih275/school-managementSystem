const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: false },
    dueDate: { type: Date, required: true },
    classAssigned: { type: String, required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    file: { type: String, required: false },
    cloudinaryPublicId: { type: String }, // Cloudinary public_id for deletion
    students: [{
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        grade: { type: Number },
        submissionDate: { type: Date },
        submissionFile: { type: String },
        cloudinaryPublicId: { type: String } // Cloudinary public_id for submission file deletion
    }]
}, { timestamps: true });

module.exports = mongoose.model('Assignment', AssignmentSchema);
