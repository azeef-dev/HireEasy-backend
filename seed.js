require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');

const seedSuperAdmin = async () => {
  await connectDB();

  const email = process.env.SUPERADMIN_EMAIL || 'superadmin@servekaro.com';
  const password = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@123';

  const exists = await User.findOne({ email });
  if (exists) {
    console.log('Super admin already exists:', email);
    await mongoose.disconnect();
    process.exit(0);
  }

  await User.create({
    name: 'Super Admin',
    email,
    password,
    role: 'superadmin',
  });

  console.log('Super admin created - demo credentials:');
  console.log('  Email:   ', email);
  console.log('  Password:', password);

  await mongoose.disconnect();
  process.exit(0);
};

seedSuperAdmin().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
