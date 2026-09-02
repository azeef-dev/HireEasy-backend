const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register a new customer or provider (public signup only allows these two roles)
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, serviceCategory, experience, price, location, bio } =
    req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('Email is already registered');
  }

  // Admin / Super Admin accounts are never created through public
  // registration - only via the seed script or the super-admin API.
  const allowedRole = role === 'provider' ? 'provider' : 'user';

  const user = await User.create({
    name,
    email,
    password,
    role: allowedRole,
    phone,
    ...(allowedRole === 'provider' && { serviceCategory, experience, price, location, bio }),
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    token: generateToken(user._id, user.role),
  });
});

// @desc    Login for any role
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been deactivated');
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    token: generateToken(user._id, user.role),
  });
});

// @desc    Get the logged-in user's own profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

module.exports = { register, login, getMe };
