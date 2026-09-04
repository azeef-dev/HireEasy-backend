const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // never returned by default on find queries
    },
    role: {
      type: String,
      enum: ['user', 'provider', 'admin', 'superadmin'],
      default: 'user',
    },
    phone: { type: String, trim: true },

    // ---- Provider-only fields ----
    serviceCategory: {
      type: String,
      trim: true,
      required: function () {
        return this.role === 'provider';
      },
    },
    experience: { type: Number, min: 0 }, // years
    price: { type: Number, min: 0 },
    location: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 500 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    // Providers must be verified by an Admin/Super Admin before
    // they show up in search and can receive bookings.
    isVerified: {
      type: Boolean,
      default: function () {
        return this.role !== 'provider';
      },
    },
    isActive: { type: Boolean, default: true },

    // ---- Password reset ----
    // Both hidden from normal queries; must be explicitly .select()'d.
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ serviceCategory: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);