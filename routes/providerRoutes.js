const express = require('express');
const {
  getProviders,
  getProviderById,
  updateProviderProfile,
  getCategories,
} = require('../controllers/providerController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// NOTE: /meta/categories and /profile must come before /:id
// so Express doesn't treat "meta" or "profile" as an :id value.
router.get('/', getProviders);
router.get('/meta/categories', getCategories);
router.put('/profile', protect, authorize('provider'), updateProviderProfile);
router.get('/:id', getProviderById);

module.exports = router;
