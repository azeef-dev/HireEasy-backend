const { body, validationResult } = require('express-validator');

// Runs after any validation chain below; short-circuits with a 400
// and a field-by-field error list if anything failed.
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['user', 'provider']).withMessage('Invalid role'),
  body('serviceCategory')
    .if(body('role').equals('provider'))
    .trim()
    .notEmpty()
    .withMessage('Service category is required for providers'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const bookingValidation = [
  body('provider').notEmpty().withMessage('Provider is required'),
  body('service').trim().notEmpty().withMessage('Service is required'),
  body('date').notEmpty().withMessage('Date is required').isISO8601().withMessage('Date must be a valid date'),
  body('time').trim().notEmpty().withMessage('Time is required'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('description').optional().trim().isLength({ max: 1000 }),
];

const reviewValidation = [
  body('booking').notEmpty().withMessage('Booking is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 500 }),
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  bookingValidation,
  reviewValidation,
};
