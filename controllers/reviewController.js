const asyncHandler = require('../utils/asyncHandler');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const User = require('../models/User');

// @desc    Customer submits a 1-5 star review for a completed booking
// @route   POST /api/reviews   body: { booking: <bookingObjectId>, rating, comment }
// @access  Private/User
const createReview = asyncHandler(async (req, res) => {
  const { booking: bookingId, rating, comment } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (!booking.customer.equals(req.user._id)) {
    res.status(403);
    throw new Error('You can only review your own bookings');
  }

  if (booking.status !== 'completed') {
    res.status(400);
    throw new Error('You can only review a completed booking');
  }

  const existingReview = await Review.findOne({ booking: booking._id });
  if (existingReview) {
    res.status(400);
    throw new Error('This booking has already been reviewed');
  }

  const review = await Review.create({
    booking: booking._id,
    customer: req.user._id,
    provider: booking.provider,
    rating,
    comment,
  });

  // Recalculate the provider's average rating from all their reviews
  const stats = await Review.aggregate([
    { $match: { provider: booking.provider } },
    { $group: { _id: '$provider', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  if (stats.length > 0) {
    await User.findByIdAndUpdate(booking.provider, {
      rating: Math.round(stats[0].avgRating * 10) / 10,
      reviewCount: stats[0].count,
    });
  }

  res.status(201).json(review);
});

// @desc    Get all reviews for a provider
// @route   GET /api/reviews/provider/:providerId
// @access  Public
const getProviderReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ provider: req.params.providerId })
    .populate('customer', 'name')
    .sort({ createdAt: -1 });
  res.json(reviews);
});

module.exports = { createReview, getProviderReviews };
