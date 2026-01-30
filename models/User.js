const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    // Password removed for OTP-only auth
    // password: { type: String, required: true }, 

    otp: { type: String },
    otpExpires: { type: Date },

    role: {
      type: String,
      enum: ["admin", "owner"],
      default: "admin"
    },

    phone: { type: String },
    address: { type: String },

    profileCompleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
