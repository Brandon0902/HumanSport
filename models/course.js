const mongoose = require('mongoose');
const Schema = mongoose.Schema; 
const CourseSchema = new Schema({
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
        {
            day: String,
            time: String,
            startDate: String,
            endDate: String
        }
    ],
    instructor: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Instructor'
        }
    ]
}, {
    timestamps: true
});

module.exports = mongoose.model('Course', CourseSchema);
