const express = require('express');
const {
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
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  validate,
  adminCreateValidation,
  adminUpdateValidation,
  adminPasswordValidation,
  statusToggleValidation,
  adminProviderUpdateValidation,
  adminCustomerUpdateValidation,
  adminBookingStatusValidation,
} = require('../middleware/validators');

const router = express.Router();

// Every route below requires at least an Admin
router.use(protect, authorize('admin', 'superadmin'));

router.get('/stats', getDashboardStats);

//  Providers 
router.get('/providers', getProviders);
router.patch('/providers/:id/verify', verifyProvider);
router.put('/providers/:id', adminProviderUpdateValidation, validate, updateProvider);
router.patch('/providers/:id/status', statusToggleValidation, validate, toggleProviderStatus);
router.delete('/providers/:id', deleteProvider);

//  Customers 
router.get('/customers', getCustomers);
router.put('/customers/:id', adminCustomerUpdateValidation, validate, updateCustomer);
router.patch('/customers/:id/status', statusToggleValidation, validate, toggleCustomerStatus);
router.delete('/customers/:id', deleteCustomer);

//  Bookings 
router.get('/bookings', getAllBookings);
router.patch('/bookings/:id/status', adminBookingStatusValidation, validate, adminUpdateBookingStatus);
router.delete('/bookings/:id', deleteBooking);

//  Reviews 
router.get('/reviews', getAllReviews);
router.delete('/reviews/:id', deleteReview);

//  Admins (Super Admin only) 
router.get('/admins', authorize('superadmin'), getAdmins);
router.post('/admins', authorize('superadmin'), adminCreateValidation, validate, createAdmin);
router.put('/admins/:id', authorize('superadmin'), adminUpdateValidation, validate, updateAdmin);
router.patch('/admins/:id/status', authorize('superadmin'), statusToggleValidation, validate, toggleAdminStatus);
router.patch('/admins/:id/password', authorize('superadmin'), adminPasswordValidation, validate, resetAdminPassword);
router.delete('/admins/:id', authorize('superadmin'), deleteAdmin);

module.exports = router;