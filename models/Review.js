const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    // unique: true means Mongo itself rejects a second review for the same booking
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: [true, 'Rating is required'], min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

reviewSchema.index({ provider: 1 });

module.exports = mongoose.model('Review', reviewSchema);
