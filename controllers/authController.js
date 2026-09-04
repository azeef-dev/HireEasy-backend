const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');

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

// @desc    Request a password reset link via email
// @route   POST /api/auth/forgot-password   body: { email }
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Same response whether or not the email exists, so this endpoint
  // can't be used to check which emails are registered.
  const genericMessage = 'If an account exists for this email, a reset link has been sent';

  if (!user) {
    return res.json({ message: genericMessage });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Reset your HireEasy password',
      html: `
        <p>Hi ${user.name},</p>
        <p>You requested a password reset for your HireEasy account. Click the link below to set a new password. This link expires in 30 minutes.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  } catch (error) {
    // Don't leave a dangling, unusable token if the email failed to send
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(500);
    throw new Error('Could not send reset email, please try again later');
  }

  res.json({ message: genericMessage });
});

// @desc    Set a new password using the token from the reset email
// @route   POST /api/auth/reset-password/:token   body: { password }
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpire');

  if (!user) {
    res.status(400);
    throw new Error('This reset link is invalid or has expired');
  }

  user.password = password; // pre-save hook hashes it
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.json({ message: 'Password has been reset successfully' });
});

module.exports = { register, login, getMe, forgotPassword, resetPassword };