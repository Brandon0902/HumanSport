const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  membershipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Membership',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  method: {
    type: String,
    enum: ['paypal', 'cash'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
}, 
{
  timestamps: true
});


module.exports = mongoose.model('Payment', PaymentSchema);
