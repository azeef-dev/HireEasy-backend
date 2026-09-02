const express = require('express');
const {
  createBooking,
  getMyBookings,
  getProviderBookings,
  getBookingById,
  updateBookingStatus,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, bookingValidation } = require('../middleware/validators');

const router = express.Router();

router.post('/', protect, authorize('user'), bookingValidation, validate, createBooking);
router.get('/my', protect, authorize('user'), getMyBookings);
router.get('/provider', protect, authorize('provider'), getProviderBookings);
router.patch('/:id/status', protect, authorize('provider'), updateBookingStatus);
router.get('/:id', protect, getBookingById);

module.exports = router;
