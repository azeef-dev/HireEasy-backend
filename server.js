require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const providerRoutes = require('./routes/providerRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Pure liveness check — doesn't touch the database, so this tells us
// instantly whether Express itself is up even if MongoDB isn't.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'HireEasy API is running' });
});

// Every route below this needs a live DB connection. Checking here
// (instead of relying on Mongoose's own buffering) means a bad
// connection fails fast with a clear message, instead of hanging for
// 10s and crashing the whole function the way process.exit() used to.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    res.status(503).json({ message: 'Database is unavailable right now, please try again shortly' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);

// Unknown route
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
});

// Must be registered last
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`HireEasy API running on port ${PORT}`));