// Every valid booking status
const BOOKING_STATUSES = ['pending', 'accepted', 'rejected', 'in-progress', 'completed'];

// Single source of truth for the booking workflow's business rules:
// - a rejected booking can never move to in-progress (or anywhere else)
// - a completed booking can never be edited through the normal workflow
const ALLOWED_TRANSITIONS = {
  pending: ['accepted', 'rejected'],
  accepted: ['in-progress'],
  'in-progress': ['completed'],
  rejected: [],
  completed: [],
};

module.exports = { BOOKING_STATUSES, ALLOWED_TRANSITIONS };
