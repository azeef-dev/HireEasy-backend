const mongoose = require('mongoose');
const { BOOKING_STATUSES } = require('../utils/constants');

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, unique: true }, // human-readable, e.g. SK-M0X9F2A1-7B3C1E
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    service: { type: String, required: [true, 'Service is required'], trim: true },
    date: { type: Date, required: [true, 'Date is required'] },
    time: { type: String, required: [true, 'Time is required'], trim: true },
    location: { type: String, required: [true, 'Location is required'], trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: BOOKING_STATUSES, default: 'pending' },
  },
  { timestamps: true }
);

bookingSchema.index({ customer: 1 });
bookingSchema.index({ provider: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
