const crypto = require('crypto');

// Produces IDs like: SK-M0X9F2A1-7B3C1E
// Timestamp part keeps them roughly sortable, random part keeps
// them unique even if two bookings are created in the same millisecond.
const generateBookingId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SK-${timestamp}-${random}`;
};

module.exports = generateBookingId;
