const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

// Verifies the JWT sent in the Authorization header and attaches
// the logged-in user to req.user for downstream handlers.
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, token invalid or expired');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    res.status(401);
    throw new Error('Not authorized, user not found or inactive');
  }

  req.user = user;
  next();
});

// Restricts a route to specific roles. Use after `protect`.
// e.g. router.get('/', protect, authorize('admin', 'superadmin'), handler)
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403);
    throw new Error(
      `Role '${req.user ? req.user.role : 'guest'}' is not allowed to access this resource`
    );
  }
  next();
};

module.exports = { protect, authorize };
