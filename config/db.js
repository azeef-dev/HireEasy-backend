const mongoose = require('mongoose');

// Reuse the connection across warm serverless invocations instead of
// opening a fresh one every time.
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 8000,
  });
  isConnected = true;
  console.log('MongoDB connected!');
};

module.exports = connectDB;