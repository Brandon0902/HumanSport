const mongoose = require('mongoose');
const { trim } = require('validator');

const InstructorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    speciality: {
        type: String,
        required: true,
        trim: true
    },
    birthdate: {
        type: Date,
        require: true,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Instructor', InstructorSchema);
