const express = require('express');
const { createReview, getProviderReviews } = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, reviewValidation } = require('../middleware/validators');

const router = express.Router();

router.post('/', protect, authorize('user'), reviewValidation, validate, createReview);
router.get('/provider/:providerId', getProviderReviews);

module.exports = router;
