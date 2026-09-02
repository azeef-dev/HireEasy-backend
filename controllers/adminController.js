const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Booking = require('../models/Booking');

// @desc    List providers for moderation (defaults to pending verification)
// @route   GET /api/admin/providers?status=pending|verified
// @access  Private/Admin,SuperAdmin
const getProvidersForReview = asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;

  const filter = { role: 'provider' };
  if (status === 'pending') filter.isVerified = false;
  if (status === 'verified') filter.isVerified = true;

  const providers = await User.find(filter).select('-password').sort({ createdAt: -1 });
  res.json(providers);
});

// @desc    Approve or reject a pending provider
// @route   PATCH /api/admin/providers/:id/verify   body: { approve: true|false }
// @access  Private/Admin,SuperAdmin
const verifyProvider = asyncHandler(async (req, res) => {
  const { approve } = req.body;

  const provider = await User.findOne({ _id: req.params.id, role: 'provider' });
  if (!provider) {
    res.status(404);
    throw new Error('Provider not found');
  }

  if (approve === false) {
    provider.isActive = false; // rejected providers are deactivated, not deleted
  } else {
    provider.isVerified = true;
  }

  await provider.save();
  res.json(provider);
});

// @desc    Overview of all bookings, optionally filtered by status
// @route   GET /api/admin/bookings?status=pending
// @access  Private/Admin,SuperAdmin
const getAllBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};

  const bookings = await Booking.find(filter)
    .populate('customer', 'name email')
    .populate('provider', 'name serviceCategory')
    .sort({ createdAt: -1 });

  res.json(bookings);
});

// @desc    List all customers and providers (oversight)
// @route   GET /api/admin/users
// @access  Private/Admin,SuperAdmin
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ role: { $ne: 'superadmin' } })
    .select('-password')
    .sort({ createdAt: -1 });
  res.json(users);
});

// @desc    Super Admin creates a new Admin account
// @route   POST /api/admin/create-admin
// @access  Private/SuperAdmin
const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(400);
    throw new Error('Email is already registered');
  }

  const admin = await User.create({ name, email, password, role: 'admin' });
  res.status(201).json({ _id: admin._id, name: admin.name, email: admin.email, role: admin.role });
});

module.exports = { getProvidersForReview, verifyProvider, getAllBookings, getAllUsers, createAdmin };
