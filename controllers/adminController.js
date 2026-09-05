const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const { BOOKING_STATUSES } = require('../utils/constants');

// Dashboard

// @desc    Aggregate stats for the admin dashboard overview
// @route   GET /api/admin/stats
// @access  Private/Admin,SuperAdmin
const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalProviders,
    verifiedProviders,
    pendingProviders,
    inactiveProviders,
    totalAdmins,
    totalBookings,
    bookingStatusRaw,
    totalReviews,
    ratingAgg,
    recentBookings,
    recentPendingProviders,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'provider' }),
    User.countDocuments({ role: 'provider', isVerified: true }),
    User.countDocuments({ role: 'provider', isVerified: false }),
    User.countDocuments({ role: 'provider', isActive: false }),
    User.countDocuments({ role: 'admin' }),
    Booking.countDocuments({}),
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Review.countDocuments({}),
    Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
    Booking.find({})
      .populate('customer', 'name')
      .populate('provider', 'name')
      .sort({ createdAt: -1 })
      .limit(5),
    User.find({ role: 'provider', isVerified: false })
      .select('name serviceCategory location createdAt')
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  const bookingsByStatus = BOOKING_STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});
  bookingStatusRaw.forEach((row) => {
    bookingsByStatus[row._id] = row.count;
  });

  res.json({
    totalUsers,
    totalProviders,
    verifiedProviders,
    pendingProviders,
    inactiveProviders,
    totalAdmins: req.user.role === 'superadmin' ? totalAdmins : undefined,
    totalBookings,
    bookingsByStatus,
    totalReviews,
    averageRating: ratingAgg.length > 0 ? Math.round(ratingAgg[0].avg * 10) / 10 : 0,
    recentBookings,
    recentPendingProviders,
  });
});

// Providers

// @desc    List providers with filters (status, category, search, isActive)
// @route   GET /api/admin/providers?status=pending|verified|all&category=&search=&isActive=
// @access  Private/Admin,SuperAdmin
const getProviders = asyncHandler(async (req, res) => {
  const { status = 'all', category, search, isActive } = req.query;

  const filter = { role: 'provider' };

  if (status === 'pending') filter.isVerified = false;
  if (status === 'verified') filter.isVerified = true;

  if (category) filter.serviceCategory = new RegExp(`^${category}$`, 'i');

  if (isActive === 'true') filter.isActive = true;
  if (isActive === 'false') filter.isActive = false;

  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { location: new RegExp(search, 'i') },
      { serviceCategory: new RegExp(search, 'i') },
    ];
  }

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
    provider.isActive = true;
  }

  await provider.save();
  res.json(provider);
});

// @desc    Admin edits a provider's profile
// @route   PUT /api/admin/providers/:id
// @access  Private/Admin,SuperAdmin
const updateProvider = asyncHandler(async (req, res) => {
  const provider = await User.findOne({ _id: req.params.id, role: 'provider' });
  if (!provider) {
    res.status(404);
    throw new Error('Provider not found');
  }

  const editableFields = ['name', 'phone', 'serviceCategory', 'experience', 'price', 'location', 'bio'];
  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) provider[field] = req.body[field];
  });

  const updated = await provider.save();
  res.json(updated);
});

// @desc    Activate or deactivate a provider account
// @route   PATCH /api/admin/providers/:id/status   body: { isActive: true|false }
// @access  Private/Admin,SuperAdmin
const toggleProviderStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  const provider = await User.findOne({ _id: req.params.id, role: 'provider' });
  if (!provider) {
    res.status(404);
    throw new Error('Provider not found');
  }

  provider.isActive = isActive;
  await provider.save();
  res.json(provider);
});

// @desc    Permanently delete a provider account
// @route   DELETE /api/admin/providers/:id
// @access  Private/Admin,SuperAdmin
const deleteProvider = asyncHandler(async (req, res) => {
  const provider = await User.findOne({ _id: req.params.id, role: 'provider' });
  if (!provider) {
    res.status(404);
    throw new Error('Provider not found');
  }

  await provider.deleteOne();
  res.json({ message: 'Provider deleted', _id: req.params.id });
});

// Customers

// @desc    List customers with filters (search, isActive)
// @route   GET /api/admin/customers?search=&isActive=
// @access  Private/Admin,SuperAdmin
const getCustomers = asyncHandler(async (req, res) => {
  const { search, isActive } = req.query;

  const filter = { role: 'user' };
  if (isActive === 'true') filter.isActive = true;
  if (isActive === 'false') filter.isActive = false;

  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
    ];
  }

  const customers = await User.find(filter).select('-password').sort({ createdAt: -1 });
  res.json(customers);
});

// @desc    Admin edits a customer's profile
// @route   PUT /api/admin/customers/:id
// @access  Private/Admin,SuperAdmin
const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await User.findOne({ _id: req.params.id, role: 'user' });
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }

  const editableFields = ['name', 'phone'];
  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) customer[field] = req.body[field];
  });

  const updated = await customer.save();
  res.json(updated);
});

// @desc    Activate or deactivate a customer account
// @route   PATCH /api/admin/customers/:id/status   body: { isActive: true|false }
// @access  Private/Admin,SuperAdmin
const toggleCustomerStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  const customer = await User.findOne({ _id: req.params.id, role: 'user' });
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }

  customer.isActive = isActive;
  await customer.save();
  res.json(customer);
});

// @desc    Permanently delete a customer account
// @route   DELETE /api/admin/customers/:id
// @access  Private/Admin,SuperAdmin
const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await User.findOne({ _id: req.params.id, role: 'user' });
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }

  await customer.deleteOne();
  res.json({ message: 'Customer deleted', _id: req.params.id });
});

// Bookings

// @desc    Overview of all bookings, optionally filtered by status/search
// @route   GET /api/admin/bookings?status=&search=
// @access  Private/Admin,SuperAdmin
const getAllBookings = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = status ? { status } : {};

  let bookings = await Booking.find(filter)
    .populate('customer', 'name email')
    .populate('provider', 'name serviceCategory')
    .sort({ createdAt: -1 });

  if (search) {
    const term = search.toLowerCase();
    bookings = bookings.filter(
      (b) =>
        b.bookingId.toLowerCase().includes(term) ||
        b.service.toLowerCase().includes(term) ||
        b.customer?.name?.toLowerCase().includes(term) ||
        b.provider?.name?.toLowerCase().includes(term)
    );
  }

  res.json(bookings);
});

// @desc    Admin force-updates a booking's status (bypasses the normal
//          provider-only workflow lock; a completed booking stays locked)
// @route   PATCH /api/admin/bookings/:id/status   body: { status }
// @access  Private/Admin,SuperAdmin
const adminUpdateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  if (booking.status === 'completed') {
    res.status(400);
    throw new Error('A completed booking cannot be changed');
  }

  booking.status = status;
  await booking.save();
  res.json(booking);
});

// @desc    Admin deletes a booking record
// @route   DELETE /api/admin/bookings/:id
// @access  Private/Admin,SuperAdmin
const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  await booking.deleteOne();
  res.json({ message: 'Booking deleted', _id: req.params.id });
});

// Reviews

// @desc    List all reviews, optionally filtered by rating/search
// @route   GET /api/admin/reviews?rating=&search=
// @access  Private/Admin,SuperAdmin
const getAllReviews = asyncHandler(async (req, res) => {
  const { rating, search } = req.query;
  const filter = {};
  if (rating) filter.rating = Number(rating);

  let reviews = await Review.find(filter)
    .populate('customer', 'name')
    .populate('provider', 'name serviceCategory')
    .sort({ createdAt: -1 });

  if (search) {
    const term = search.toLowerCase();
    reviews = reviews.filter(
      (r) =>
        r.customer?.name?.toLowerCase().includes(term) ||
        r.provider?.name?.toLowerCase().includes(term) ||
        r.comment?.toLowerCase().includes(term)
    );
  }

  res.json(reviews);
});

// @desc    Admin deletes a review (moderation) and recalculates the provider's rating
// @route   DELETE /api/admin/reviews/:id
// @access  Private/Admin,SuperAdmin
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  const providerId = review.provider;
  await review.deleteOne();

  const stats = await Review.aggregate([
    { $match: { provider: providerId } },
    { $group: { _id: '$provider', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  await User.findByIdAndUpdate(providerId, {
    rating: stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0,
    reviewCount: stats.length > 0 ? stats[0].count : 0,
  });

  res.json({ message: 'Review deleted', _id: req.params.id });
});

// Admins (Super Admin only)

// @desc    List all admin accounts
// @route   GET /api/admin/admins
// @access  Private/SuperAdmin
const getAdmins = asyncHandler(async (req, res) => {
  const admins = await User.find({ role: 'admin' }).select('-password').sort({ createdAt: -1 });
  res.json(admins);
});

// @desc    Super Admin creates a new Admin account
// @route   POST /api/admin/admins
// @access  Private/SuperAdmin
const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(400);
    throw new Error('Email is already registered');
  }

  const admin = await User.create({ name, email, password, phone, role: 'admin' });
  res.status(201).json({
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    role: admin.role,
    isActive: admin.isActive,
    createdAt: admin.createdAt,
  });
});

// @desc    Super Admin edits an admin's name/email/phone
// @route   PUT /api/admin/admins/:id
// @access  Private/SuperAdmin
const updateAdmin = asyncHandler(async (req, res) => {
  const admin = await User.findOne({ _id: req.params.id, role: 'admin' });
  if (!admin) {
    res.status(404);
    throw new Error('Admin not found');
  }

  if (req.body.email && req.body.email !== admin.email) {
    const exists = await User.findOne({ email: req.body.email });
    if (exists) {
      res.status(400);
      throw new Error('Email is already registered');
    }
    admin.email = req.body.email;
  }

  if (req.body.name !== undefined) admin.name = req.body.name;
  if (req.body.phone !== undefined) admin.phone = req.body.phone;

  const updated = await admin.save();
  res.json({
    _id: updated._id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    role: updated.role,
    isActive: updated.isActive,
  });
});

// @desc    Super Admin activates/deactivates an admin account
// @route   PATCH /api/admin/admins/:id/status   body: { isActive: true|false }
// @access  Private/SuperAdmin
const toggleAdminStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  if (req.user._id.equals(req.params.id)) {
    res.status(400);
    throw new Error('You cannot deactivate your own account');
  }

  const admin = await User.findOne({ _id: req.params.id, role: 'admin' });
  if (!admin) {
    res.status(404);
    throw new Error('Admin not found');
  }

  admin.isActive = isActive;
  await admin.save();
  res.json(admin);
});

// @desc    Super Admin resets an admin's password
// @route   PATCH /api/admin/admins/:id/password   body: { password }
// @access  Private/SuperAdmin
const resetAdminPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  const admin = await User.findOne({ _id: req.params.id, role: 'admin' }).select('+password');
  if (!admin) {
    res.status(404);
    throw new Error('Admin not found');
  }

  admin.password = password; // pre-save hook hashes it
  await admin.save();
  res.json({ message: 'Password updated successfully' });
});

// @desc    Super Admin deletes an admin account
// @route   DELETE /api/admin/admins/:id
// @access  Private/SuperAdmin
const deleteAdmin = asyncHandler(async (req, res) => {
  if (req.user._id.equals(req.params.id)) {
    res.status(400);
    throw new Error('You cannot delete your own account');
  }

  const admin = await User.findOne({ _id: req.params.id, role: 'admin' });
  if (!admin) {
    res.status(404);
    throw new Error('Admin not found');
  }

  await admin.deleteOne();
  res.json({ message: 'Admin deleted', _id: req.params.id });
});

module.exports = {
  getDashboardStats,
  getProviders,
  verifyProvider,
  updateProvider,
  toggleProviderStatus,
  deleteProvider,
  getCustomers,
  updateCustomer,
  toggleCustomerStatus,
  deleteCustomer,
  getAllBookings,
  adminUpdateBookingStatus,
  deleteBooking,
  getAllReviews,
  deleteReview,
  getAdmins,
  createAdmin,
  updateAdmin,
  toggleAdminStatus,
  resetAdminPassword,
  deleteAdmin,
};