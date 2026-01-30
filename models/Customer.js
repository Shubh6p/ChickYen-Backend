const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
    },

    // extra details (after signup)
    name: String,
    phone: String,
    address: String,

    // Email verification fields
    emailOtp: String,
    otpExpires: Date,
    isEmailVerified: {
      type: Boolean,
      default: false
    },

    // Phone verification fields
    phoneOtp: String,
    phoneOtpExpires: Date,
    isPhoneVerified: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
