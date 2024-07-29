const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    user: [
        {   firstName: String,
            phone: String
        }
    ],

    course: [
        {
            name: String,
            description: String
        }
    ],
  status: {
    type: String,
    enum: ['active', 'deleted'],
    default: 'active'
  },
  comments: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', BookingSchema);
