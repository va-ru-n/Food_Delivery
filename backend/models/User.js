const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      default: undefined,
      set: (value) => {
        const normalized = String(value || '').trim();
        return normalized || undefined;
      },
      trim: true
    },
    email: {
      type: String,
      default: undefined,
      set: (value) => {
        const normalized = String(value || '').trim().toLowerCase();
        return normalized || undefined;
      },
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    role: {
      type: String,
      enum: ['customer', 'admin', 'restaurant', 'delivery'],
      default: 'customer'
    },
    resetPasswordCode: {
      type: String
    },
    resetPasswordExpires: {
      type: Date
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

userSchema.index(
  { phoneNumber: 1 },
  {
    unique: true,
    sparse: true
  }
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    sparse: true
  }
);

module.exports = mongoose.model('User', userSchema);
