const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

// @desc    List verified providers, optionally filtered by category/search
// @route   GET /api/providers?category=Plumbing&search=karachi
// @access  Public
const getProviders = asyncHandler(async (req, res) => {
  const { category, search } = req.query;

  const filter = { role: 'provider', isVerified: true, isActive: true };

  if (category) {
    filter.serviceCategory = new RegExp(`^${category}$`, 'i');
  }

  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { serviceCategory: new RegExp(search, 'i') },
      { location: new RegExp(search, 'i') },
    ];
  }

  const providers = await User.find(filter).select('-password').sort({ rating: -1 });
  res.json(providers);
});

// @desc    Get a single provider's public profile
// @route   GET /api/providers/:id
// @access  Public
const getProviderById = asyncHandler(async (req, res) => {
  const provider = await User.findOne({ _id: req.params.id, role: 'provider' }).select('-password');

  if (!provider) {
    res.status(404);
    throw new Error('Provider not found');
  }

  res.json(provider);
});

// @desc    Provider updates their own profile
// @route   PUT /api/providers/profile
// @access  Private/Provider
const updateProviderProfile = asyncHandler(async (req, res) => {
  const provider = await User.findById(req.user._id);

  if (!provider || provider.role !== 'provider') {
    res.status(403);
    throw new Error('Only providers can update a provider profile');
  }

  const editableFields = ['name', 'phone', 'serviceCategory', 'experience', 'price', 'location', 'bio'];
  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) provider[field] = req.body[field];
  });

  const updated = await provider.save();
  res.json(updated);
});

// @desc    Distinct service categories, for a search/filter dropdown
// @route   GET /api/providers/meta/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const categories = await User.distinct('serviceCategory', { role: 'provider', isVerified: true });
  res.json(categories.filter(Boolean));
});

module.exports = { getProviders, getProviderById, updateProviderProfile, getCategories };
