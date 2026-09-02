const express = require('express');
const {
  getProvidersForReview,
  verifyProvider,
  getAllBookings,
  getAllUsers,
  createAdmin,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Every route below requires at least an Admin
router.use(protect, authorize('admin', 'superadmin'));

router.get('/providers', getProvidersForReview);
router.patch('/providers/:id/verify', verifyProvider);
router.get('/bookings', getAllBookings);
router.get('/users', getAllUsers);

// Super Admin only: create new Admin accounts
router.post('/create-admin', authorize('superadmin'), createAdmin);

module.exports = router;
