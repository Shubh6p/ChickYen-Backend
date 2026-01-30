const mongoose = require("mongoose");

const tempVerifySchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true },
        otp: { type: String, required: true },
        expiresAt: { type: Date, required: true, expires: 300 } // Auto-delete after 5 mins (300s)
    },
    { timestamps: true }
);

module.exports = mongoose.model("TempVerify", tempVerifySchema);
