const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    capacity: {
        type: Number,
        required: true,
        min: 1
    },
    instructorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Instructor',
        required: true
    },
    status: {
        type: String,
        default: 'active',
        enum: ['active', 'inactive'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    classDay: [
        {   day: String,
            time: String,
            startDate: String,
            endDate: String
        }
    ],
    instructor:[
        {
            name: String
        }
    ],

}, {
    timestamps: true
});

module.exports = mongoose.model('Course', CourseSchema);
