const asyncHandler = require('../utils/asyncHandler');
const Booking = require('../models/Booking');
const User = require('../models/User');
const generateBookingId = require('../utils/generateBookingId');
const { ALLOWED_TRANSITIONS } = require('../utils/constants');

// @desc    Customer creates a booking request
// @route   POST /api/bookings
// @access  Private/User
const createBooking = asyncHandler(async (req, res) => {
  const { provider, service, date, time, location, description } = req.body;

  const providerUser = await User.findOne({ _id: provider, role: 'provider' });
  if (!providerUser) {
    res.status(404);
    throw new Error('Selected provider does not exist');
  }

  if (!providerUser.isVerified || !providerUser.isActive) {
    res.status(400);
    throw new Error('This provider is not currently accepting bookings');
  }

  let booking = null;
  let attempts = 0;

  // bookingId collisions are astronomically unlikely, but retry a
  // couple of times rather than trust that instead of failing loudly.
  while (!booking && attempts < 5) {
    try {
      booking = await Booking.create({
        bookingId: generateBookingId(),
        customer: req.user._id,
        provider,
        service,
        date,
        time,
        location,
        description,
      });
    } catch (error) {
      if (error.code === 11000 && error.keyPattern && error.keyPattern.bookingId) {
        attempts += 1;
      } else {
        throw error;
      }
    }
  }

  if (!booking) {
    res.status(500);
    throw new Error('Could not generate a unique booking ID, please try again');
  }

  res.status(201).json(booking);
});

// @desc    Get the logged-in customer's own bookings
// @route   GET /api/bookings/my
// @access  Private/User
const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ customer: req.user._id })
    .populate('provider', 'name serviceCategory location')
    .sort({ createdAt: -1 });
  res.json(bookings);
});

// @desc    Get incoming bookings for the logged-in provider
// @route   GET /api/bookings/provider
// @access  Private/Provider
const getProviderBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ provider: req.user._id })
    .populate('customer', 'name phone')
    .sort({ createdAt: -1 });
  res.json(bookings);
});

// @desc    Get one booking (only its customer/provider, or staff, may view it)
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('customer', 'name phone')
    .populate('provider', 'name serviceCategory location');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const isOwner =
    booking.customer._id.equals(req.user._id) || booking.provider._id.equals(req.user._id);
  const isStaff = ['admin', 'superadmin'].includes(req.user.role);

  if (!isOwner && !isStaff) {
    res.status(403);
    throw new Error('Not authorized to view this booking');
  }

  res.json(booking);
});

// @desc    Provider accepts/rejects/advances a booking's status
// @route   PATCH /api/bookings/:id/status
// @access  Private/Provider
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (!booking.provider.equals(req.user._id)) {
    res.status(403);
    throw new Error('Only the assigned provider can update this booking');
  }

  // Enforces: rejected -> in-progress is blocked, completed is locked, etc.
  const allowedNext = ALLOWED_TRANSITIONS[booking.status] || [];
  if (!allowedNext.includes(status)) {
    res.status(400);
    throw new Error(`Cannot move booking from '${booking.status}' to '${status}'`);
  }

  booking.status = status;
  await booking.save();

  res.json(booking);
});

module.exports = {
  createBooking,
  getMyBookings,
  getProviderBookings,
  getBookingById,
  updateBookingStatus,
};
